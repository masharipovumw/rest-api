const Analytics = require('../models/Analytics');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Material = require('../models/Material');
const Test = require('../models/Test');
const Recommendation = require('../models/Recommendation');
const { success, error } = require('../utils/response');
const mongoose = require('mongoose');

/**
 * GET /api/analytics/admin
 * System-wide analytics dashboard (admin only)
 */
const getAdminAnalytics = async (req, res) => {
  try {
    // User statistics
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalUsers = await User.countDocuments();

    // Material statistics
    const totalMaterials = await Material.countDocuments();
    const materialsByType = await Material.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Submission statistics
    const totalSubmissions = await Submission.countDocuments();
    const avgScore = await Submission.aggregate([
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);

    // Top performing students
    const topStudents = await Analytics.find()
      .sort({ totalScore: -1 })
      .limit(10)
      .populate('studentId', 'name email');

    // Common weak topics across all students
    const allAnalytics = await Analytics.find();
    const topicFrequency = {};
    allAnalytics.forEach((a) => {
      (a.weakTopics || []).forEach((topic) => {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      });
    });
    const commonWeakTopics = Object.entries(topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    return success(res, {
      users: { total: totalUsers, students: totalStudents, teachers: totalTeachers },
      materials: { total: totalMaterials, byType: materialsByType },
      submissions: {
        total: totalSubmissions,
        averageScore: avgScore.length > 0 ? Math.round(avgScore[0].avg) : 0,
      },
      topStudents,
      commonWeakTopics,
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    return error(res, 'Failed to get admin analytics.');
  }
};

/**
 * GET /api/analytics/student/:id
 * Individual student analytics
 */
const getStudentAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    // Get or create analytics record
    let analytics = await Analytics.findOne({ studentId: id })
      .populate('studentId', 'name email role');

    if (!analytics) {
      // Create a blank analytics entry
      analytics = await Analytics.create({ studentId: id });
      analytics = await Analytics.findOne({ studentId: id })
        .populate('studentId', 'name email role');
    }

    // Get recent submissions
    const recentSubmissions = await Submission.find({ studentId: id })
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate('testId', 'title');

    // Calculate learning progress
    const totalTests = await Submission.countDocuments({ studentId: id });
    const passedTests = await Submission.countDocuments({ studentId: id, percentage: { $gte: 60 } });

    return success(res, {
      analytics,
      recentSubmissions,
      progress: {
        totalTests,
        passedTests,
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Student analytics error:', err);
    return error(res, 'Failed to get student analytics.');
  }
};

/**
 * GET /api/analytics/teacher
 * Teacher analytics dashboard
 */
const getTeacherAnalytics = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // jami talabalar = users with role student
    const totalStudents = await User.countDocuments({ role: 'student' });

    // faol kurslar = actual number of materials uploaded by this teacher
    const totalMaterials = await Material.countDocuments({ teacherId: teacherId });
    
    const totalTests = await Test.countDocuments({ createdBy: teacherId });

    // tekshirilishi kerak = pending submitted tests for this teacher's tests
    // Find all tests by this teacher
    const teacherTests = await Test.find({ createdBy: teacherId }).select('_id');
    const testIds = teacherTests.map(t => t._id);

    // Only count submissions that haven't been approved or rejected yet
    const submissionsCount = await Submission.countDocuments({ 
      testId: { $in: testIds },
      status: { $nin: ['approved', 'rejected'] }
    });

    // O'rtacha ozlashtirish
    const avgScoreResult = await Submission.aggregate([
      { $match: { testId: { $in: testIds } } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avg) : 0;

    // AI tekshiruv = actual works, maybe recently submitted lesson plans or submissions with AI feedback
    // Let's get recent submissions for this teacher's tests
    const recentSubmissions = await Submission.find({ testId: { $in: testIds } })
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate('studentId', 'name email');

    return success(res, {
      students: totalStudents,
      activeCourses: totalMaterials, // Using only materials as faol kurslar
      needsChecking: submissionsCount,
      averageScore,
      recentSubmissions
    });
  } catch (err) {
    console.error('Teacher analytics error:', err);
    return error(res, 'Failed to get teacher analytics.');
  }
};

/**
 * GET /api/student/dashboard/:studentId
 * Student dashboard — aggregated view with statistics, Bloom scores,
 * recommendation, and submission history
 */
const getStudentDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return error(res, 'Invalid studentId.', 400);
    }

    // Get or create analytics
    let analytics = await Analytics.findOne({ studentId });
    if (!analytics) {
      analytics = await Analytics.create({ studentId });
    }

    // Statistics cards
    const totalSubmissions = await Submission.countDocuments({ studentId });
    const passedSubmissions = await Submission.countDocuments({ studentId, percentage: { $gte: 60 } });
    const avgScoreResult = await Submission.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avg) : 0;

    const statistics = {
      totalTests: totalSubmissions,
      passedTests: passedSubmissions,
      failedTests: totalSubmissions - passedSubmissions,
      averageScore,
      totalScore: analytics.totalScore,
      testsCompleted: analytics.testsCompleted,
    };

    // Bloom taxonomy scores (latest snapshot)
    const bloomScores = {
      remember: analytics.remember,
      understand: analytics.understand,
      apply: analytics.apply,
      analyze: analytics.analyze,
      score: analytics.score,
    };

    // Recommendation
    const recDoc = await Recommendation.findOne({ studentId }).sort({ generatedAt: -1 });
    const recommendation = analytics.recommendation
      || (recDoc && recDoc.recommendations.length > 0
        ? recDoc.recommendations.map(r => r.message).join(' ')
        : '');

    // Cognitive growth history (for trend graph)
    const history = analytics.cognitiveGrowth.slice(-20).map(entry => ({
      date: entry.date,
      remember: entry.remember,
      understand: entry.understand,
      apply: entry.apply,
      analyze: entry.analyze,
    }));

    return success(res, {
      statistics,
      bloomScores,
      recommendation,
      history,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    return error(res, 'Failed to get student dashboard.');
  }
};

/**
 * GET /api/student/analytics/:studentId
 * Detailed analytics — raw Analytics record with Bloom scores and cognitive growth
 */
const getStudentAnalyticsDetail = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return error(res, 'Invalid studentId.', 400);
    }

    let analytics = await Analytics.findOne({ studentId })
      .populate('studentId', 'name email role');

    if (!analytics) {
      analytics = await Analytics.create({ studentId });
      analytics = await Analytics.findOne({ studentId })
        .populate('studentId', 'name email role');
    }

    // Recent submissions with Bloom analysis
    const recentSubmissions = await Submission.find({ studentId })
      .sort({ submittedAt: -1 })
      .limit(20)
      .populate('testId', 'title')
      .select('testId score maxScore percentage bloomAnalysis aiFeedback submittedAt status');

    return success(res, {
      analytics,
      recentSubmissions,
    });
  } catch (err) {
    console.error('Student analytics detail error:', err);
    return error(res, 'Failed to get student analytics detail.');
  }
};

module.exports = {
  getAdminAnalytics,
  getStudentAnalytics,
  getTeacherAnalytics,
  getStudentDashboard,
  getStudentAnalyticsDetail,
};

