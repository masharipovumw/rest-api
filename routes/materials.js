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

// POST /api/materials/upload (teacher/admin — with file upload)
router.post(
  '/upload',
  verifyJWT,
  roleMiddleware('teacher', 'admin'),
  upload.single('file'),
  uploadMaterial
);

// GET /api/materials (all authenticated users)
router.get('/', verifyJWT, getMaterials);

// GET /api/materials/:id (all authenticated users)
router.get('/:id', verifyJWT, getMaterialById);

// PUT /api/materials/:id (teacher/admin)
router.put('/:id', verifyJWT, roleMiddleware('teacher', 'admin'), updateMaterial);

// DELETE /api/materials/:id (teacher/admin)
router.delete('/:id', verifyJWT, roleMiddleware('teacher', 'admin'), deleteMaterial);

// POST /api/materials/:id/approve (teacher/admin)
router.post('/:id/approve', verifyJWT, roleMiddleware('teacher', 'admin'), approveMaterial);

module.exports = router;
