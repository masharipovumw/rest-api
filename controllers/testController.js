const Test = require('../models/Test');
const Submission = require('../models/Submission');
const Analytics = require('../models/Analytics');
const { success, error } = require('../utils/response');
const notificationService = require('../services/notificationService');

/**
 * POST /api/tests
 * Create a new test (teacher/admin only)
 */
const createTest = async (req, res) => {
  try {
    const { materialId, title, timer, questions } = req.body;

    if (!title || !questions || !questions.length) {
      return error(res, 'Title and at least one question are required.', 400);
    }

    const test = await Test.create({
      materialId: materialId || null,
      title,
      timer: timer || 0,
      questions,
      createdBy: req.user._id,
    });

    return success(res, test, 'Test created successfully', 201);
  } catch (err) {
    console.error('Create test error:', err);
    return error(res, 'Failed to create test.');
  }
};

/**
 * GET /api/tests
 * List all tests
 */
const getTests = async (req, res) => {
  try {
    const { materialId, independentOnly, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (materialId) filter.materialId = materialId;
    if (independentOnly === 'true') filter.materialId = null;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tests = await Test.find(filter)
      .populate('createdBy', 'name email')
      .populate('materialId', 'title topic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Test.countDocuments(filter);

    return success(res, {
      tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get tests error:', err);
    return error(res, 'Failed to get tests.');
  }
};

/**
 * GET /api/tests/:id
 * Get single test by ID
 */
const getTestById = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('materialId', 'title topic');

    if (!test) {
      return error(res, 'Test not found.', 404);
    }

    return success(res, test);
  } catch (err) {
    console.error('Get test error:', err);
    return error(res, 'Failed to get test.');
  }
};

/**
 * PUT /api/tests/:id
 * Update test (teacher/admin only)
 */
const updateTest = async (req, res) => {
  try {
    const { title, timer, questions } = req.body;

    const test = await Test.findById(req.params.id);
    if (!test) {
      return error(res, 'Test not found.', 404);
    }

    if (test.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return error(res, 'Not authorized to update this test.', 403);
    }

    if (title) test.title = title;
    if (timer !== undefined) test.timer = timer;
    if (questions) test.questions = questions;

    await test.save();

    return success(res, test, 'Test updated successfully');
  } catch (err) {
    console.error('Update test error:', err);
    return error(res, 'Failed to update test.');
  }
};

/**
 * DELETE /api/tests/:id
 * Delete test (teacher/admin only)
 */
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return error(res, 'Test not found.', 404);
    }

    if (test.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return error(res, 'Not authorized to delete this test.', 403);
    }

    // Delete all submissions associated with this test to free up space
    await Submission.deleteMany({ testId: req.params.id });

    await Test.findByIdAndDelete(req.params.id);

    return success(res, null, 'Test deleted successfully');
  } catch (err) {
    console.error('Delete test error:', err);
    return error(res, 'Failed to delete test.');
  }
};

/**
 * POST /api/tests/submit
 * Student submits test answers
 * Auto-grades objective questions, stores for AI evaluation on open questions
 */
