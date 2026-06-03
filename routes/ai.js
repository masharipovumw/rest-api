const router = require('express').Router();
const multer = require('multer');
const {
  analyzeMaterial,
  generateTest,
  evaluateAnswer,
  recommendations,
  evaluateLessonPlan,
  chat,
  globalChat
} = require('../controllers/aiController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

// Setup multer for memory storage (for passing directly to AI without saving to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file (handled more specifically in controller for total size)
    files: 3 // Max 3 files
  }
});

// All AI routes require authentication
router.use(verifyJWT);

// POST /api/ai/analyze-material (teacher/admin)
router.post('/analyze-material', roleMiddleware('teacher', 'admin'), analyzeMaterial);

// POST /api/ai/generate-test (teacher/admin)
router.post('/generate-test', roleMiddleware('teacher', 'admin'), generateTest);

// POST /api/ai/evaluate-answer (any authenticated user)
router.post('/evaluate-answer', evaluateAnswer);

// POST /api/ai/recommendations (any authenticated user)
router.post('/recommendations', recommendations);

// POST /api/ai/chat (any authenticated user)
router.post('/chat', chat);

// POST /api/ai/evaluate-lesson-plan (teacher/admin)
router.post('/evaluate-lesson-plan', roleMiddleware('teacher', 'admin'), evaluateLessonPlan);

// POST /api/ai/global-chat (any authenticated user) - allows up to 3 files
router.post('/global-chat', upload.array('files', 3), globalChat);

module.exports = router;
