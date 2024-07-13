const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');

router.post('/download', downloadController.downloadVideo);

module.exports = router;
