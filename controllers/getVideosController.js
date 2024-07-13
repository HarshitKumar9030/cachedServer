const fs = require('fs-extra');
const path = require('path');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');

exports.getVideos = async (req, res) => {
  try {
    const files = await fs.readdir(DOWNLOADS_FOLDER);
    const videos = files.map(file => ({
      name: file,
      path: path.join(DOWNLOADS_FOLDER, file)
    }));
    res.json(videos);
  } catch (error) {
    console.error(`Error retrieving videos: ${error.message}`);
    res.status(500).json({ error: `Error retrieving videos: ${error.message}` });
  }
};
