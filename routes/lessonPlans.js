const router = require('express').Router();
const {
  submitLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  gradeLessonPlan,
} = require('../controllers/lessonPlanController');
const { verifyJWT, roleMiddleware } = require('../middleware/auth');

router.use(verifyJWT);

router.post('/', roleMiddleware('student'), submitLessonPlan);

router.get('/', getLessonPlans);

router.get('/:id', getLessonPlanById);

router.patch('/:id/grade', roleMiddleware('teacher', 'admin'), gradeLessonPlan);

module.exports = router;
