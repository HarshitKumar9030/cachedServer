const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/emailController');

router.post('/sendMail', sendContactEmail);

module.exports = router;
