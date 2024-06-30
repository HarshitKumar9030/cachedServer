const express = require('express');
const router = express.Router();
const trendController = require('../controllers/trendController');

router.get('/trends', trendController.getTrends);

module.exports = router;
