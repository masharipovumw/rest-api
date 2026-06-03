const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['single', 'multiple', 'matching', 'open'],
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    default: [],
  },
  correctAnswer: {
    // For single: string, for multiple: array, for open: null
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  matchPairs: {
    // For matching type: [{ left: "...", right: "..." }]
    type: [{ left: String, right: String }],
    default: [],
  },
  points: {
    type: Number,
    default: 1,
  },
});

const testSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true,
  },
  timer: {
    // Time limit in minutes, 0 = no limit
    type: Number,
    default: 0,
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Test', testSchema);
