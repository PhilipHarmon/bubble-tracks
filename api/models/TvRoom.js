const mongoose = require('mongoose');

// A TV share room for Bubble Tracks, adapted from the Trivia Night pattern:
// the host's phone creates a room and pushes playback state into it; the
// TV's browser polls GET /api/tv/:code with no auth (a TV remote is no
// place for tokens). Only the host may write, proven by a random host
// token — we store only its SHA-256 hash, never the raw token.
// Rooms auto-expire 12 hours after creation via the TTL index.
const tvRoomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    hostTokenHash: { type: String, required: true },
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
    status: {
      type: String,
      enum: ['playing', 'paused', 'ended', 'waiting'],
      default: 'waiting',
    },
    currentTime: { type: Number, default: 0, min: 0 },
    duration: { type: Number, default: 0, min: 0 },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 12 * 3600 * 1000),
    },
  },
  { timestamps: true },
);

tvRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TvRoom', tvRoomSchema);
