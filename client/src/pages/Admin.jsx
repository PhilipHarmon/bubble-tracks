import React, { useEffect, useState } from 'react';
import { api, hasAdminKey, setAdminKey } from '../api.js';

const emptyForm = {
  title: '',
  artist: '',
  year: '',
  category: '',
  youtubeId: '',
  description: '',
  pops: [],
};

export default function Admin() {
  const [unlocked, setUnlocked] = useState(hasAdminKey());
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(null); // video object or 'new'
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (unlocked) refresh();
  }, [unlocked]);

  async function refresh() {
    try {
      setVideos(await api.videos());
    } catch {
      setNotice('Could not load videos — is the API running?');
    }
  }

  function unlock(e) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim());
    setKeyInput('');
    setKeyError('');
    setUnlocked(true);
  }

  function lock() {
    setAdminKey('');
    setUnlocked(false);
    setEditing(null);
  }

  function startNew() {
    setForm(emptyForm);
    setEditing('new');
    setNotice('');
  }

  function startEdit(v) {
    setForm({
      title: v.title || '',
      artist: v.artist || '',
      year: v.year || '',
      category: v.category || '',
      youtubeId: v.youtubeId || '',
      description: v.description || '',
      pops: (v.pops || []).map((p) => ({ at: Math.round(p.at * 100), text: p.text })),
    });
    setEditing(v);
    setNotice('');
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function addPop() {
    setForm((f) => ({ ...f, pops: [...f.pops, { at: 50, text: '' }] }));
  }

  function setPop(i, field, value) {
    setForm((f) => ({
      ...f,
      pops: f.pops.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));
  }

  function removePop(i) {
    setForm((f) => ({ ...f, pops: f.pops.filter((_, idx) => idx !== i) }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const body = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        pops: form.pops.map((p) => ({ at: Number(p.at) / 100, text: p.text })),
      };
      if (editing === 'new') {
        await api.createVideo(body);
        setNotice('Video added! 🎉');
      } else {
        await api.updateVideo(editing.id, body);
        setNotice('Saved. 🎉');
      }
      setEditing(null);
      await refresh();
    } catch (err) {
      if (/401/.test(err.message)) {
        setKeyError('That key was rejected. Try again.');
        lock();
      } else {
        setNotice(`Save failed: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this video and all its bubbles?')) return;
    try {
      await api.deleteVideo(id);
      await refresh();
      setNotice('Deleted.');
    } catch (err) {
      setNotice(`Delete failed: ${err.message}`);
    }
  }

  async function doBulkImport() {
    setNotice('');
    let parsed;
    try {
      parsed = JSON.parse(bulkText);
    } catch {
      setNotice('That is not valid JSON — check for typos and try again.');
      return;
    }
    setBulkBusy(true);
    try {
      const result = await api.bulkImport(parsed);
      setNotice(`Imported ${result.inserted} video(s), skipped ${result.skipped}. 🎉`);
      setBulkText('');
      await refresh();
    } catch (err) {
      setNotice(`Import failed: ${err.message}`);
    } finally {
      setBulkBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="narrow page">
        <h1>Admin</h1>
        <p className="muted">Enter the admin key to manage videos and trivia bubbles.</p>
        <form onSubmit={unlock} className="search-row" style={{ maxWidth: 420 }}>
          <input
            type="password"
            placeholder="Admin key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            aria-label="Admin key"
          />
          <button type="submit" className="btn btn-primary">Unlock</button>
        </form>
        {keyError && <p className="alert alert-error">{keyError}</p>}
      </div>
    );
  }

  return (
    <div className="narrow page">
      <div className="panel-head-row">
        <h1>Admin</h1>
        <span>
          <button type="button" className="btn btn-primary btn-sm" onClick={startNew} style={{ marginRight: 8 }}>
            + Add video
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={lock}>
            Lock
          </button>
        </span>
      </div>
      {notice && <p className="alert">{notice}</p>}

      {editing && (
        <form className="panel" onSubmit={save}>
          <h2 className="panel-title">{editing === 'new' ? 'Add a video' : `Edit: ${editing.title}`}</h2>
          <div className="admin-grid">
            <label>
              Song title*
              <input value={form.title} onChange={(e) => setField('title', e.target.value)} required />
            </label>
            <label>
              Artist*
              <input value={form.artist} onChange={(e) => setField('artist', e.target.value)} required />
            </label>
            <label>
              Year
              <input type="number" value={form.year} onChange={(e) => setField('year', e.target.value)} placeholder="1985" />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="80s" />
            </label>
            <label className="span-2">
              YouTube video ID or URL*
              <input value={form.youtubeId} onChange={(e) => setField('youtubeId', e.target.value)} required placeholder="djV11Xbc914 or full youtube.com URL" />
            </label>
            <label className="span-2">
              Description
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={2} />
            </label>
          </div>

          <h3 className="panel-title" style={{ marginTop: '1.25rem' }}>
            🫧 Trivia bubbles ({form.pops.length})
          </h3>
          <p className="muted small">
            "At %" is the point in the video the bubble appears (0 = start, 100 = end). Bubbles
            are shown in time order.
          </p>
          {form.pops.map((p, i) => (
            <div key={i} className="pop-editor-row">
              <input
                type="number"
                min="0"
                max="100"
                value={p.at}
                onChange={(e) => setPop(i, 'at', e.target.value)}
                aria-label={`Bubble ${i + 1} position percent`}
                className="pop-at"
              />
              <span className="muted">%</span>
              <input
                value={p.text}
                onChange={(e) => setPop(i, 'text', e.target.value)}
                placeholder="Trivia bubble text…"
                aria-label={`Bubble ${i + 1} text`}
                className="pop-text-input"
              />
              <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => removePop(i)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addPop}>
            + Add bubble
          </button>

          <div className="admin-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save video'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="panel">
        <h2 className="panel-title">📥 Bulk import</h2>
        <p className="muted small">
          Paste a JSON array of videos (the weekly research batch) and import them all
          at once. Videos already in the library are skipped automatically.
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={4}
          placeholder='[{"title":"...","artist":"...","youtubeId":"...","pops":[{"at":0.1,"text":"..."}]}]'
          aria-label="Videos JSON to import"
        />
        <div className="admin-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={doBulkImport} disabled={bulkBusy || !bulkText.trim()}>
            {bulkBusy ? 'Importing…' : 'Import videos'}
          </button>
        </div>
      </section>

      <ul className="result-list">
        {videos.map((v) => (          <li key={v.id} className="result-row">
            <div>
              <strong>{v.title}</strong> <span className="muted small">— {v.artist}</span>
              <div className="muted small">
                {v.year || ''} {v.category ? `· ${v.category}` : ''} · 🫧 {v.pops ? v.pops.length : 0} bubbles
              </div>
            </div>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(v)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => remove(v.id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      {videos.length === 0 && <p className="muted">No videos yet — add the first one!</p>}
    </div>
  );
}
