const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const { pipeline } = require('stream');
const ytdl = require('@distube/ytdl-core');
const Video = require('../models/Video');
const { updateTrendingWords, stopWords } = require('../utils/trendingUtils');

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');
const MAX_STORAGE_SIZE = parseInt(process.env.MAX_STORAGE_SIZE, 10);

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

    if (!url) {
      console.error('Invalid or missing URL:', url);
      return res.status(400).json({ error: 'Invalid or missing URL' });
    }

    console.log('Valid URL:', url);

    const videoInfo = await ytdl.getInfo(url);
    const videoId = videoInfo.videoDetails.videoId;
    const title = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/ /g, '_');
    const filePath = path.join(DOWNLOADS_FOLDER, `${title}.wav`);
    const thumbnail = videoInfo.videoDetails.thumbnails[0].url; // Get the thumbnail URL
    const creatorName = videoInfo.videoDetails.author.name; // Get the creator name

    const existingVideo = await Video.findOne({ videoId, format: 'wav' });
    if (existingVideo) {
      return res.json({ filePath: existingVideo.filePath, title, thumbnail: existingVideo.thumbnail, creatorName: existingVideo.creatorName });
    }

    const currentSize = await checkStorageSize(DOWNLOADS_FOLDER);
    if (currentSize >= MAX_STORAGE_SIZE) {
      console.error('Storage limit reached:', currentSize);
      return res.status(507).json({ error: 'Storage limit reached' });
    }

    const tempFilePath = path.join(DOWNLOADS_FOLDER, `${title}.mp3`);

    console.log('Starting audio download to:', tempFilePath);

    const downloadStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
    const tempFileStream = fs.createWriteStream(tempFilePath);

    downloadStream.pipe(tempFileStream);

    tempFileStream.on('finish', () => {
      console.log('Audio download finished:', tempFilePath);

      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        if (err) {
          fs.removeSync(tempFilePath);
          console.error(`FFmpeg probe error: ${err.message}`);
          return res.status(500).json({ error: `FFmpeg probe error: ${err.message}` });
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          fs.removeSync(tempFilePath);
          console.error('No audio streams found in downloaded audio');
          return res.status(500).json({ error: 'No audio streams found in downloaded audio' });
        }

        console.log('Audio stream found:', audioStream);

        const ffmpegCommand = ffmpeg(tempFilePath)
          .toFormat('wav')
          .audioCodec('pcm_s16le');

        const wavStream = fs.createWriteStream(filePath);

        pipeline(ffmpegCommand, wavStream, async (err) => {
          if (err) {
            fs.removeSync(tempFilePath);
            console.error(`Error converting audio to WAV: ${err.message}`);
            return res.status(500).json({ error: `Error converting audio to WAV: ${err.message}` });
          }

          try {
            console.log('FFmpeg conversion completed, saving audio info to DB and cleaning up...');
            await Video.create({ videoId, format: 'wav', filePath, thumbnail, creatorName });
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

            res.json({ filePath, title, thumbnail, creatorName });
          } catch (error) {
            console.error(`Error saving audio or updating trends: ${error.message}`);
            res.status(500).json({ error: `Error saving audio or updating trends: ${error.message}` });
          }
        });
      });
    });

    downloadStream.on('error', (err) => {
      console.error(`Error downloading audio: ${err.message}`);
      res.status(500).json({ error: `Error downloading audio: ${err.message}` });
    });

  } catch (error) {
    console.error(`Server error: ${error.message}`);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};
