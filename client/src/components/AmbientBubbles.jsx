import React, { useEffect, useMemo, useRef, useState } from 'react';

// Ambient full-page bubble field: a fixed, viewport-wide layer BEHIND the
// content (pointer-events: none). Bubbles drift slowly, and each one pops
// on its own random schedule — a quick scale/ring/fade — then respawns
// somewhere new. Positions are weighted toward the page edges so the field
// decorates the margins instead of fighting the text.
//
// prefers-reduced-motion: a static, faint field — no drift, no popping.
// Only transform/opacity animate, and the count stays modest.

const COUNT = 16;

function randomBubble(id) {
  // Edge-weighted horizontal placement: most bubbles hug the left/right
  // margins; a few wander the middle at lower opacity.
  const roll = Math.random();
  let left;
  let opacity;
  if (roll < 0.38) {
    left = Math.random() * 13; // left margin band
    opacity = 0.5 + Math.random() * 0.35;
  } else if (roll < 0.76) {
    left = 87 + Math.random() * 11; // right margin band
    opacity = 0.5 + Math.random() * 0.35;
  } else {
    left = 8 + Math.random() * 84; // anywhere, fainter
    opacity = 0.22 + Math.random() * 0.2;
  }
  return {
    id,
    left,
    top: Math.random() * 92,
    size: 22 + Math.round(Math.random() * 84), // 22–106px
    opacity,
    duration: 9 + Math.random() * 10, // float cycle 9–19s
    delay: -Math.random() * 12,
    sway: 10 + Math.random() * 22,
  };
}

function AmbientBubble({ bubble, animated, onRespawn }) {
  const [popping, setPopping] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (!animated) return undefined;
    // Each bubble lives 5–16s, pops, then respawns elsewhere.
    const life = setTimeout(() => {
      setPopping(true);
      const swap = setTimeout(() => onRespawn(bubble.id), 380);
      timers.current.push(swap);
    }, 5000 + Math.random() * 11000);
    timers.current.push(life);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [bubble.id, animated, onRespawn]);

  const style = {
    left: `${bubble.left}%`,
    top: `${bubble.top}%`,
    width: bubble.size,
    height: bubble.size,
    opacity: popping ? undefined : bubble.opacity,
    '--sway': `${bubble.sway}px`,
    animationDuration: `${bubble.duration}s`,
    animationDelay: `${bubble.delay}s`,
  };

  return (
    <span
      aria-hidden="true"
      className={`ambient-bubble${popping ? ' popping' : ''}`}
      style={style}
    />
  );
}

export default function AmbientBubbles() {
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const nextId = useRef(COUNT);
  const [bubbles, setBubbles] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => randomBubble(i)),
  );

  const respawn = React.useCallback((id) => {
    nextId.current += 1;
    const fresh = randomBubble(nextId.current);
    setBubbles((prev) => prev.map((b) => (b.id === id ? fresh : b)));
  }, []);

  return (
    <div className={`ambient-bubbles${reduced ? ' reduced' : ''}`} aria-hidden="true">
      {bubbles.map((b) => (
        <AmbientBubble key={b.id} bubble={b} animated={!reduced} onRespawn={respawn} />
      ))}
    </div>
  );
}
