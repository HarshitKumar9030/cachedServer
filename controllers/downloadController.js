const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const Video = require('../models/Video');
const { updateTrendingWords, stopWords } = require('../utils/trendingUtils');

const UPLOADS_FOLDER = path.join(__dirname, '../uploads');
const OUTPUT_FOLDER = path.join(__dirname, '../videos');

// Ensure directories exist
fs.ensureDirSync(UPLOADS_FOLDER);
fs.ensureDirSync(OUTPUT_FOLDER);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: UPLOADS_FOLDER,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Function to check if the storage limit is exceeded
const MAX_STORAGE_SIZE = parseInt(process.env.MAX_STORAGE_SIZE, 10) || 1000000000; // Default to 1GB

async function checkStorageSize(folder) {
  try {
    const files = await fs.readdir(folder);
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(folder, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
    return totalSize;
  } catch (error) {
    throw new Error(`Error checking storage size: ${error.message}`);
  }
}

exports.convertToWav = async (req, res) => {
  try {
    const tempFilePath = req.file.path;
    const fileName = req.file.originalname;
    const fileBaseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    const outputFileName = `${fileBaseName}.wav`;
    const outputFilePath = path.join(OUTPUT_FOLDER, outputFileName);

    const { title, thumbnail, description, videoId, creatorName } = req.body;

    if (!title || !videoId) {
      await fs.remove(tempFilePath);
      return res.status(400).json({ error: 'Missing video metadata.' });
    }

    const currentSize = await checkStorageSize(OUTPUT_FOLDER);
    if (currentSize >= MAX_STORAGE_SIZE) {
      console.error('Storage limit reached.');
      await fs.remove(tempFilePath);
      return res.status(507).json({ error: 'Storage limit reached.' });
    }

    const existingVideo = await Video.findOne({ videoId, format: 'wav' });
    if (existingVideo && await fs.pathExists(existingVideo.filePath)) {
      await fs.remove(tempFilePath); // Remove the uploaded file
      return res.json({
        fileUrl: existingVideo.filePath.replace(
          path.join(__dirname, '..'),
          ''
        ), // Adjust file path to be relative
        title: existingVideo.title,
        thumbnail: existingVideo.thumbnail,
        creatorName: existingVideo.creatorName,
      });
    }

    ffmpeg(tempFilePath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .on('end', async () => {
        try {
          await fs.remove(tempFilePath);

          await Video.create({
            videoId,
            format: 'wav',
            filePath: outputFilePath,
            thumbnail,
            creatorName,
            title,
            description,
          });

          await updateTrendingWords(title, stopWords);

          exec('sh ./scripts/syncVideos.sh', (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing sync script: ${error.message}`);
            } else {
              console.log(`Sync script output: ${stdout}`);
              if (stderr) console.error(`Sync script errors: ${stderr}`);
            }
          });

          const fileUrl = `https://server.hogwart.tech/videos/${encodeURIComponent(outputFileName)}`;

          res.json({ success: true, fileUrl, title, thumbnail, creatorName });
        } catch (error) {
          console.error(`Error during post-processing: ${error.message}`);
          res.status(500).json({ error: `Error during post-processing: ${error.message}` });
        }
      })
      .on('error', async (err) => {
        await fs.remove(tempFilePath);
        console.error(`Error converting audio to WAV: ${err.message}`);
        res.status(500).json({ error: `Error converting audio: ${err.message}` });
      })
      .save(outputFilePath);
  } catch (error) {
    console.error(`Error processing uploaded file: ${error.message}`);
    res.status(500).json({ error: `Error processing uploaded file: ${error.message}` });
  }
};
