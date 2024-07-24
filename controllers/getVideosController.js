const fs = require('fs-extra');
const path = require('path');
const Video = require('../models/Video');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');

exports.getVideos = async (req, res) => {
  try {
    // Fetch all videos from the database
    const videoEntries = await Video.find().exec();

    if (videoEntries.length === 0) {
      return res.json([]);
    }

    const videos = await Promise.all(
      videoEntries.map(async (video) => {
        const filePath = video.filePath || path.join(DOWNLOADS_FOLDER, video.name);

        let fileExists = false;

        try {
          fileExists = await fs.pathExists(filePath);
          
        } catch (err) {
          console.error(`Error checking file existence for ${filePath}: ${err.message}`);
        }

        return {
          name: path.basename(filePath),
          videoId: video._id,
          path: fileExists ? filePath : null,
          creatorName: video.creatorName || 'Unknown',
          thumbnail: video.thumbnail || null
        };
      })
    );

    res.json(videos);
  } catch (error) {
    console.error(`Error retrieving videos: ${error.message}`);
    res.status(500).json({ error: `Error retrieving videos: ${error.message}` });
  }
};
