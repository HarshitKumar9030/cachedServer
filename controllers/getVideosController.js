const fs = require('fs-extra');
const path = require('path');
const Video = require('../models/video');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');

exports.getVideos = async (req, res) => {
  try {
    const files = await fs.readdir(DOWNLOADS_FOLDER);
    const videos = await Promise.all(files.map(async (file) => {
      const filePath = path.join(DOWNLOADS_FOLDER, file);
      const video = await Video.findOne({ name: file }).exec();
      return {
        name: file,
        path: filePath,
        creatorName: video ? video.creatorName : 'Unknown Creator',
        thumbnail: video ? video.thumbnail : null
      };
    }));

    res.json(videos);
  } catch (error) {
    console.error(`Error retrieving videos: ${error.message}`);
    res.status(500).json({ error: `Error retrieving videos: ${error.message}` });
  }
};
