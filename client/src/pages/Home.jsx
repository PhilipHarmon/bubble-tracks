import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, thumbnail } from '../api.js';
import VideoCard from '../components/VideoCard.jsx';

export default function Home() {
  const [videos, setVideos] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('');
  const [query, setQuery] = useState('');
  const [popOfDay, setPopOfDay] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.videos(), api.categories(), api.popOfDay().catch(() => null)])
      .then(([list, cats, pod]) => {
        if (cancelled) return;
        setVideos(list);
        setCategories(cats);
        setPopOfDay(pod);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the video library. Try again in a bit.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!videos) return [];
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (activeCat && v.category !== activeCat) return false;
      if (q && !`${v.title} ${v.artist}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, activeCat, query]);

  function shuffle() {
    if (!videos || !videos.length) return;
    const pick = videos[Math.floor(Math.random() * videos.length)];
    navigate(`/watch/${pick.id}`, { state: { shuffle: true } });
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">Music videos, annotated</p>
          <h1>Pop the bubbles. Learn the stories.</h1>
          <p className="hero-sub">
            Classic music videos with pop-up trivia bubbles timed to the music — recording
            stories, chart facts, and the culture of the moment. Tap a bubble to pop it.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={shuffle}>
              🔀 Shuffle play
            </button>
            {popOfDay && (
              <Link to={`/watch/${popOfDay.id}`} className="btn btn-ghost btn-lg">
                🫧 Today's pick: {popOfDay.title}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="narrow page">
        {popOfDay && (
          <section className="pop-of-day">
            <div className="pod-label">🫧 Pop of the day</div>
            <Link to={`/watch/${popOfDay.id}`} className="pod-card">
              <img src={thumbnail(popOfDay.youtubeId)} alt="" loading="lazy" />
              <div>
                <strong>{popOfDay.title}</strong>
                <div className="muted">
                  {popOfDay.artist}
                  {popOfDay.year ? ` · ${popOfDay.year}` : ''}
                </div>
                {popOfDay.description && <p className="muted small">{popOfDay.description}</p>}
              </div>
            </Link>
          </section>
        )}

        <div className="library-controls">
          <input
            type="search"
            placeholder="Search songs or artists…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search videos"
          />
          <div className="style-chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`chip${activeCat === '' ? ' active' : ''}`}
              onClick={() => setActiveCat('')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${activeCat === c ? ' active' : ''}`}
                onClick={() => setActiveCat(activeCat === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="alert alert-error">{error}</p>}
        {!videos && !error && <p className="muted">Loading the library…</p>}
        {videos && filtered.length === 0 && (
          <p className="muted">Nothing matches — try a different search.</p>
        )}
        <div className="video-grid">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
