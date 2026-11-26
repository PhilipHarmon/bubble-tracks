import React, { useCallback, useEffect, useState } from 'react';

// Shared size logic for the TV set: normal -> theater (the whole set grows
// to near-full viewport) -> true fullscreen (the whole TV element, cabinet
// included, via requestFullscreen) -> back. Mirrors the old player-shell
// expand cycle, retargeted at the TV.
export function useTvSize(tvRef) {
  const [mode, setMode] = useState('normal'); // 'normal' | 'theater' | 'full'
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  const cycle = useCallback(() => {
    if (mode === 'normal') {
      setMode('theater');
    } else if (mode === 'theater') {
      if (canFullscreen && tvRef.current && tvRef.current.requestFullscreen) {
        const p = tvRef.current.requestFullscreen();
        if (p && typeof p.catch === 'function') p.catch(() => setMode('theater'));
      } else {
        setMode('normal');
      }
    } else if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      setMode('theater');
    }
  }, [mode, canFullscreen, tvRef]);

  // Keep state in sync when the user exits fullscreen with Esc.
  useEffect(() => {
    const onFsChange = () => {
      if (document.fullscreenElement === tvRef.current) {
        setMode('full');
      } else {
        setMode((m) => (m === 'full' ? 'theater' : m));
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [tvRef]);

  // Esc exits theater mode.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMode((m) => (m === 'theater' ? 'normal' : m));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { mode, setMode, cycle, canFullscreen };
}

// The vintage TV: a cable box on top (LED readout + whatever controls the
// page hands us), a wood-grain cabinet, a curved screen with its own
// internal scroll, and two working knobs — top is Shuffle Play, bottom
// cycles the set's size. Everything is drawn in CSS; no images.
export default function TvSet({
  tvRef,
  mode,
  onCycleSize,
  sizeLabel,
  onShuffle,
  cableControls,
  ledText,
  screenOverlay,
  scrollClassName,
  onExitTheater,
  children,
}) {
  const [knobTurns, setKnobTurns] = useState(0);

  function handleShuffle() {
    setKnobTurns((t) => t + 1);
    if (onShuffle) onShuffle();
  }

  const sizeDeg = mode === 'theater' ? 45 : mode === 'full' ? 90 : 0;

  return (
    <div ref={tvRef} className={`tv-set mode-${mode}`}>
      {mode === 'theater' && (
        <div className="theater-backdrop" onClick={onExitTheater} aria-hidden="true" />
      )}
      <div className="tv-assembly">
        <div className="cable-box">
          <div className="cable-led" aria-hidden="true">
            <span>{ledText}</span>
          </div>
          <div className="cable-controls">{cableControls}</div>
        </div>

        <div className="tv-cabinet">
          <div className="tv-bezel">
            <div className="tv-screen">
              <div className={`tv-screen-scroll${scrollClassName ? ` ${scrollClassName}` : ''}`}>
                {children}
              </div>
              {screenOverlay}
              <div className="tv-glare" aria-hidden="true" />
            </div>
          </div>

          <div className="tv-side">
            <div className="tv-knob-unit">
              <button
                type="button"
                className="tv-knob"
                onClick={handleShuffle}
                aria-label="Shuffle play"
                title="Shuffle play"
                style={{ transform: `rotate(${knobTurns * 40}deg)` }}
              >
                <span className="tv-knob-notch" aria-hidden="true" />
              </button>
              <span className="tv-knob-label" aria-hidden="true">
                Shuffle
              </span>
            </div>
            <div className="tv-knob-unit">
              <button
                type="button"
                className="tv-knob"
                onClick={onCycleSize}
                aria-label={`Screen size: ${sizeLabel}. Activate to change the TV size.`}
                title={`Screen size: ${sizeLabel}`}
                style={{ transform: `rotate(${sizeDeg}deg)` }}
              >
                <span className="tv-knob-notch" aria-hidden="true" />
              </button>
              <span className="tv-knob-label" aria-hidden="true">
                Size
              </span>
            </div>
            <div className="tv-speaker" aria-hidden="true" />
            <div className="tv-brand" aria-hidden="true">
              BubbleVision
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
