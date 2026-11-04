import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { thumbnail } from '../api.js';
import { useQueue } from '../queue.jsx';

export default function Queue() {
  const { queue, dequeue, clear, move } = useQueue();
  const navigate = useNavigate();

  return (
    <div className="narrow page">
      <div className="panel-head-row">
        <h1>Your queue</h1>
        {queue.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            Clear queue
          </button>
        )}
      </div>
      {queue.length === 0 ? (
        <p className="muted">
          Nothing queued yet. Hit <strong>+ Queue</strong> on any video and it'll line up here.
        </p>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/watch/${queue[0].id}`)}
          >
            ▶ Play queue ({queue.length})
          </button>
          <ol className="queue-list">
            {queue.map((v, i) => (
              <li key={v.id} className="queue-row">
                <span className="timeline-num">{i + 1}</span>
                <Link to={`/watch/${v.id}`} className="queue-thumb">
                  <img src={thumbnail(v.youtubeId)} alt="" loading="lazy" />
                </Link>
                <div className="queue-main">
                  <Link to={`/watch/${v.id}`} className="video-title">
                    {v.title}
                  </Link>
                  <div className="muted small">{v.artist}</div>
                </div>
                <span className="queue-actions">
                  {i > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} title="Move earlier">
                      ↑
                    </button>
                  )}
                  {i < queue.length - 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} title="Move later">
                      ↓
                    </button>
                  )}
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => dequeue(v.id)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
