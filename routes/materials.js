const router = require('express').Router();
const {
  uploadMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  approveMaterial,
} = require('../controllers/materialController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Wrap multer so its errors are caught and returned as 400 JSON,
// instead of falling through to the global error handler.
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Maximum size is 50MB.'
          : err.message || 'File upload failed.';
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

router.post(
  '/upload',
  verifyJWT,
  roleMiddleware('teacher', 'admin'),
  handleUpload,
  uploadMaterial
);

router.get('/', verifyJWT, getMaterials);

router.get('/:id', verifyJWT, getMaterialById);

router.put('/:id', verifyJWT, roleMiddleware('teacher', 'admin'), updateMaterial);

router.delete('/:id', verifyJWT, roleMiddleware('teacher', 'admin'), deleteMaterial);

router.post('/:id/approve', verifyJWT, roleMiddleware('teacher', 'admin'), approveMaterial);

module.exports = router;
