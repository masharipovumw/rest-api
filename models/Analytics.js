const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  testsCompleted: {
    type: Number,
    default: 0,
  },
  lessonProgress: {
    // Map of materialId -> progress percentage
    type: Map,
    of: Number,
    default: {},
  },
  cognitiveGrowth: [
    {
      date: { type: Date, default: Date.now },
      remember: { type: Number, default: 0 },
      understand: { type: Number, default: 0 },
      apply: { type: Number, default: 0 },
      analyze: { type: Number, default: 0 },
    },
  ],
  // Latest AI-driven Bloom taxonomy scores
  score: {
    type: Number,
    default: 0,
  },
  remember: {
    type: Number,
    default: 0,
  },
  understand: {
    type: Number,
    default: 0,
  },
  apply: {
    type: Number,
    default: 0,
  },
  analyze: {
    type: Number,
    default: 0,
  },
  recommendation: {
    type: String,
    default: '',
  },
  weakTopics: {
    type: [String],
    default: [],
  },
  strongTopics: {
    type: [String],
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Analytics', analyticsSchema);
