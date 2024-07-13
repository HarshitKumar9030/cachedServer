const express = require('express');
const router = express.Router();
const { upload, convertAudio } = require('../controllers/audioConversionController');

router.post('/convert', upload.single('file'), convertAudio);

module.exports = router;
