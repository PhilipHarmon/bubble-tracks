// TV share rooms for Bubble Tracks — the Trivia Night pattern, adapted to
// this app's own API and Mongo.
//
//   POST   /api/tv        public — any viewer may host. Returns the room
//                         code plus the host token, ONCE. Only the token's
//                         SHA-256 hash is stored.
//   GET    /api/tv/:code  public read-only — the TV polls this.
//   PUT    /api/tv/:code  host only (x-host-token header).
//   DELETE /api/tv/:code  host only — ends the room (later GETs 404).
//
// Rooms expire 12 hours after creation (TTL index on TvRoom.expiresAt).
const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const TvRoom = require('../models/TvRoom');
const Video = require('../models/Video');

const router = express.Router();

// Unambiguous characters only — nothing that looks like something else
// when read aloud across the living room.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const STATUSES = ['playing', 'paused', 'ended', 'waiting'];

function makeCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function normCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function publicVideo(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const out = { ...o, id: o._id };
  delete out._id;
  delete out.__v;
  return out;
}

// Shape sent to everyone (host + TV). Never includes the token hash.
function publicRoom(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    code: o.code,
    status: o.status,
    currentTime: o.currentTime,
    duration: o.duration,
    video: o.video && typeof o.video === 'object' ? publicVideo(o.video) : o.video || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    expiresAt: o.expiresAt,
  };
}

async function loadRoom(code) {
  return TvRoom.findOne({ code }).populate('video');
}

function tokenMatches(req, room) {
  const provided = req.header('x-host-token');
  if (!provided) return false;
  const a = Buffer.from(hashToken(provided), 'hex');
  const b = Buffer.from(room.hostTokenHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function requireHost(req, res, next) {
  try {
    const room = await loadRoom(normCode(req.params.code));
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (!tokenMatches(req, room)) {
      return res.status(401).json({ error: 'Host token required.' });
    }
    req.tvRoom = room;
    return next();
  } catch (err) {
    return next(err);
  }
}

function clampTime(value, duration) {
  let n = Number(value);
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (Number.isFinite(duration) && duration > 0) n = Math.min(n, duration);
  return n;
}

// POST /api/tv — open a share room. Body: { video?: <video id> }.
router.post('/tv', async (req, res, next) => {
  try {
    const body = req.body || {};
    let videoId = null;
    if (body.video !== undefined && body.video !== null && body.video !== '') {
      if (!mongoose.isValidObjectId(body.video)) {
        return res.status(400).json({ error: 'Bad video id.' });
      }
      const video = await Video.findById(body.video).lean();
      if (!video) return res.status(400).json({ error: 'Unknown video.' });
      videoId = video._id;
    }

    let code = null;
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = makeCode();
      // eslint-disable-next-line no-await-in-loop
      const exists = await TvRoom.findOne({ code: candidate }).lean();
      if (!exists) code = candidate;
    }
    if (!code) return res.status(500).json({ error: 'Could not make a room — try again.' });

    const hostToken = crypto.randomBytes(24).toString('hex');
    const room = await TvRoom.create({
      code,
      hostTokenHash: hashToken(hostToken),
      video: videoId,
      status: videoId ? 'playing' : 'waiting',
      currentTime: 0,
      duration: 0,
    });
    const populated = await loadRoom(room.code);
    // The raw host token is returned here and NOWHERE else, ever.
    return res.status(201).json({ ...publicRoom(populated), hostToken });
  } catch (err) {
    return next(err);
  }
});

// GET /api/tv/:code — the TV polls this. Intentionally public.
router.get('/tv/:code', async (req, res, next) => {
  try {
    const room = await loadRoom(normCode(req.params.code));
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json(publicRoom(room));
  } catch (err) {
    return next(err);
  }
});

// PUT /api/tv/:code — the host pushes playback state. Whitelisted fields.
router.put('/tv/:code', requireHost, async (req, res, next) => {
  try {
    const body = req.body || {};
    const room = req.tvRoom;
    const update = {};

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Bad status.' });
      }
      update.status = body.status;
    }
    if (body.video !== undefined) {
      if (body.video === null || body.video === '') {
        update.video = null;
      } else {
        if (!mongoose.isValidObjectId(body.video)) {
          return res.status(400).json({ error: 'Bad video id.' });
        }
        // eslint-disable-next-line no-await-in-loop
        const video = await Video.findById(body.video).lean();
        if (!video) return res.status(400).json({ error: 'Unknown video.' });
        update.video = video._id;
      }
    }
    if (body.duration !== undefined) {
      const d = Number(body.duration);
      update.duration = Number.isFinite(d) && d > 0 ? d : 0;
    }
    if (body.currentTime !== undefined) {
      const effectiveDuration = update.duration !== undefined ? update.duration : room.duration;
      update.currentTime = clampTime(body.currentTime, effectiveDuration);
    }

    Object.assign(room, update);
    await room.save();
    const populated = await loadRoom(room.code);
    return res.json(publicRoom(populated));
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/tv/:code — the host ends the share.
router.delete('/tv/:code', requireHost, async (req, res, next) => {
  try {
    await TvRoom.deleteOne({ code: req.tvRoom.code });
    return res.json({ ok: true, ended: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
