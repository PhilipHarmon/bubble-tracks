import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const QueueContext = createContext(null);
const STORAGE_KEY = 'bt_queue';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function QueueProvider({ children }) {
  const [queue, setQueue] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      /* ignore */
    }
  }, [queue]);

  const enqueue = useCallback((video) => {
    setQueue((prev) => {
      if (prev.some((v) => v.id === video.id)) return prev;
      return [...prev, video];
    });
  }, []);

  const dequeue = useCallback((id) => {
    setQueue((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const clear = useCallback(() => setQueue([]), []);

  const move = useCallback((index, dir) => {
    setQueue((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }, []);

  return (
    <QueueContext.Provider value={{ queue, enqueue, dequeue, clear, move }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  return useContext(QueueContext);
}
