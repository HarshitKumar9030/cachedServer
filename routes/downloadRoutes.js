const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');

router.get('/download', downloadController.downloadVideo);

module.exports = router;
