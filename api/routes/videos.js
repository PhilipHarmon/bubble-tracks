const express = require('express');
const Video = require('../models/Video');

const router = express.Router();

function publicVideo(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  o.id = o._id;
  delete o._id;
  delete o.__v;
  return o;
}

// Admin gate: requests carrying the shared key in `x-admin-key` may write.
function requireAdmin(req, res, next) {
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) return res.status(500).json({ error: 'Admin is not configured (ADMIN_KEY missing).' });
  if (req.header('x-admin-key') === expected) return next();
  return res.status(401).json({ error: 'Admin key required.' });
}

// GET /api/videos?category=&search=
router.get('/videos', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.category) q.category = req.query.category;
    if (req.query.search) {
      const rx = new RegExp(escapeRegExp(req.query.search), 'i');
      q.$or = [{ title: rx }, { artist: rx }];
    }
    const docs = await Video.find(q).sort({ artist: 1, year: 1 }).lean();
    res.json(docs.map(publicVideo));
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/pop-of-day — deterministic daily pick.
router.get('/videos/pop-of-day', async (req, res, next) => {
  try {
    const docs = await Video.find({}).sort({ _id: 1 }).lean();
    if (!docs.length) return res.status(404).json({ error: 'No videos yet.' });
    const dayIndex = Math.floor(Date.now() / 86400000);
    res.json(publicVideo(docs[dayIndex % docs.length]));
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/categories
router.get('/videos/categories', async (req, res, next) => {
  try {
    const cats = await Video.distinct('category');
    res.json(cats.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/:id
router.get('/videos/:id', async (req, res, next) => {
  try {
    const doc = await Video.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Video not found.' });
    res.json(publicVideo(doc));
  } catch (err) {
    next(err);
  }
});

// POST /api/videos/bulk (admin) — import a batch of videos at once.
// Accepts a raw array or { videos: [...] }. Skips youtubeIds already present.
router.post('/videos/bulk', requireAdmin, async (req, res, next) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body.videos;
    if (!Array.isArray(list) || !list.length) {
      return res.status(400).json({ error: 'Provide an array of videos.' });
    }
    let inserted = 0;
    let skipped = 0;
    const errors = [];
    for (const raw of list.slice(0, 50)) {
      try {
        const clean = sanitize(raw);
        if (!clean.title || !clean.artist || !clean.youtubeId) {
          skipped += 1;
          continue;
        }
        const exists = await Video.findOne({ youtubeId: clean.youtubeId }).lean();
        if (exists) {
          skipped += 1;
          continue;
        }
        await Video.create(clean);
        inserted += 1;
      } catch (err) {
        errors.push(err.message);
        skipped += 1;
      }
    }
    res.json({ inserted, skipped, errors: errors.slice(0, 5) });
  } catch (err) {
    next(err);
  }
});

// POST /api/videos (admin)
router.post('/videos', requireAdmin, async (req, res, next) => {
  try {
    const doc = await Video.create(sanitize(req.body));
    res.status(201).json(publicVideo(doc));
  } catch (err) {
    next(err);
  }
});

// PUT /api/videos/:id (admin)
router.put('/videos/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await Video.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ error: 'Video not found.' });
    res.json(publicVideo(doc));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/videos/:id (admin)
router.delete('/videos/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await Video.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Video not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

function sanitize(body) {
  const pops = Array.isArray(body.pops)
    ? body.pops
        .map((p) => ({ at: clamp01(Number(p.at)), text: String(p.text || '').trim() }))
        .filter((p) => p.text && Number.isFinite(p.at))
        .sort((a, b) => a.at - b.at)
    : [];
  return {
    title: String(body.title || '').trim(),
    artist: String(body.artist || '').trim(),
    year: body.year ? Number(body.year) : undefined,
    category: String(body.category || '').trim() || undefined,
    youtubeId: extractYoutubeId(body.youtubeId || ''),
    description: String(body.description || '').trim(),
    pops,
  };
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// Accepts a bare ID or any youtube.com / youtu.be URL.
function extractYoutubeId(input) {
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : s;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = router;
