const express = require('express');
const router = express.Router();
const getVideosController = require('../controllers/getVideosController');

router.get('/videos', getVideosController.getVideos); 

module.exports = router;
