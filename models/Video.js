const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  format: { type: String, required: true },
  filePath: { type: String, required: true },
  thumbnail: { type: String, required: true }, 
  description: { type: String, required: true },
  creatorName: { type: String, required: true }, 
  createdAt: { type: Date, default: Date.now },
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
