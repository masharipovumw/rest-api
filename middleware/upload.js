const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads/videos', 'uploads/audios', 'uploads/images', 'uploads/pdfs', 'uploads/presentations'];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Map mime types to destination folders
const mimeToFolder = {
  'video/mp4': 'videos',
  'video/avi': 'videos',
  'video/mkv': 'videos',
  'video/webm': 'videos',
  'video/quicktime': 'videos',
  'audio/mpeg': 'audios',
  'audio/wav': 'audios',
  'audio/ogg': 'audios',
  'audio/mp3': 'audios',
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/webp': 'images',
  'image/svg+xml': 'images',
  'application/pdf': 'pdfs',
  'application/vnd.ms-powerpoint': 'presentations', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentations', // .pptx
};

// Allowed mime types
const allowedMimeTypes = Object.keys(mimeToFolder);

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = mimeToFolder[file.mimetype] || 'pdfs';
    const dest = path.join(process.cwd(), 'uploads', folder);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: video, audio, image, pdf, presentation`), false);
  }
};

// Multer instance with 50MB limit (covers video files)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

module.exports = upload;
