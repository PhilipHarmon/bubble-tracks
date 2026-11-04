import React from 'react';

// The "Show on TV" modal: big room code, the full ?tv= URL, and plain
// instructions. This is the Trivia Night pattern — the TV's own browser
// opens the URL; the phone stays in charge. It is NOT Chromecast.
export default function TvShareModal({ room, url, error, busy, onClose, onEnd }) {
  return (
    <div className="tv-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="tv-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Show on TV"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="tv-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>📺 Show on TV</h2>

        {busy && <p className="muted">Opening your TV room…</p>}

        {error && (
          <p className="alert alert-error">
            Couldn't reach the Bubble Tracks server, so the TV room didn't open. Your video is
            fine — check your connection and try again. (AirPlay still works as a backup.)
          </p>
        )}

        {room && (
          <>
            <p className="tv-code-label">On the TV's browser, go to this address:</p>
            <p className="tv-url">{url}</p>
            <p className="tv-code-label">Room code</p>
            <p className="tv-code">{room.code}</p>
            <ol className="tv-steps">
              <li>Open the browser on your TV and type the address above exactly.</li>
              <li>Tap <strong>▶ Start</strong> on the TV once — browsers make us ask first.</li>
              <li>Keep this phone in charge: play, pause, queue and shuffle all happen here, and the TV follows.</li>
              <li>No luck? AirPlay from this phone is the trusty backup.</li>
            </ol>
            <div className="tv-modal-actions">
              <button type="button" className="btn btn-danger-outline" onClick={onEnd}>
                End TV share
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Keep watching
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
