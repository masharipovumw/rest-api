const router = require('express').Router();
const {
  submitLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  gradeLessonPlan,
} = require('../controllers/lessonPlanController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

// All lesson plan routes require authentication
router.use(verifyJWT);

// POST /api/lesson-plans (student)
router.post('/', roleMiddleware('student'), submitLessonPlan);

// GET /api/lesson-plans (filtered by role)
router.get('/', getLessonPlans);

// GET /api/lesson-plans/:id
router.get('/:id', getLessonPlanById);

// PATCH /api/lesson-plans/:id/grade (teacher/admin)
router.patch('/:id/grade', roleMiddleware('teacher', 'admin'), gradeLessonPlan);

module.exports = router;
