import React, { useEffect, useRef } from 'react';

// Presentational bubble layer. The Watch page decides which bubbles are
// visible; each bubble auto-dismisses after BUBBLE_TTL unless popped first.
const BUBBLE_TTL = 10000;
const SPOTS = ['spot-tl', 'spot-tr', 'spot-bl', 'spot-br'];

function Bubble({ bubble, spot, onPop, onExpire }) {
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setTimeout(() => onExpire(bubble.key), BUBBLE_TTL);
    return () => clearTimeout(timer.current);
  }, [bubble.key, onExpire]);

  function pop() {
    clearTimeout(timer.current);
    onPop(bubble.key);
  }

  return (
    <button type="button" className={`pop-bubble ${spot}${bubble.popping ? ' popping' : ''}`} onClick={pop} aria-label="Pop this trivia bubble">
      <span className="pop-emoji" aria-hidden="true">💡</span>
      <span className="pop-text">{bubble.text}</span>
      <span className="pop-hint" aria-hidden="true">tap to pop</span>
    </button>
  );
}

export default function BubbleLayer({ bubbles, onPop, onExpire }) {
  return (
    <div className="bubble-zone" aria-live="polite">
      {bubbles.map((b, i) => (
        <Bubble key={b.key} bubble={b} spot={SPOTS[i % SPOTS.length]} onPop={onPop} onExpire={onExpire} />
      ))}
    </div>
  );
}
