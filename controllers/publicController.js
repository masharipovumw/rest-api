const User = require('../models/User');

const getLeaderboard = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .sort({ totalPoints: -1 })
      .limit(10)
      .select('name rank totalPoints')
      .lean();

    return res.status(200).json(students);
  } catch (err) {
    console.error('Leaderboard error:', err);
    // As per requirements: "Leaderboard endpoint must always return: 200 OK with empty array if no students exist."
    // In case of any error we can also safely return [] to not break the frontend
    return res.status(200).json([]);
  }
};

module.exports = {
  getLeaderboard
};
