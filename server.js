const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  const express = require('express');
  const mongoose = require('mongoose');
  const cors = require('cors');
  const path = require('path');
  require('dotenv').config();

  const downloadRoutes = require('./routes/downloadRoutes');
  const trendRoutes = require('./routes/trendRoutes');
  const audioConversionRoutes = require('./routes/audioConversionRoutes');

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
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });

  const DOWNLOADS_FOLDER = path.join(__dirname, 'videos');
  app.use('/videos', express.static(DOWNLOADS_FOLDER));
  app.use('/uploads', express.static('uploads')); 
  app.use('/converted', express.static('converted')); 

  app.use('/api', downloadRoutes);
  app.use('/api', trendRoutes);
  app.use('/api', audioConversionRoutes);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`);
  });
}
