const fs = require('fs-extra');
const path = require('path');
const Video = require('../models/Video');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');

exports.getVideos = async (req, res) => {
  try {
    const files = await fs.readdir(DOWNLOADS_FOLDER);
    
    if (files.length === 0) {
      return res.json([]);
    }

    const videos = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(DOWNLOADS_FOLDER, file);
        let video;
        
        try {
          video = await Video.findOne({ filePath }).exec();
        } catch (err) {
          console.error(`Error finding video in DB for file ${file}: ${err.message}`);
          video = null;
        }

        return {
          name: file,
          path: filePath,
          creatorName: video ? video.creatorName : 'Unknown Creator',
          thumbnail: video ? video.thumbnail : null
        };
      })
    );

    res.json(videos);
  } catch (error) {
    console.error(`Error retrieving videos: ${error.message}`);
    res.status(500).json({ error: `Error retrieving videos: ${error.message}` });
  }
};
