const mongoose = require('mongoose');

const lessonPlanSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Lesson plan title is required'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  aiEvaluation: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  teacherGrade: {
    type: Number,
    default: null,
    min: 0,
    max: 100,
  },
  teacherFeedback: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['submitted', 'ai_evaluated', 'graded'],
    default: 'submitted',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);
