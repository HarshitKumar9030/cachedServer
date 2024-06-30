const TrendingWord = require('../models/TrendingWord');

exports.getTrends = async (req, res) => {
  try {
    const trends = await TrendingWord.find().sort({ count: -1 }).limit(100);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
