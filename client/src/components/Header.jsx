import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useQueue } from '../queue.jsx';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { queue } = useQueue();
  const navigate = useNavigate();

  async function shuffle() {
    try {
      const videos = await api.videos();
      if (!videos.length) return;
      const pick = videos[Math.floor(Math.random() * videos.length)];
      setOpen(false);
      navigate(`/watch/${pick.id}`, { state: { shuffle: true } });
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="site-title" onClick={() => setOpen(false)}>
          🫧 Bubble Tracks
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>
        <nav className={`site-nav${open ? ' open' : ''}`} aria-label="Site">
          <NavLink to="/" end onClick={() => setOpen(false)}>
            Home
          </NavLink>
          <button type="button" className="nav-link-btn" onClick={shuffle}>
            🔀 Shuffle
          </button>
          <NavLink to="/queue" onClick={() => setOpen(false)}>
            Queue{queue.length > 0 ? ` (${queue.length})` : ''}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
