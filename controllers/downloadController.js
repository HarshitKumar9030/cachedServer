const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const {
  exec
} = require('child_process');
const ytdl = require('@distube/ytdl-core');
const {
  ProxyAgent
} = require('undici');
const Video = require('../models/Video');
const {
  updateTrendingWords,
  stopWords
} = require('../utils/trendingUtils');

const proxyUrl = 'http://142.93.6.218:80';

const DOWNLOADS_FOLDER = path.join(__dirname, '../videos');
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

exports.downloadVideo = async (req, res) => {
  try {
    const {
      url
    } = req.body;

    if (!url) {
      console.error('Invalid or missing URL:', url);
      return res.status(400).json({
        error: 'Invalid or missing URL'
      });
    }

    console.log('Valid URL:', url);

    const dispatcher = new ProxyAgent(proxyUrl);
    const videoInfo = await ytdl.getInfo(url, {
      requestOptions: {
        dispatcher
      }
    });
    const videoId = videoInfo.videoDetails.videoId;
    const sanitizedTitle = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/ /g, '_');
    const fileName = `${sanitizedTitle}_${videoId}.wav`;
    const filePath = path.join(DOWNLOADS_FOLDER, fileName);
    const thumbnail = videoInfo.videoDetails.thumbnails[0].url;
    const creatorName = videoInfo.videoDetails.author.name;

    const existingVideo = await Video.findOne({
      videoId,
      format: 'wav'
    });
    if (existingVideo && await fs.pathExists(existingVideo.filePath)) {
      return res.json({
        filePath: existingVideo.filePath,
        title: videoInfo.videoDetails.title,
        thumbnail: existingVideo.thumbnail,
        creatorName: existingVideo.creatorName
      });
    }

    const currentSize = await checkStorageSize(DOWNLOADS_FOLDER);
    if (currentSize >= MAX_STORAGE_SIZE) {
      console.error('Storage limit reached:', currentSize);
      return res.status(507).json({
        error: 'Storage limit reached'
      });
    }

    const tempFileName = `${sanitizedTitle}_${videoId}.mp3`;
    const tempFilePath = path.join(DOWNLOADS_FOLDER, tempFileName);

    console.log('Starting audio download to:', tempFilePath);

    const downloadStream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      requestOptions: {
        dispatcher
      }
    });

    const tempFileStream = fs.createWriteStream(tempFilePath);

    downloadStream.pipe(tempFileStream);

    downloadStream.on('error', (err) => {
      console.error(`Error downloading audio: ${err.message}`);
      res.status(500).json({
        error: `Error downloading audio: ${err.message}`
      });
    });

    tempFileStream.on('error', (err) => {
      console.error(`Error writing temp audio file: ${err.message}`);
      res.status(500).json({
        error: `Error writing temp audio file: ${err.message}`
      });
    });

    tempFileStream.on('finish', () => {
      console.log('Audio download finished:', tempFilePath);

      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        if (err) {
          fs.removeSync(tempFilePath);
          console.error(`FFmpeg probe error: ${err.message}`);
          return res.status(500).json({
            error: `FFmpeg probe error: ${err.message}`
          });
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          fs.removeSync(tempFilePath);
          console.error('No audio streams found in downloaded audio');
          return res.status(500).json({
            error: 'No audio streams found in downloaded audio'
          });
        }

        console.log('Audio stream found:', audioStream);

        const ffmpegCommand = ffmpeg(tempFilePath)
          .toFormat('wav')
          .audioCodec('pcm_s16le')
          .on('end', async () => {
            try {
              console.log('FFmpeg conversion completed, saving audio info to DB and cleaning up...');
              await Video.create({
                videoId,
                format: 'wav',
                filePath,
                thumbnail,
                creatorName
              });
              await updateTrendingWords(videoInfo.videoDetails.title, stopWords);
              fs.removeSync(tempFilePath);

              exec('sh ./scripts/syncVideos.sh', (error, stdout, stderr) => {
                if (error) {
                  console.error(`Error executing sync script: ${error.message}`);
                  return;
                }
                console.log(`Sync script output: ${stdout}`);
                if (stderr) console.error(`Sync script errors: ${stderr}`);
              });

              res.json({
                filePath,
                title: videoInfo.videoDetails.title,
                thumbnail,
                creatorName
              });
            } catch (error) {
              console.error(`Error saving audio or updating trends: ${error.message}`);
              res.status(500).json({
                error: `Error saving audio or updating trends: ${error.message}`
              });
            }
          })
          .on('error', (err) => {
            fs.removeSync(tempFilePath);
            console.error(`Error converting audio to WAV: ${err.message}`);
            res.status(500).json({
              error: `Error converting audio to WAV: ${err.message}`
            });
          })
          .save(filePath);
      });
    });
  } catch (error) {
    console.error(`Server error: ${error.message}`);
    res.status(500).json({
      error: `Server error: ${error.message}`
    });
  }
};