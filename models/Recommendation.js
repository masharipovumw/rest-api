const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recommendations: [
    {
      topic: { type: String, required: true },
      message: { type: String, required: true },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      type: {
        type: String,
        enum: ['review', 'practice', 'advance', 'remedial'],
        default: 'review',
      },
    },
  ],
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Recommendation', recommendationSchema);
