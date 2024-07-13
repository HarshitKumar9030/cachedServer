const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');
const getVideosController = require('../controllers/getVideosController');

router.post('/download', downloadController.downloadVideo);
router.get('/videos', getVideosController.getVideos); 

module.exports = router;
