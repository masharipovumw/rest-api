const router = require('express').Router();
const { getLeaderboard } = require('../controllers/publicController');

router.get('/leaderboard', getLeaderboard);

module.exports = router;
