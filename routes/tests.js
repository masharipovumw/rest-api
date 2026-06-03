const router = require('express').Router();
const {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
  submitTest,
  getSubmissions,
  reviewSubmission,
} = require('../controllers/testController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

// All test routes require authentication
router.use(verifyJWT);

// POST /api/tests (teacher/admin)
router.post('/', roleMiddleware('teacher', 'admin'), createTest);

// GET /api/tests (all authenticated)
router.get('/', getTests);

// GET /api/tests/:id (all authenticated)
router.get('/:id', getTestById);

// PUT /api/tests/:id (teacher/admin)
router.put('/:id', roleMiddleware('teacher', 'admin'), updateTest);

// DELETE /api/tests/:id (teacher/admin)
router.delete('/:id', roleMiddleware('teacher', 'admin'), deleteTest);

// POST /api/tests/submit (student)
router.post('/submit', roleMiddleware('student'), submitTest);

// GET /api/tests/submissions (teacher/admin) — all submissions for this teacher's tests
router.get('/submissions/all', roleMiddleware('teacher', 'admin'), getSubmissions);

// PUT /api/tests/submissions/:id/review (teacher/admin) - approve/reject submission
router.put('/submissions/:id/review', roleMiddleware('teacher', 'admin'), reviewSubmission);

module.exports = router;
