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

router.post(
  '/upload',
  verifyJWT,
  roleMiddleware('teacher', 'admin'),
  upload.single('file'),
  uploadMaterial
);

router.get('/', verifyJWT, getMaterials);

router.get('/:id', verifyJWT, getMaterialById);

router.put('/:id', verifyJWT, roleMiddleware('teacher', 'admin'), updateMaterial);

router.delete('/:id', verifyJWT, roleMiddleware('teacher', 'admin'), deleteMaterial);

router.post('/:id/approve', verifyJWT, roleMiddleware('teacher', 'admin'), approveMaterial);

module.exports = router;
