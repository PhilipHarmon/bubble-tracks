const mongoose = require('mongoose');

// One music video plus its "pop track": trivia bubbles timed as a fraction
// (0..1) of the video's duration, so pops stay synced without knowing the
// exact runtime up front.
const popSchema = new mongoose.Schema(
  {
    at: { type: Number, required: true, min: 0, max: 1 },
    text: { type: String, required: true },
  },
  { _id: false },
);

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    year: Number,
    category: { type: String, index: true },
    // Christmas collection marker: true only for songs in the Christmas
    // collection (set by the holiday sprint's bulk import). Everything
    // else in the library is false/absent and browses exactly as before.
    christmas: { type: Boolean, default: false, index: true },
    youtubeId: { type: String, required: true, unique: true },
    description: String,
    pops: { type: [popSchema], default: [] },
  },
  { timestamps: true },
);

videoSchema.index({ title: 'text', artist: 'text' });

module.exports = mongoose.model('Video', videoSchema);
