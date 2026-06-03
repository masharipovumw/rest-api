const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'image', 'pdf', 'text', 'pptx', 'ppt', 'presentation', 'doc', 'docx', 'xls', 'xlsx'],
    required: [true, 'Material type is required'],
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
  },
  textContent: {
    type: String,
    default: null,
  },
  fileUrl: {
    type: String,
    default: null,
  },
  convertedPdfUrl: {
    type: String,
    default: null,
  },
  fileName: {
    type: String,
    default: null,
  },
  mimeType: {
    type: String,
    default: null,
  },
  size: {
    type: Number,
    default: null,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  aiStatus: {
    type: String,
    enum: ['pending', 'analyzed', 'error'],
    default: 'pending',
  },
  approved: {
    type: Boolean,
    default: false,
  },
  aiAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Material', materialSchema);
