const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirs = ['uploads/videos', 'uploads/audios', 'uploads/images', 'uploads/pdfs', 'uploads/presentations', 'uploads/word', 'uploads/excel'];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

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
  'application/vnd.ms-powerpoint': 'presentations',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentations',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
};

const allowedMimeTypes = Object.keys(mimeToFolder);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = mimeToFolder[file.mimetype] || 'pdfs';
    const dest = path.join(process.cwd(), 'uploads', folder);
    cb(null, dest);
  },
  filename: (req, file, cb) => {

    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: video, audio, image, pdf, presentation, document (Word/Excel)`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = upload;
