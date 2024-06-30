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
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', downloadRoutes);
app.use('/api', trendRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