const submitTest = async (req, res) => {
  try {
    const { testId, answers } = req.body;

    if (!testId || !answers) {
      return error(res, 'testId and answers are required.', 400);
    }

    const test = await Test.findById(testId);
    if (!test) {
      return error(res, 'Test not found.', 404);
    }

    // Auto-grade objective questions
    let score = 0;
    let maxScore = 0;

    test.questions.forEach((question, index) => {
      const studentAnswer = answers.find((a) => a.questionIndex === index);
      maxScore += question.points || 1;

      if (!studentAnswer) return;

      if (question.type === 'single') {
        if (studentAnswer.answer === question.correctAnswer) {
          score += question.points || 1;
        }
      } else if (question.type === 'multiple') {
        const correct = question.correctAnswer || [];
        const student = studentAnswer.answer || [];
        if (
          Array.isArray(correct) &&
          Array.isArray(student) &&
          correct.length === student.length &&
          correct.every((val) => student.includes(val))
        ) {
          score += question.points || 1;
        }
      } else if (question.type === 'matching') {
        const pairs = question.matchPairs || [];
        const studentPairs = studentAnswer.answer || [];
        let allCorrect = true;
        pairs.forEach((pair, i) => {
          if (!studentPairs[i] || studentPairs[i].right !== pair.right) {
            allCorrect = false;
          }
        });
        if (allCorrect && pairs.length > 0) {
          score += question.points || 1;
        }
      }
      // 'open' questions are not auto-graded — they go to AI evaluation
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const submission = await Submission.create({
      studentId: req.user._id,
      testId,
      answers,
      score,
      maxScore,
      percentage,
    });

    // Update student analytics
    await updateStudentAnalytics(req.user._id, percentage, test);

    return success(res, submission, 'Test submitted successfully', 201);
  } catch (err) {
    console.error('Submit test error:', err);
    return error(res, 'Failed to submit test.');
  }
};

/**
 * Helper: Update student analytics after submission
 */
async function updateStudentAnalytics(studentId, percentage, test) {
  try {
    let analytics = await Analytics.findOne({ studentId });

    if (!analytics) {
      analytics = await Analytics.create({ studentId });
    }

    analytics.testsCompleted += 1;
    analytics.totalScore = Math.round(
      ((analytics.totalScore * (analytics.testsCompleted - 1)) + percentage) / analytics.testsCompleted
    );

    // Track lesson progress if test is linked to a material
    if (test.materialId) {
      analytics.lessonProgress.set(test.materialId.toString(), 100);
    }

    analytics.lastUpdated = new Date();
    await analytics.save();
  } catch (err) {
    console.error('Update analytics error:', err);
  }
}

/**
 * GET /api/tests/submissions/all
 * Get all submissions for the authenticated teacher's tests
 * Returns real student answers and AI feedback for review
 */
const getSubmissions = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get all tests created by this teacher
    const teacherTests = await Test.find({ createdBy: teacherId }).select('_id title questions');
    const testIds = teacherTests.map(t => t._id);

    if (testIds.length === 0) {
      return success(res, { submissions: [] });
    }

    // Get all submissions for those tests, populated with student info
    const submissions = await Submission.find({ testId: { $in: testIds } })
      .populate('studentId', 'name email')
      .populate('testId', 'title questions')
      .sort({ submittedAt: -1 });

    return success(res, { submissions }, 'Submissions retrieved successfully');
  } catch (err) {
    console.error('Get submissions error:', err);
    return error(res, 'Failed to retrieve submissions.');
  }
};

/**
 * PUT /api/tests/submissions/:id/review
 * Update status of submission (approved/rejected)
 */
const reviewSubmission = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return error(res, 'Invalid status. Must be approved or rejected.', 400);
    }
    
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return error(res, 'Submission not found.', 404);
    }
    
    submission.status = status;
    await submission.save();

    // --- Auto-trigger notifications and analytics update ---
    const studentId = submission.studentId;

    // 1. Notify: teacher review completed
    notificationService.notifyTeacherReview(studentId, status).catch(err =>
      console.error('Teacher review notification error:', err)
    );

    // 2. Update analytics with Bloom scores from submission (if AI evaluated)
    if (submission.bloomAnalysis) {
      try {
        let analytics = await Analytics.findOne({ studentId });
        if (!analytics) {
          analytics = await Analytics.create({ studentId });
        }
        analytics.remember = submission.bloomAnalysis.remember || analytics.remember;
        analytics.understand = submission.bloomAnalysis.understand || analytics.understand;
        analytics.apply = submission.bloomAnalysis.apply || analytics.apply;
        analytics.analyze = submission.bloomAnalysis.analyze || analytics.analyze;
        analytics.score = submission.percentage;
        analytics.recommendation = submission.bloomAnalysis.feedback || analytics.recommendation;
        analytics.lastUpdated = new Date();
        await analytics.save();

        // 3. Notify: final result generated
        notificationService.notifyFinalResult(studentId, submission.percentage).catch(err =>
          console.error('Final result notification error:', err)
        );
      } catch (analyticsErr) {
        console.error('Analytics update on review error:', analyticsErr);
      }
    }
    
    return success(res, submission, `Submission ${status} successfully`);
  } catch (err) {
    console.error('Review submission error:', err);
    return error(res, 'Failed to review submission.');
  }
};

module.exports = {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
  submitTest,
  getSubmissions,
  reviewSubmission,
};
