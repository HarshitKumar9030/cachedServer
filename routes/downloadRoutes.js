const express = require('express');
const router = express.Router();
const download = require('../controllers/downloadController');
const multer = require('multer');

// Set up multer here again if needed for file upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Define route, no logic here, just calling the controller method
router.post('/download', upload.single('file'), download.convertToWav);

module.exports = router;
