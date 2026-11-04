const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ADMIN_KEY = () => localStorage.getItem('bt_admin_key') || '';

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function write(path, method, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  videos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/videos${qs ? `?${qs}` : ''}`);
  },
  video: (id) => get(`/videos/${id}`),
  categories: () => get('/videos/categories'),
  popOfDay: () => get('/videos/pop-of-day'),
  createVideo: (body) => write('/videos', 'POST', body),
  bulkImport: (videos) => write('/videos/bulk', 'POST', videos),
  updateVideo: (id, body) => write(`/videos/${id}`, 'PUT', body),
  deleteVideo: (id) => write(`/videos/${id}`, 'DELETE'),
};

// --- TV share rooms -------------------------------------------------------
// Create is public; writes after that need the one-time host token the API
// returned at creation (sent as x-host-token, never the admin key).
async function tvWrite(path, method, body, hostToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (hostToken) headers['x-host-token'] = hostToken;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const tvApi = {
  create: (videoId) => tvWrite('/tv', 'POST', videoId ? { video: videoId } : {}),
  room: (code) => get(`/tv/${encodeURIComponent(code)}`),
  update: (code, hostToken, body) => tvWrite(`/tv/${encodeURIComponent(code)}`, 'PUT', body, hostToken),
  end: (code, hostToken) => tvWrite(`/tv/${encodeURIComponent(code)}`, 'DELETE', null, hostToken),
};

export function setAdminKey(key) {
  if (key) localStorage.setItem('bt_admin_key', key);
  else localStorage.removeItem('bt_admin_key');
}

export function hasAdminKey() {
  return !!localStorage.getItem('bt_admin_key');
}

export function thumbnail(youtubeId) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}
