const Analytics = require('../models/Analytics');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Material = require('../models/Material');
const Test = require('../models/Test');
const Recommendation = require('../models/Recommendation');
const { success, error } = require('../utils/response');
const mongoose = require('mongoose');

const getAdminAnalytics = async (req, res) => {
  try {

    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalUsers = await User.countDocuments();

    const totalMaterials = await Material.countDocuments();
    const materialsByType = await Material.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const totalSubmissions = await Submission.countDocuments();
    const avgScore = await Submission.aggregate([
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);

    const topStudents = await Analytics.find()
      .sort({ totalScore: -1 })
      .limit(10)
      .populate('studentId', 'name email');

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

const getStudentAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    let analytics = await Analytics.findOne({ studentId: id })
      .populate('studentId', 'name email role');

    if (!analytics) {

      analytics = await Analytics.create({ studentId: id });
      analytics = await Analytics.findOne({ studentId: id })
        .populate('studentId', 'name email role');
    }

    const recentSubmissions = await Submission.find({ studentId: id })
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate('testId', 'title');

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

const getTeacherAnalytics = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const totalStudents = await User.countDocuments({ role: 'student' });

    const totalMaterials = await Material.countDocuments({ teacherId: teacherId });

    const totalTests = await Test.countDocuments({ createdBy: teacherId });

    const teacherTests = await Test.find({ createdBy: teacherId }).select('_id');
    const testIds = teacherTests.map(t => t._id);

    const submissionsCount = await Submission.countDocuments({
      testId: { $in: testIds },
      status: { $nin: ['approved', 'rejected'] }
    });

    const avgScoreResult = await Submission.aggregate([
      { $match: { testId: { $in: testIds } } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avg) : 0;

    const recentSubmissions = await Submission.find({ testId: { $in: testIds } })
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate('studentId', 'name email');

    return success(res, {
      students: totalStudents,
      activeCourses: totalMaterials,
      needsChecking: submissionsCount,
      averageScore,
      recentSubmissions
    });
  } catch (err) {
    console.error('Teacher analytics error:', err);
    return error(res, 'Failed to get teacher analytics.');
  }
};

const getStudentDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return error(res, 'Invalid studentId.', 400);
    }

    let analytics = await Analytics.findOne({ studentId });
    if (!analytics) {
      analytics = await Analytics.create({ studentId });
    }

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

    const bloomScores = {
      remember: analytics.remember,
      understand: analytics.understand,
      apply: analytics.apply,
      analyze: analytics.analyze,
      score: analytics.score,
    };

    const recDoc = await Recommendation.findOne({ studentId }).sort({ generatedAt: -1 });
    const recommendation = analytics.recommendation
      || (recDoc && recDoc.recommendations.length > 0
        ? recDoc.recommendations.map(r => r.message).join(' ')
        : '');

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
