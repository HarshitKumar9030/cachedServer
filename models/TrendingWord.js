const mongoose = require('mongoose');

const trendingWordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  count: { type: Number, default: 1 },
});

const TrendingWord = mongoose.model('TrendingWord', trendingWordSchema);

module.exports = TrendingWord;
