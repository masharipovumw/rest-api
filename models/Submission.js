const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
  },
  answers: [
    {
      questionIndex: Number,
      answer: mongoose.Schema.Types.Mixed, // String, Array, or Object depending on question type
    },
  ],
  score: {
    type: Number,
    default: 0,
  },
  maxScore: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  aiFeedback: {
    type: String,
    default: null,
  },
  bloomAnalysis: {
    remember: { type: Number, default: 0 },
    understand: { type: Number, default: 0 },
    apply: { type: Number, default: 0 },
    analyze: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  }
});

module.exports = mongoose.model('Submission', submissionSchema);
