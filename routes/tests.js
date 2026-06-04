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

router.use(verifyJWT);

router.post('/', roleMiddleware('teacher', 'admin'), createTest);

router.get('/', getTests);

router.post('/submit', roleMiddleware('student'), submitTest);

router.get('/submissions/all', roleMiddleware('teacher', 'admin'), getSubmissions);

router.put('/submissions/:id/review', roleMiddleware('teacher', 'admin'), reviewSubmission);

router.get('/:id', getTestById);

router.put('/:id', roleMiddleware('teacher', 'admin'), updateTest);

router.delete('/:id', roleMiddleware('teacher', 'admin'), deleteTest);

module.exports = router;
