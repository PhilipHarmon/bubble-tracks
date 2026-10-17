import React, { useEffect, useRef } from 'react';

// Loads the YouTube IFrame Player API once per page lifetime.
let apiPromise = null;
function loadYouTubeAPI() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  });
  return apiPromise;
}

export default function YouTubePlayer({ videoId, playerRef, onReady, onStateChange, onError }) {
  const mountRef = useRef(null);
  const cbRef = useRef({ onReady, onStateChange, onError });
  cbRef.current = { onReady, onStateChange, onError };

  useEffect(() => {
    let player = null;
    let cancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => cbRef.current.onReady && cbRef.current.onReady(e),
          onStateChange: (e) => cbRef.current.onStateChange && cbRef.current.onStateChange(e),
          onError: (e) => cbRef.current.onError && cbRef.current.onError(e),
        },
      });
      if (playerRef) playerRef.current = player;
    });
    return () => {
      cancelled = true;
      try {
        player && player.destroy();
      } catch {
        /* already gone */
      }
      if (playerRef) playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="yt-frame">
      <div ref={mountRef} className="yt-mount" />
    </div>
  );
}
