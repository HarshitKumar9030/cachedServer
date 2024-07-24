const fs = require('fs-extra');
const path = require('path');
const Video = require('../models/Video');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');

exports.getVideos = async (req, res) => {
  try {
    const files = await fs.readdir(DOWNLOADS_FOLDER);

    if (files.length === 0) {
      console.log("No files found in the downloads folder.");
      return res.json([]);
    }

    const videos = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(DOWNLOADS_FOLDER, file);
        console.log(`Checking file: ${filePath}`);

        let video = null;

        try {
          // Normalize the path to ensure it matches the DB format
          const dbFilePath = path.resolve(filePath);
          console.log(`Searching for video in DB with path: ${dbFilePath}`);
          video = await Video.findOne({ filePath: dbFilePath }).exec();
          if (!video) {
            console.log(`No video found in DB for file path: ${dbFilePath}`);
          } else {
            console.log(`Video found in DB for file path: ${dbFilePath}`);
          }
        } catch (err) {
          console.error(`Error finding video in DB for file ${file}: ${err.message}`);
        }

        return {
          name: file,
          path: filePath,
          creatorName: video ? video.creatorName : 'Unknown Creator',
          thumbnail: video ? video.thumbnail : null,
        };
      })
    );

    console.log("Videos retrieved:", videos);
    res.json(videos);
  } catch (error) {
    console.error(`Error retrieving videos: ${error.message}`);
    res.status(500).json({ error: `Error retrieving videos: ${error.message}` });
  }
};
