import React, { useEffect, useState } from 'react';

// Back-to-top button: fixed bottom-right, hidden until the page has
// scrolled ~600px (the library list is long), then fades/slides in.
// Sits at z-index 70 (see index.css): above the cards and the sticky
// library toolbar (60), below the theater backdrop (90), the site
// header (1000) and the TV share modal (1200).
//
// prefers-reduced-motion: the click jumps straight to the top instead
// of smooth-scrolling, and the CSS kills the fade/slide transition.
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toTop = () => {
    const reduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`back-to-top${visible ? ' visible' : ''}`}
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      ↑
    </button>
  );
}
