import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tvApi } from '../api.js';
import YouTubePlayer from './YouTubePlayer.jsx';
import BubbleLayer from './BubbleLayer.jsx';

// The big-screen view: the TV's browser opens ?tv=CODE and this component
// replaces the whole app shell. It polls the public room endpoint, plays
// whatever the host phone plays, and renders the trivia bubbles off its
// OWN player clock (same fraction timing as the phone).
//
// Autoplay honesty: browsers won't play sound without a gesture, so the
// TV shows a one-time "▶ Start" overlay. Before it's pressed we attempt
// muted autoplay; pressing it unmutes and plays for real.
const POLL_MS = 2000;
const DRIFT_SECONDS = 3;

export default function TvScreen({ code }) {
  const [room, setRoom] = useState(null);
  const [gone, setGone] = useState(false);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState([]);
  const [poppedCount, setPoppedCount] = useState(0);

  const playerRef = useRef(null);
  const roomRef = useRef(null);
  const startedRef = useRef(false);
  const shownRef = useRef(new Set());
  const lastTimeRef = useRef(0);
  roomRef.current = room;
  startedRef.current = started;

  const video = room && room.video && typeof room.video === 'object' ? room.video : null;
  const videoKey = video ? video.id : null;

  // Poll the room.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await tvApi.room(code);
        if (alive) setRoom(data);
      } catch (err) {
        // 404 = the host ended the share (or the room expired).
        if (alive && /404/.test(err.message || '')) setGone(true);
        // Anything else: keep the last good state on screen.
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [code]);

  // New video from the host: reset the bubble run.
  useEffect(() => {
    shownRef.current = new Set();
    lastTimeRef.current = 0;
    setVisible([]);
    setPoppedCount(0);
    setDuration(0);
  }, [videoKey]);

  const pops = useMemo(() => {
    if (!video || !duration) return [];
    return (video.pops || []).map((p, i) => ({
      key: `${video.id}-${i}`,
      text: p.text,
      timeSec: p.at * duration,
    }));
  }, [video, duration]);

  // Bubble timing engine — same fraction timing as the Watch page.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const player = playerRef.current;
      try {
        if (player && player.getCurrentTime && pops.length) {
          const t = player.getCurrentTime();
          if (t < lastTimeRef.current - 2) {
            const reset = new Set();
            pops.forEach((p) => {
              if (p.timeSec > t) reset.add(p.key);
            });
            reset.forEach((k) => shownRef.current.delete(k));
            setVisible((prev) => prev.filter((b) => !reset.has(b.key)));
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

  // Follow the host: play/pause from the room, and re-sync if we drift.
  useEffect(() => {
    const timer = setInterval(() => {
      const player = playerRef.current;
      const r = roomRef.current;
      if (!player || !r) return;
      try {
        if (r.status === 'paused') {
          if (player.getPlayerState && player.getPlayerState() === 1) player.pauseVideo();
        } else if (r.status === 'playing') {
          if (startedRef.current && player.getPlayerState && player.getPlayerState() !== 1) {
            player.playVideo();
          }
          if (player.getCurrentTime) {
            const t = player.getCurrentTime();
            if (Math.abs(t - (r.currentTime || 0)) > DRIFT_SECONDS) {
              player.seekTo(Math.max(0, r.currentTime || 0), true);
            }
          }
        }
      } catch {
        /* player not ready */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  function handlePop(key) {
    const bubble = visible.find((b) => b.key === key);
    if (!bubble || bubble.popping) return;
    setVisible((prev) => prev.map((b) => (b.key === key ? { ...b, popping: true } : b)));
    setPoppedCount((c) => c + 1);
    setTimeout(() => {
      setVisible((prev) => prev.filter((b) => b.key !== key));
    }, 280);
  }

  function handleExpire(key) {
    setVisible((prev) => prev.filter((b) => b.key !== key));
  }

  function pressStart() {
    setStarted(true);
    try {
      const player = playerRef.current;
      if (player) {
        if (player.unMute) player.unMute();
        if (player.playVideo) player.playVideo();
      }
    } catch {
      /* ignore */
    }
  }

  if (gone || (room && room.status === 'ended')) {
    return (
      <div className="tv-screen">
        <div className="tv-kicker">🫧 Bubble Tracks TV</div>
        <h1 className="tv-hero">This TV session has ended</h1>
        <p className="tv-sub">Thanks for watching! The host can start a new one from their phone anytime.</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="tv-screen">
        <div className="tv-kicker">🫧 Bubble Tracks TV</div>
        <h1 className="tv-hero">Tuning the big screen…</h1>
        <p className="tv-sub">Room {code}</p>
      </div>
    );
  }

  if (!video || room.status === 'waiting') {
    return (
      <div className="tv-screen">
        <div className="tv-kicker">🫧 Bubble Tracks TV</div>
        <h1 className="tv-hero">You're on the big screen!</h1>
        <p className="tv-sub">Waiting for the host… pick a video on the phone and it'll play here.</p>
        <p className="tv-room-code">Room {code}</p>
      </div>
    );
  }

  return (
    <div className="tv-screen tv-playing">
      <div className="tv-now">
        <div className="tv-kicker">🫧 Bubble Tracks TV · Room {code}</div>
        <h1 className="tv-title">{video.title}</h1>
        <p className="tv-artist">
          {video.artist}
          {video.year ? ` · ${video.year}` : ''}
          {poppedCount > 0 ? ` · 🫧 ${poppedCount} popped` : ''}
        </p>
      </div>

      <div className="tv-player-shell">
        <YouTubePlayer
          videoId={video.youtubeId}
          playerRef={playerRef}
          onReady={(e) => {
            try {
              setDuration(e.target.getDuration() || 0);
              // Best-effort muted autoplay until someone presses Start.
              if (!startedRef.current) {
                e.target.mute();
                e.target.playVideo();
              }
            } catch {
              /* ignore */
            }
          }}
          onStateChange={() => {}}
          onError={() => {}}
        />
        <BubbleLayer bubbles={visible} onPop={handlePop} onExpire={handleExpire} />
        {!started && (
          <button type="button" className="tv-start" onClick={pressStart}>
            ▶ Start
            <span className="tv-start-sub">Tap once — the TV needs a first tap before it can play sound.</span>
          </button>
        )}
      </div>

      <p className="tv-foot">The phone is in charge — play, pause and pick the next video there.</p>
    </div>
  );
}
