const fs = require('fs-extra');
const path = require('path');
const Video = require('../models/Video');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');

exports.getVideos = async (req, res) => {
  try {
    // Fetch all videos from the database
    const videoEntries = await Video.find().exec();

    if (videoEntries.length === 0) {
      console.log("No video entries found in the database.");
      return res.json([]);
    }

    const videos = await Promise.all(
      videoEntries.map(async (video) => {
        const filePath = video.filePath;
        console.log(`Checking file: ${filePath}`);

        let fileExists = false;

        try {
          fileExists = await fs.pathExists(filePath);
          if (!fileExists) {
            console.log(`File does not exist: ${filePath}`);
          } else {
            console.log(`File exists: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error checking file existence for ${filePath}: ${err.message}`);
        }

        return {
          name: path.basename(filePath),
          path: fileExists ? filePath : null,
          creatorName: video.creatorName,
          thumbnail: video.thumbnail,
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
