const User = require('../models/User');
const Analytics = require('../models/Analytics');
const Submission = require('../models/Submission');
const Material = require('../models/Material');
const { success, error } = require('../utils/response');

const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    return success(res, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get users error:', err);
    return error(res, 'Failed to get users.');
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['student', 'teacher', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return error(res, `Invalid role. Allowed roles: ${validRoles.join(', ')}`, 400);
    }

    if (req.user._id.toString() === id) {
      return error(res, 'Cannot change your own role.', 400);
    }

    const user = await User.findById(id);
    if (!user) {
      return error(res, 'User not found.', 404);
    }

    user.role = role;
    await user.save();

    return success(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }, 'User role updated');
  } catch (err) {
    console.error('Update role error:', err);
    return error(res, 'Failed to update user role.');
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalMaterials = await Material.countDocuments();
    const approvedMaterials = await Material.countDocuments({ approved: true });
    const totalSubmissions = await Submission.countDocuments();

    const avgScoreResult = await Submission.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$percentage' } } },
    ]);
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSubmissions = await Submission.countDocuments({ submittedAt: { $gte: weekAgo } });

    const materialsByType = await Material.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    return success(res, {
      users: { total: totalUsers, students: totalStudents, teachers: totalTeachers },
      materials: { total: totalMaterials, approved: approvedMaterials, byType: materialsByType },
      submissions: { total: totalSubmissions, recent: recentSubmissions, avgScore },
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    return error(res, 'Failed to get analytics.');
  }
};

module.exports = { getUsers, updateUserRole, getAnalytics };
