import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, thumbnail } from '../api.js';
import { useQueue } from '../queue.jsx';
import YouTubePlayer from '../components/YouTubePlayer.jsx';
import BubbleLayer from '../components/BubbleLayer.jsx';
import VideoCard from '../components/VideoCard.jsx';

const AUTOPLAY_NEXT_SECONDS = 8;

export default function Watch() {
  const { id } = useParams();
  return <WatchInner key={id} id={id} />;
}

function WatchInner({ id }) {
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState([]);
  const [poppedFacts, setPoppedFacts] = useState([]);
  const [missed, setMissed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [upNext, setUpNext] = useState([]);
  const [countdown, setCountdown] = useState(null);

  const playerRef = useRef(null);
  const shellRef = useRef(null);
  const [expandMode, setExpandMode] = useState('normal'); // 'normal' | 'theater' | 'full'
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const shownRef = useRef(new Set());
  const lastTimeRef = useRef(0);
  const advanceTimer = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { queue, dequeue } = useQueue();
  const shuffleMode = !!(location.state && location.state.shuffle);

  // Load video + up-next suggestions.
  useEffect(() => {
    let cancelled = false;
    setVideo(null);
    setError('');
    setEmbedBlocked(false);
    api
      .video(id)
      .then((v) => {
        if (cancelled) return;
        setVideo(v);
        api.videos().then((all) => {
          if (cancelled) return;
          const others = all.filter((x) => x.id !== v.id);
          const sameCat = others.filter((x) => x.category && x.category === v.category);
          const rest = others.filter((x) => !x.category || x.category !== v.category);
          setUpNext([...sameCat, ...rest].slice(0, 6));
        }).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setError('Could not load that video.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pops = useMemo(() => {
    if (!video || !duration) return [];
    return (video.pops || []).map((p, i) => ({
      key: `${video.id}-${i}`,
      text: p.text,
      timeSec: p.at * duration,
    }));
  }, [video, duration]);

  // Expand control: normal -> theater (big CSS view) -> true fullscreen
  // (whole player shell, bubbles and counters included) -> back.
  const cycleExpand = useCallback(() => {
    if (expandMode === 'normal') {
      setExpandMode('theater');
    } else if (expandMode === 'theater') {
      if (canFullscreen && shellRef.current && shellRef.current.requestFullscreen) {
        const p = shellRef.current.requestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => setExpandMode('theater'));
      } else {
        setExpandMode('normal');
      }
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      setExpandMode('theater');
    }
  }, [expandMode, canFullscreen]);

  // Keep state in sync when the user exits fullscreen with Esc.
  useEffect(() => {
    const onFsChange = () => {
      setExpandMode(document.fullscreenElement ? 'full' : 'theater');
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Esc exits theater mode.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setExpandMode('normal');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const expandLabel =
    expandMode === 'full' ? '⛶ Exit' : expandMode === 'theater' ? (canFullscreen ? '⛶ Full screen' : '⛶ Smaller') : '⛶ Expand';

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setCountdown(null);
  }, []);

  useEffect(() => clearAdvance, [clearAdvance]);

  const goNext = useCallback(() => {
    clearAdvance();
    if (queue.length > 0) {
      const next = queue[0];
      dequeue(next.id);
      navigate(`/watch/${next.id}`);
    } else if (shuffleMode) {
      api.videos().then((all) => {
        const pool = all.filter((x) => x.id !== id);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) navigate(`/watch/${pick.id}`, { state: { shuffle: true } });
      }).catch(() => {});
    } else if (upNext.length > 0) {
      navigate(`/watch/${upNext[0].id}`);
    }
  }, [queue, dequeue, navigate, shuffleMode, upNext, id, clearAdvance]);

  // End-of-video: show the scorecard, then auto-advance.
  function handleEnded() {
    setEnded(true);
    setVisible([]);
    if (queue.length > 0 || shuffleMode || upNext.length > 0) {
      setCountdown(AUTOPLAY_NEXT_SECONDS);
      advanceTimer.current = setTimeout(goNext, AUTOPLAY_NEXT_SECONDS * 1000);
    }
  }

  // The timing engine: poll the player and surface due bubbles.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const player = playerRef.current;
      try {
        if (player && player.getCurrentTime && pops.length) {
          const t = player.getCurrentTime();
          if (t < lastTimeRef.current - 2) {
            // Seeked backward: let bubbles after the new position fire again.
            const reset = new Set();
            pops.forEach((p) => {
              if (p.timeSec > t) reset.add(p.key);
            });
            reset.forEach((k) => shownRef.current.delete(k));
            setVisible((prev) => prev.filter((b) => !reset.has(b.key)));
            setPoppedFacts((prev) => prev.filter((f) => !reset.has(f.key)));
          } else {
            const due = [];
            pops.forEach((p) => {
              if (p.timeSec <= t && !shownRef.current.has(p.key)) {
                shownRef.current.add(p.key);
                due.push({ key: p.key, text: p.text });
              }
            });
            if (due.length) setVisible((prev) => [...prev, ...due].slice(-3));
          }
          lastTimeRef.current = t;
        }
      } catch {
        /* player not ready */
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pops]);

  // Countdown display ticker.
  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c == null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handlePop(key) {
    const bubble = visible.find((b) => b.key === key);
    if (!bubble || bubble.popping) return;
    setVisible((prev) => prev.map((b) => (b.key === key ? { ...b, popping: true } : b)));
    setPoppedFacts((prev) => [...prev, { key, text: bubble.text }]);
    setTimeout(() => {
      setVisible((prev) => prev.filter((b) => b.key !== key));
    }, 280);
  }

  function handleExpire(key) {
    setVisible((prev) => prev.filter((b) => b.key !== key));
    setMissed((m) => m + 1);
  }

  function handlePlayerError(e) {
    // 101 / 150 = embedding disabled by the owner.
    if (e && (e.data === 101 || e.data === 150)) setEmbedBlocked(true);
  }

  const total = pops.length;
  const poppedCount = poppedFacts.length;

  return (
    <div className="narrow page">
      <Link to="/" className="back-link">← All videos</Link>
      {error && <p className="alert alert-error">{error}</p>}
      {!video && !error && <p className="muted">Loading…</p>}

      {video && (
        <>
          <h1 className="watch-title">{video.title}</h1>
          <p className="muted watch-sub">
            {video.artist}
            {video.year ? ` · ${video.year}` : ''}
            {video.category ? ` · ${video.category}` : ''}
          </p>

          {expandMode === 'theater' && (
            <div className="theater-backdrop" onClick={() => setExpandMode('normal')} aria-hidden="true" />
          )}
          <div ref={shellRef} className={`player-shell${expandMode === 'theater' ? ' theater' : ''}`}>
            {embedBlocked ? (
              <div className="embed-blocked">
                <img src={thumbnail(video.youtubeId)} alt="" />
                <p>This video's owner disabled embedding.</p>
                <a
                  className="btn btn-primary"
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Watch on YouTube
                </a>
              </div>
            ) : (
              <>
                <YouTubePlayer
                  videoId={video.youtubeId}
                  playerRef={playerRef}
                  onReady={(e) => {
                    try {
                      setDuration(e.target.getDuration() || 0);
                    } catch {
                      /* ignore */
                    }
                  }}
                  onStateChange={(e) => {
                    if (window.YT && e.data === window.YT.PlayerState.ENDED) handleEnded();
                  }}
                  onError={handlePlayerError}
                />
                <BubbleLayer bubbles={visible} onPop={handlePop} onExpire={handleExpire} />
                {!ended && (
                  <div className="watch-stats">
                    <span className="score-pill">🫧 {poppedCount} popped</span>
                    {total > 0 && <span className="muted small">{total - poppedCount - missed} still to come…</span>}
                    <button type="button" className="expand-btn" onClick={cycleExpand} title={expandLabel}>
                      {expandLabel}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {ended && (
            <section className="panel scorecard" onClick={clearAdvance}>
              <h2>🫧 That's a wrap!</h2>
              <p className="score-line">
                You popped <strong>{poppedCount}</strong> of <strong>{total}</strong> bubbles.
              </p>
              {poppedFacts.length > 0 && (
                <ul className="fact-list">
                  {poppedFacts.map((f) => (
                    <li key={f.key}>💡 {f.text}</li>
                  ))}
                </ul>
              )}
              <div className="score-actions">
                <button type="button" className="btn btn-primary" onClick={goNext}>
                  Next video →
                </button>
                {countdown != null && (
                  <span className="muted small">Auto-playing next in {countdown}s (tap anywhere to stay)</span>
                )}
              </div>
            </section>
          )}

          {video.description && <p className="muted">{video.description}</p>}

          {upNext.length > 0 && (
            <section className="up-next">
              <h2>Up next</h2>
              <div className="video-grid">
                {upNext.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
