const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking a new one.`);
    cluster.fork();
  });

} else {
  const express = require('express');
  const mongoose = require('mongoose');
  const cors = require('cors');
  const path = require('path');
  const helmet = require('helmet');
  require('dotenv').config();

  const downloadRoutes = require('./routes/downloadRoutes');
  const trendRoutes = require('./routes/trendRoutes');
  const audioConversionRoutes = require('./routes/audioConversionRoutes');
  const videoRoutes = require('./routes/videoRoutes');
  const statusRoutes = require('./routes/statusRoutes');

  const app = express();

  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('MongoDB connected');
  }).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

  app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 204
  }));
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
  app.use('/api', videoRoutes);
  app.use('/api', statusRoutes);
  app.use('/api', require('./routes/emailRoutes'));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      console.log('HTTP server closed')
      mongoose.connection.close(false, () => {
        console.log('MongoDb connection closed.');
        process.exit(0);
      });
    });
  });
}
