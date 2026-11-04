import React from 'react';
import { Link } from 'react-router-dom';
import { thumbnail } from '../api.js';
import { useQueue } from '../queue.jsx';

// Compact list-view row for scanning the library fast: small thumb,
// title/artist/year/category, play + queue.
export default function VideoRow({ video }) {
  const { enqueue, queue } = useQueue();
  const queued = queue.some((v) => v.id === video.id);

  return (
    <article className="video-row">
      <Link to={`/watch/${video.id}`} className="video-row-thumb" aria-label={`Watch ${video.title} by ${video.artist}`}>
        <img src={thumbnail(video.youtubeId)} alt="" loading="lazy" />
        <span className="video-row-play" aria-hidden="true">▶</span>
      </Link>
      <div className="video-row-main">
        <Link to={`/watch/${video.id}`} className="video-title">
          {video.title}
        </Link>
        <div className="video-artist">
          {video.artist}
          {video.year ? ` · ${video.year}` : ''}
          {video.category ? ` · ${video.category}` : ''}
          {video.pops && video.pops.length > 0 ? ` · 🫧 ${video.pops.length}` : ''}
        </div>
      </div>
      <div className="video-row-actions">
        <Link to={`/watch/${video.id}`} className="btn btn-primary btn-sm">
          ▶ Play
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={queued}
          onClick={() => enqueue(video)}
        >
          {queued ? '✓ Queued' : '+ Queue'}
        </button>
      </div>
    </article>
  );
}
