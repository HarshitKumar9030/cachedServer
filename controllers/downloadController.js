const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const ytdl = require('@distube/ytdl-core');
const Video = require('../models/Video');
const { updateTrendingWords, stopWords } = require('../utils/trendingUtils');

// Configuration
const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');
const MAX_STORAGE_SIZE = parseInt(process.env.MAX_STORAGE_SIZE, 10) || 1000000000; // Default to 1GB

// YouTube authentication cookies (you need to implement a way to obtain and update these)
let cookies = [
  // Add your YouTube authentication cookies here
  // Example: { name: 'YSC', value: 'your_cookie_value' }
];

// Function to check if the storage limit is exceeded
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

// Function to refresh authentication cookies
async function refreshAuthCookies() {
  // Implement a method to refresh your YouTube authentication cookies
  // This could involve using a headless browser to log in and capture new cookies
  console.log("Attempting to refresh authentication cookies...");
  // ... implementation details ...
  // Update the cookies variable with new cookies
  // cookies = [ ... new cookies ... ];
}

// Main download function
exports.downloadVideo = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    console.error('Invalid or missing URL.');
    return res.status(400).json({ error: 'Invalid or missing URL.' });
  }

  try {
    console.log(`Valid URL: ${url}`);

    // Check storage size before downloading
    const currentSize = await checkStorageSize(DOWNLOADS_FOLDER);
    if (currentSize >= MAX_STORAGE_SIZE) {
      console.error('Storage limit reached.');
      return res.status(507).json({ error: 'Storage limit reached.' });
    }

    try {
      // Fetch video information using cookies
      let videoInfo;
      try {
        videoInfo = await ytdl.getInfo(url, { cookieJar: cookies });
      } catch (error) {
        if (error.message.includes("Sign in to confirm you're not a bot")) {
          console.log("Authentication challenge detected. Attempting to refresh cookies...");
          await refreshAuthCookies();
          // Retry with new cookies
          videoInfo = await ytdl.getInfo(url, { cookieJar: cookies });
        } else {
          throw error;
        }
      }

      const videoId = videoInfo.videoDetails.videoId;
      const sanitizedTitle = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/ /g, '_');
      const fileName = `${sanitizedTitle}_${videoId}.wav`;
      const filePath = path.join(DOWNLOADS_FOLDER, fileName);
      const thumbnail = videoInfo.videoDetails.thumbnails[0].url;
      const creatorName = videoInfo.videoDetails.author.name;

      // Check if the video already exists in the database
      const existingVideo = await Video.findOne({ videoId, format: 'wav' });
      if (existingVideo && await fs.pathExists(existingVideo.filePath)) {
        return res.json({
          filePath: existingVideo.filePath,
          title: videoInfo.videoDetails.title,
          thumbnail: existingVideo.thumbnail,
          creatorName: existingVideo.creatorName,
        });
      }

      const tempFileName = `${sanitizedTitle}_${videoId}.mp3`;
      const tempFilePath = path.join(DOWNLOADS_FOLDER, tempFileName);

      console.log('Starting audio download:', tempFilePath);

      const downloadStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        cookieJar: cookies,
      });

      const tempFileStream = fs.createWriteStream(tempFilePath);

      await new Promise((resolve, reject) => {
        downloadStream.pipe(tempFileStream);

        downloadStream.on('error', (err) => {
          console.error(`Error downloading audio: ${err.message}`);
          reject(err);
        });

        tempFileStream.on('error', (err) => {
          console.error(`Error writing temp audio file: ${err.message}`);
          reject(err);
        });

        tempFileStream.on('finish', resolve);
      });

      console.log('Audio download finished:', tempFilePath);

      // Use FFmpeg to probe and convert audio
      const downloadResult = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFilePath, async (err, metadata) => {
          if (err) {
            await fs.remove(tempFilePath);
            console.error(`FFmpeg probe error: ${err.message}`);
            return reject(err);
          }

          const audioStream = metadata.streams.find((stream) => stream.codec_type === 'audio');
          if (!audioStream) {
            await fs.remove(tempFilePath);
            console.error('No audio streams found in downloaded audio.');
            return reject(new Error('No audio streams found in downloaded audio.'));
          }

          console.log('Audio stream found, starting conversion to WAV...');

          ffmpeg(tempFilePath)
            .toFormat('wav')
            .audioCodec('pcm_s16le')
            .on('end', async () => {
              try {
                console.log('FFmpeg conversion completed. Saving audio info to DB and cleaning up...');

                await Video.create({
                  videoId,
                  format: 'wav',
                  filePath,
                  thumbnail,
                  creatorName,
                });

                await updateTrendingWords(videoInfo.videoDetails.title, stopWords);

                await fs.remove(tempFilePath);

                exec('sh ./scripts/syncVideos.sh', (error, stdout, stderr) => {
                  if (error) {
                    console.error(`Error executing sync script: ${error.message}`);
                  } else {
                    console.log(`Sync script output: ${stdout}`);
                    if (stderr) console.error(`Sync script errors: ${stderr}`);
                  }
                });

                resolve({
                  filePath,
                  title: videoInfo.videoDetails.title,
                  thumbnail,
                  creatorName,
                });
              } catch (error) {
                console.error(`Error saving audio or updating trends: ${error.message}`);
                reject(error);
              }
            })
            .on('error', async (err) => {
              await fs.remove(tempFilePath);
              console.error(`Error converting audio to WAV: ${err.message}`);
              reject(err);
            })
            .save(filePath);
        });
      });

      return res.json(downloadResult);
    } catch (error) {
      console.error(`Error during download process: ${error.message}`);
      return res.status(500).json({ error: `Error during download process: ${error.message}` });
    }
  } catch (error) {
    console.error(`Server error: ${error.message}`);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};