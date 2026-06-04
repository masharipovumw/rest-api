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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  }
});

router.use(verifyJWT);

router.post('/analyze-material', roleMiddleware('teacher', 'admin'), analyzeMaterial);

router.post('/generate-test', roleMiddleware('teacher', 'admin'), generateTest);

router.post('/evaluate-answer', evaluateAnswer);

router.post('/recommendations', recommendations);

router.post('/chat', chat);

router.post('/evaluate-lesson-plan', roleMiddleware('teacher', 'admin'), evaluateLessonPlan);

router.post('/global-chat', upload.array('files', 3), globalChat);

module.exports = router;
