const LessonPlan = require('../models/LessonPlan');
const Material = require('../models/Material');
const { success, error } = require('../utils/response');

/**
 * POST /api/lesson-plans
 * Student submits a lesson plan
 */
const submitLessonPlan = async (req, res) => {
  try {
    const { materialId, title, content } = req.body;

    if (!title || !content) {
      return error(res, 'Title and content are required.', 400);
    }

    // Verify material exists if provided
    if (materialId) {
      const material = await Material.findById(materialId);
      if (!material) {
        return error(res, 'Material not found.', 404);
      }
    }

    const lessonPlan = await LessonPlan.create({
      studentId: req.user._id,
      materialId: materialId || null,
      title,
      content,
    });

    return success(res, lessonPlan, 'Lesson plan submitted successfully', 201);
  } catch (err) {
    console.error('Submit lesson plan error:', err);
    return error(res, 'Failed to submit lesson plan.');
  }
};

/**
 * GET /api/lesson-plans
 * List lesson plans (with optional filters)
 */
const getLessonPlans = async (req, res) => {
  try {
    const { studentId, status, page = 1, limit = 20 } = req.query;

    const filter = {};

    // Students can only see their own lesson plans
    if (req.user.role === 'student') {
      filter.studentId = req.user._id;
    } else if (studentId) {
      filter.studentId = studentId;
    }

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lessonPlans = await LessonPlan.find(filter)
      .populate('studentId', 'name email')
      .populate('materialId', 'title topic')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LessonPlan.countDocuments(filter);

    return success(res, {
      lessonPlans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get lesson plans error:', err);
    return error(res, 'Failed to get lesson plans.');
  }
};

/**
 * GET /api/lesson-plans/:id
 * Get single lesson plan
 */
const getLessonPlanById = async (req, res) => {
  try {
    const lessonPlan = await LessonPlan.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('materialId', 'title topic');

    if (!lessonPlan) {
      return error(res, 'Lesson plan not found.', 404);
    }

    // Students can only see their own
    if (req.user.role === 'student' && lessonPlan.studentId._id.toString() !== req.user._id.toString()) {
      return error(res, 'Access denied.', 403);
    }

    return success(res, lessonPlan);
  } catch (err) {
    console.error('Get lesson plan error:', err);
    return error(res, 'Failed to get lesson plan.');
  }
};

/**
 * PATCH /api/lesson-plans/:id/grade
 * Teacher grades a lesson plan (teacher/admin only)
 */
const gradeLessonPlan = async (req, res) => {
  try {
    const { teacherGrade, teacherFeedback } = req.body;

    if (teacherGrade === undefined || teacherGrade === null) {
      return error(res, 'teacherGrade is required.', 400);
    }

    if (teacherGrade < 0 || teacherGrade > 100) {
      return error(res, 'teacherGrade must be between 0 and 100.', 400);
    }

    const lessonPlan = await LessonPlan.findById(req.params.id);
    if (!lessonPlan) {
      return error(res, 'Lesson plan not found.', 404);
    }

    lessonPlan.teacherGrade = teacherGrade;
    lessonPlan.teacherFeedback = teacherFeedback || null;
    lessonPlan.status = 'graded';
    await lessonPlan.save();

    return success(res, lessonPlan, 'Lesson plan graded successfully');
  } catch (err) {
    console.error('Grade lesson plan error:', err);
    return error(res, 'Failed to grade lesson plan.');
  }
};

module.exports = {
  submitLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  gradeLessonPlan,
};
