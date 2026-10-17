// First-boot seed: load the bundled video catalog only when the collection
// is empty. Never drops or overwrites — safe on every boot.
const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');

async function seedIfEmpty() {
  const count = await Video.countDocuments();
  if (count > 0) {
    console.log(`seed: videos already has ${count} docs — skipping`);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'seed-videos.json'), 'utf8'));
  if (raw.length) await Video.insertMany(raw, { ordered: false });
  console.log(`seed: inserted ${raw.length} videos`);
}

module.exports = { seedIfEmpty };
