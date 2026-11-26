import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import VideoCard from '../components/VideoCard.jsx';
import TvSet, { useTvSize } from '../components/TvSet.jsx';

const VIEW_OPTIONS = [
  { key: 'grid', label: '▦ Grid' },
  { key: 'list', label: '☰ List' },
  { key: 'az', label: 'A–Z' },
];

const SORT_OPTIONS = [
  { key: 'artist', label: 'Artist A–Z' },
  { key: 'title', label: 'Title A–Z' },
  { key: 'yearAsc', label: 'Year (oldest first)' },
  { key: 'yearDesc', label: 'Year (newest first)' },
];

export default function Home() {
  const [videos, setVideos] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('artist');
  const [view, setView] = useState('grid');
  const [screenMode, setScreenMode] = useState('title'); // 'title' | 'browse'
  const [popOfDay, setPopOfDay] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const tvRef = useRef(null);
  const { mode, cycle, setMode } = useTvSize(tvRef);

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

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const byText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    switch (sort) {
      case 'title':
        arr.sort((a, b) => byText(a.title, b.title) || byText(a.artist, b.artist));
        break;
      case 'yearAsc':
        arr.sort((a, b) => (a.year || 9999) - (b.year || 9999) || byText(a.artist, b.artist));
        break;
      case 'yearDesc':
        arr.sort((a, b) => (b.year || 0) - (a.year || 0) || byText(a.artist, b.artist));
        break;
      default:
        arr.sort((a, b) => byText(a.artist, b.artist) || byText(a.title, b.title));
    }
    return arr;
  }, [filtered, sort]);

  const azGroups = useMemo(() => {
    if (view !== 'az') return [];
    const groups = new Map();
    sorted.forEach((v) => {
      const first = (v.artist || v.title || '#').trim().charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(first) ? first : '#';
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(v);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sorted, view]);

  function shuffle() {
    if (!videos || !videos.length) return;
    const pick = videos[Math.floor(Math.random() * videos.length)];
    navigate(`/watch/${pick.id}`, { state: { shuffle: true } });
  }

  // Any touch of the cable-box controls tunes the screen to the library.
  function browse() {
    setScreenMode('browse');
  }

  const sizeLabel = mode === 'full' ? 'Full screen' : mode === 'theater' ? 'Theater' : 'Normal';

  const cableControls = (
    <div className="cable-home-controls">
      <input
        type="search"
        placeholder="Search songs or artists…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          browse();
        }}
        aria-label="Search videos"
      />
      <div className="style-chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`chip${activeCat === '' ? ' active' : ''}`}
          onClick={() => {
            setActiveCat('');
            browse();
          }}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${activeCat === c ? ' active' : ''}`}
            onClick={() => {
              setActiveCat(activeCat === c ? '' : c);
              browse();
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="cable-row">
        <label className="cable-sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              browse();
            }}
            aria-label="Sort videos"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="view-toggle" role="group" aria-label="Change view">
          <span className="view-toggle-label" aria-hidden="true">
            View
          </span>
          {VIEW_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={view === o.key ? 'active' : ''}
              aria-pressed={view === o.key}
              onClick={() => {
                setView(o.key);
                browse();
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

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

      <div className="tv-wrap page">
        <TvSet
          tvRef={tvRef}
          mode={mode}
          onCycleSize={cycle}
          sizeLabel={sizeLabel}
          onShuffle={shuffle}
          cableControls={cableControls}
          ledText="STANDBY"
          onExitTheater={() => setMode('normal')}
        >
          {error && (
            <div className="tv-browse">
              <p className="alert alert-error">{error}</p>
            </div>
          )}

          {!videos && !error && (
            <div className="tv-browse">
              <p className="muted">Loading the library…</p>
            </div>
          )}

          {videos && !error && screenMode === 'title' && (
            <div className="tv-title-card">
              <div className="tv-static" aria-hidden="true" />
              <div className="tv-title-inner">
                <div className="tv-title-bubbles" aria-hidden="true">
                  🫧
                </div>
                <h2 className="tv-title-logo">Bubble Tracks</h2>
                <p className="tv-title-tag">Music videos, annotated</p>
                <p className="tv-title-sub">Pop the bubbles. Learn the stories.</p>
                <div className="tv-title-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => setScreenMode('browse')}
                  >
                    📺 Browse the library
                  </button>
                  {popOfDay && (
                    <Link to={`/watch/${popOfDay.id}`} className="btn btn-ghost btn-lg tv-title-pick">
                      🫧 Today's pick: {popOfDay.title}
                    </Link>
                  )}
                </div>
                <p className="tv-title-hint muted small">
                  Tip: the top knob shuffles, the bottom knob makes the TV bigger.
                </p>
              </div>
            </div>
          )}

          {videos && !error && screenMode === 'browse' && (
            <div className="tv-browse">
              {sorted.length === 0 && (
                <p className="muted">Nothing matches — try a different search.</p>
              )}

              {view === 'grid' && sorted.length > 0 && (
                <div className="video-grid">
                  {sorted.map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              )}

              {view === 'list' && sorted.length > 0 && (
                <div className="video-grid list-view">
                  {sorted.map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              )}

              {view === 'az' && sorted.length > 0 && (
                <div className="az-index">
                  {azGroups.map(([letter, items]) => (
                    <section key={letter} className="az-group">
                      <h3 className="az-letter">{letter}</h3>
                      <ul className="az-list">
                        {items.map((v) => (
                          <li key={v.id}>
                            <Link to={`/watch/${v.id}`} className="az-row">
                              <span className="az-title">{v.title}</span>
                              <span className="az-meta">
                                {v.artist}
                                {v.year ? ` · ${v.year}` : ''}
                              </span>
                              {v.category && <span className="kind-badge">{v.category}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </TvSet>
      </div>
    </div>
  );
}
