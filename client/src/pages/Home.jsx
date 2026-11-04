import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, thumbnail } from '../api.js';
import VideoCard from '../components/VideoCard.jsx';
import VideoRow from '../components/VideoRow.jsx';

const VIEW_KEY = 'bt_library_view';
const SORTS = [
  { value: 'artist-az', label: 'Artist A–Z' },
  { value: 'title-az', label: 'Title A–Z' },
  { value: 'year-asc', label: 'Year ↑ (oldest first)' },
  { value: 'year-desc', label: 'Year ↓ (newest first)' },
  { value: 'recent', label: 'Recently added' },
];
const VIEWS = [
  { value: 'grid', label: '▦ Grid' },
  { value: 'list', label: '☰ List' },
  { value: 'az', label: 'A–Z' },
];

function loadView() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return VIEWS.some((x) => x.value === v) ? v : 'grid';
  } catch {
    return 'grid';
  }
}

function sortVideos(list, sort) {
  const arr = [...list];
  const byText = (a, b) => String(a || '').localeCompare(String(b || ''));
  switch (sort) {
    case 'title-az':
      return arr.sort((a, b) => byText(a.title, b.title) || byText(a.artist, b.artist));
    case 'year-asc':
      return arr.sort((a, b) => (a.year || 0) - (b.year || 0) || byText(a.artist, b.artist));
    case 'year-desc':
      return arr.sort((a, b) => (b.year || 0) - (a.year || 0) || byText(a.artist, b.artist));
    case 'recent':
      return arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    case 'artist-az':
    default:
      return arr.sort((a, b) => byText(a.artist, b.artist) || (a.year || 0) - (b.year || 0));
  }
}

function artistLetter(video) {
  const ch = String(video.artist || '#').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

export default function Home() {
  const [videos, setVideos] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('artist-az');
  const [view, setView] = useState(loadView);
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

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const filtered = useMemo(() => {
    if (!videos) return [];
    const q = query.trim().toLowerCase();
    const list = videos.filter((v) => {
      if (activeCat && v.category !== activeCat) return false;
      if (q && !`${v.title} ${v.artist}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortVideos(list, sort);
  }, [videos, activeCat, query, sort]);

  // A–Z view: group the SAME filtered+sorted list by artist initial.
  const azGroups = useMemo(() => {
    if (view !== 'az') return [];
    const groups = new Map();
    filtered.forEach((v) => {
      const letter = artistLetter(v);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(v);
    });
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === '#') return 1;
      if (b[0] === '#') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered, view]);

  const filtersActive = query.trim() !== '' || activeCat !== '';

  function clearFilters() {
    setQuery('');
    setActiveCat('');
  }

  function jumpToLetter(letter) {
    const el = document.getElementById(`az-group-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function shuffle() {
    if (!videos || !videos.length) return;
    const pick = videos[Math.floor(Math.random() * videos.length)];
    navigate(`/watch/${pick.id}`, { state: { shuffle: true } });
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-brand" aria-label="Bubble Tracks">
            <span aria-hidden="true">🫧</span> Bubble Tracks
          </div>
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

        <div className="library-toolbar">
          <div className="library-controls">
            <div className="library-row">
              <input
                type="search"
                placeholder="Search songs or artists…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search videos"
              />
              <label className="sort-label">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort videos">
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="library-row library-row-between">
              <div className="view-toggle" role="group" aria-label="Library view">
                <span className="view-toggle-label" id="view-toggle-label">View</span>
                {VIEWS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    aria-pressed={view === v.value}
                    aria-labelledby="view-toggle-label"
                    className={`view-btn${view === v.value ? ' active' : ''}`}
                    onClick={() => setView(v.value)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {filtersActive && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  ✕ Clear filters
                </button>
              )}
            </div>
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
            {videos && (
              <p className="results-count" role="status">
                Showing {filtered.length} of {videos.length} videos
                {activeCat ? ` in ${activeCat}` : ''}
                {query.trim() ? ` matching “${query.trim()}”` : ''}
              </p>
            )}
          </div>
        </div>

        {error && <p className="alert alert-error">{error}</p>}
        {!videos && !error && <p className="muted">Loading the library…</p>}
        {videos && filtered.length === 0 && (
          <p className="muted">Nothing matches — try a different search, or clear the filters above.</p>
        )}

        {videos && filtered.length > 0 && view === 'grid' && (
          <div className="video-grid">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}

        {videos && filtered.length > 0 && view === 'list' && (
          <div className="video-list">
            {filtered.map((v) => (
              <VideoRow key={v.id} video={v} />
            ))}
          </div>
        )}

        {videos && filtered.length > 0 && view === 'az' && (
          <div className="az-wrap">
            <div className="az-bar" role="group" aria-label="Jump to artist letter">
              {azGroups.map(([letter]) => (
                <button key={letter} type="button" className="az-letter" onClick={() => jumpToLetter(letter)}>
                  {letter}
                </button>
              ))}
            </div>
            {azGroups.map(([letter, group]) => (
              <section key={letter} id={`az-group-${letter}`} className="az-group">
                <h2 className="az-heading">{letter}</h2>
                <div className="video-list">
                  {group.map((v) => (
                    <VideoRow key={v.id} video={v} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
