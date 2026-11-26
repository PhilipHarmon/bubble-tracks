import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col">
          <h3>🫧 Bubble Tracks</h3>
          <p className="muted">
            Classic music videos with pop-up trivia. Tap the bubbles, learn the stories,
            build your queue.
          </p>
        </div>
        <div className="footer-col">
          <h4>Explore</h4>
          <nav className="footer-nav">
            <Link to="/">Home</Link>
            <Link to="/admin">Admin</Link>
          </nav>
        </div>
        <div className="footer-col">
          <h4>Fine print</h4>
          <p className="muted">
            Videos stream via YouTube's official player. Trivia is researched and written
            by humans.
          </p>
        </div>
      </div>
      <p className="footer-copy">© {year} Philip Harmon. Turn it up.</p>
    </footer>
  );
}
