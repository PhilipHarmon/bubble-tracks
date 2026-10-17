import React from 'react';
import { Link } from 'react-router-dom';
import { thumbnail } from '../api.js';
import { useQueue } from '../queue.jsx';

export default function VideoCard({ video, showQueueButton = true }) {
  const { enqueue, queue } = useQueue();
  const queued = queue.some((v) => v.id === video.id);

  return (
    <article className="video-card">
      <Link to={`/watch/${video.id}`} className="video-thumb-link" aria-label={`Watch ${video.title} by ${video.artist}`}>
        <span className="video-thumb">
          <img src={thumbnail(video.youtubeId)} alt="" loading="lazy" />
          <span className="video-play" aria-hidden="true">▶</span>
        </span>
      </Link>
      <div className="video-card-body">
        <Link to={`/watch/${video.id}`} className="video-title">
          {video.title}
        </Link>
        <div className="video-artist">
          {video.artist}
          {video.year ? ` · ${video.year}` : ''}
        </div>
        <div className="video-card-foot">
          {video.category && <span className="kind-badge">{video.category}</span>}
          {video.pops && video.pops.length > 0 && (
            <span className="muted small">🫧 {video.pops.length} bubbles</span>
          )}
          {showQueueButton && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={queued}
              onClick={() => enqueue(video)}
            >
              {queued ? '✓ Queued' : '+ Queue'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
