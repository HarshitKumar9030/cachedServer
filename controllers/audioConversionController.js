const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const multer = require('multer');
const { exec } = require('child_process');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const convertAudio = (req, res) => {
  const file = req.file;
  const outputFormat = req.body.outputFormat;
  const outputPath = `./converted/${Date.now()}.${outputFormat}`;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  let command = ffmpeg(file.path);

  if (outputFormat === 'wav') {
    command = command.audioCodec('pcm_s32le').audioChannels(2).audioFrequency(44100);
  }

  command
    .toFormat(outputFormat)
    .on('end', () => {
      res.json({ success: true, url: outputPath.replace('./', '/') });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ success: false, message: 'Conversion failed' });
    })
    .save(outputPath);
};

module.exports = { upload, convertAudio };
