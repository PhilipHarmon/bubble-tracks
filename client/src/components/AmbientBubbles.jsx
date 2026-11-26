import React, { useRef, useState } from 'react';

// Ambient bubbles that rise on a slow loop, wiggle as they go, and pop
// when tapped — then respawn. The wrapper runs the rise animation; the
// button carries the bubble face, the wiggle, and the pop. All motion is
// CSS; under prefers-reduced-motion the stylesheet stills them (hero
// bubbles become a static row, flank bubbles hide).

function RiseBubble({ className = '', bubbleClassName = '', style, bubbleStyle, label, children }) {
  const [gen, setGen] = useState(0);
  const [popping, setPopping] = useState(false);
  const timer = useRef(null);

  function handlePop() {
    if (popping) return;
    setPopping(true);
    timer.current = setTimeout(() => {
      setPopping(false);
      setGen((g) => g + 1); // remount: the rise starts over
    }, 280);
  }

  return (
    <div key={gen} className={`rise-wrap ${className}`} style={style}>
      <button
        type="button"
        className={`rise-bubble ${bubbleClassName}${popping ? ' popping' : ''}`}
        style={bubbleStyle}
        onClick={handlePop}
        aria-label={label || 'Pop the bubble'}
      >
        <span className="rise-wiggle">{children}</span>
      </button>
    </div>
  );
}

// The banner's words, floating in bubbles (v6 hero; v12 spread the lanes
// wider across the banner and staggered the rise phases further apart).
// The two headline phrases carry `headline: true` — their bubble text
// renders black via .rise-bubble--headline (v12).
const HERO_PHRASES = [
  { text: 'Pop the bubbles.', headline: true, size: 168, fontSize: '1.28rem', left: '1%', dur: 26, delay: -4, wiggle: 5 },
  { text: 'Learn the stories.', headline: true, size: 158, fontSize: '1.2rem', left: '17%', dur: 30, delay: -17, wiggle: 6 },
  { text: 'Tap a bubble to pop it', size: 136, fontSize: '0.98rem', left: '32%', dur: 27, delay: -11, wiggle: 5.2 },
  { text: 'Recording stories', size: 126, fontSize: '1rem', left: '46%', dur: 22, delay: -7, wiggle: 4.4 },
  { text: 'Chart facts', size: 106, fontSize: '0.95rem', left: '60%', dur: 20, delay: -14, wiggle: 4 },
  { text: 'The culture of the moment', size: 180, fontSize: '1.1rem', left: '77%', dur: 32, delay: -25, wiggle: 6.4 },
];

export function HeroBubbles() {
  return (
    <div className="hero-bubbles">
      {HERO_PHRASES.map((p) => (
        <RiseBubble
          key={p.text}
          className="hero-rise"
          bubbleClassName={p.headline ? 'rise-bubble--headline' : ''}
          label={`Pop the bubble: ${p.text}`}
          style={{
            left: p.left,
            '--rise-dur': `${p.dur}s`,
            '--rise-delay': `${p.delay}s`,
          }}
          bubbleStyle={{
            width: p.size,
            height: p.size,
            fontSize: p.fontSize,
            '--wig-dur': `${p.wiggle}s`,
          }}
        >
          {p.text}
        </RiseBubble>
      ))}
    </div>
  );
}

// Plain bubbles drifting up either side of the TV (v6 flanks).
const FLANK_LEFT = [
  { size: 62, x: '6px', dur: 27, delay: -8, wiggle: 5 },
  { size: 38, x: '46px', dur: 21, delay: -16, wiggle: 4 },
  { size: 50, x: '18px', dur: 32, delay: -3, wiggle: 6 },
  { size: 32, x: '54px', dur: 18, delay: -11, wiggle: 3.6 },
];
const FLANK_RIGHT = [
  { size: 54, x: '26px', dur: 29, delay: -13, wiggle: 5.6 },
  { size: 34, x: '52px', dur: 19, delay: -5, wiggle: 3.8 },
  { size: 66, x: '4px', dur: 33, delay: -21, wiggle: 6.2 },
  { size: 42, x: '44px', dur: 23, delay: -9, wiggle: 4.4 },
];

function FlankColumn({ side, items }) {
  return (
    <div className={`flank-bubbles flank-${side}`} aria-hidden="false">
      {items.map((b, i) => (
        <RiseBubble
          key={i}
          className="flank-rise"
          label="Pop the bubble"
          style={{
            left: side === 'left' ? b.x : undefined,
            right: side === 'right' ? b.x : undefined,
            '--rise-dur': `${b.dur}s`,
            '--rise-delay': `${b.delay}s`,
          }}
          bubbleStyle={{
            width: b.size,
            height: b.size,
            '--wig-dur': `${b.wiggle}s`,
          }}
        >
          {null}
        </RiseBubble>
      ))}
    </div>
  );
}

export function FlankBubbles() {
  return (
    <>
      <FlankColumn side="left" items={FLANK_LEFT} />
      <FlankColumn side="right" items={FLANK_RIGHT} />
    </>
  );
}
