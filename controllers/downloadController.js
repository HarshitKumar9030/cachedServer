const fs = require('fs-extra');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const { pipeline } = require('stream');
const Video = require('../models/Video');
const { updateTrendingWords, stopWords } = require('../utils/trendingUtils');

const DOWNLOADS_FOLDER = '/home/azureuser/cachedServer/videos';
const MAX_STORAGE_SIZE = parseInt(process.env.MAX_STORAGE_SIZE, 10);

// Set the path to the ffmpeg and ffprobe binaries
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');  // Update this path if necessary
ffmpeg.setFfprobePath('/usr/bin/ffprobe');  // Update this path if necessary

async function checkStorageSize(folder) {
  try {
    const { size } = await fs.stat(folder);
    return size;
  } catch (error) {
    throw new Error(`Error checking storage size: ${error.message}`);
  }
}

exports.downloadVideo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
      console.log('Invalid or missing URL:', url);
      return res.status(400).json({ error: 'Invalid or missing URL' });
    }

    console.log('Valid URL:', url);
    const videoInfo = await ytdl.getInfo(url);
    const videoId = videoInfo.videoDetails.videoId;
    const title = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/ /g, '_');
    const filePath = path.join(DOWNLOADS_FOLDER, `${title}.wav`);
    console.log('Downloading video:', title);

    const existingVideo = await Video.findOne({ videoId, format: 'wav' });
    if (existingVideo) {
      return res.json({ filePath: existingVideo.filePath, title });
    }

    const currentSize = await checkStorageSize(DOWNLOADS_FOLDER);
    if (currentSize >= MAX_STORAGE_SIZE) {
      console.log('Storage limit reached:', currentSize);
      return res.status(507).json({ error: 'Storage limit reached' });
    }

    const tempFilePath = path.join(DOWNLOADS_FOLDER, `${title}.mp4`);
    console.log('Temporary file path:', tempFilePath);

    const videoStream = ytdl(url, { quality: 'highest' });
    const fileStream = fs.createWriteStream(tempFilePath);

    videoStream.pipe(fileStream);

    fileStream.on('finish', async () => {
      console.log('Video downloaded:', tempFilePath);

      // Probe the video to check streams
      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        if (err) {
          fs.removeSync(tempFilePath);
          console.error(`FFmpeg probe error: ${err.message}`);
          return res.status(500).json({ error: `FFmpeg probe error: ${err.message}` });
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          fs.removeSync(tempFilePath);
          console.error('No audio streams found in downloaded video');
          return res.status(500).json({ error: 'No audio streams found in downloaded video' });
        }

        console.log('Audio stream found:', audioStream);

        const ffmpegCommand = ffmpeg(tempFilePath)
          .inputOptions('-f mp4')  // Explicitly specify the input format
          .toFormat('wav')
          .audioCodec('pcm_s16le');

        const wavStream = fs.createWriteStream(filePath);

        pipeline(ffmpegCommand, wavStream, async (err) => {
          if (err) {
            fs.removeSync(tempFilePath);
            console.error(`Error converting video to WAV: ${err.message}`);
            return res.status(500).json({ error: `Error converting video to WAV: ${err.message}` });
          }

          try {
            console.log('FFmpeg conversion completed, saving video info to DB and cleaning up...');
            await Video.create({ videoId, format: 'wav', filePath });
            await updateTrendingWords(title, stopWords);
            fs.removeSync(tempFilePath);

            exec('sh ./scripts/syncVideos.sh', (error, stdout, stderr) => {
              if (error) {
                console.error(`Error executing sync script: ${error.message}`);
                return;
              }
              console.log(`Sync script output: ${stdout}`);
              console.error(`Sync script errors: ${stderr}`);
            });

            res.json({ filePath, title });
          } catch (error) {
            console.error(`Error saving video or updating trends: ${error.message}`);
            res.status(500).json({ error: `Error saving video or updating trends: ${error.message}` });
          }
        });
      });
    });

    fileStream.on('error', (err) => {
      fs.removeSync(tempFilePath);
      console.error(`Error downloading video: ${err.message}`);
      res.status(500).json({ error: `Error downloading video: ${err.message}` });
    });
  } catch (error) {
    console.error(`Server error: ${error.message}`);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};
