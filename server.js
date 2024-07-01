const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const downloadRoutes = require('./routes/downloadRoutes');
const trendRoutes = require('./routes/trendRoutes');

const app = express();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const corsOptions = {
  origin: '*', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  preflightContinue: false,
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Change * to specific origin in production
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});


const DOWNLOADS_FOLDER = path.join(__dirname, '/home/harshit/cachedServer/videos');
app.use('/videos', express.static(DOWNLOADS_FOLDER));

app.use('/api', downloadRoutes);
app.use('/api', trendRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
