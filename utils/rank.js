const calculateRankDetails = (totalPoints) => {
  let rank = 'Beginner';
  let nextRank = 'Learner';
  let nextRankPoints = 50;
  let minPoints = 0;

  if (totalPoints >= 1200) {
    rank = 'Master';
    nextRank = 'None';
    nextRankPoints = totalPoints; // Max rank reached
    minPoints = 1200;
  } else if (totalPoints >= 800) {
    rank = 'Expert';
    nextRank = 'Master';
    nextRankPoints = 1200;
    minPoints = 800;
  } else if (totalPoints >= 500) {
    rank = 'Researcher';
    nextRank = 'Expert';
    nextRankPoints = 800;
    minPoints = 500;
  } else if (totalPoints >= 300) {
    rank = 'Analyst';
    nextRank = 'Researcher';
    nextRankPoints = 500;
    minPoints = 300;
  } else if (totalPoints >= 150) {
    rank = 'Knowledge Explorer';
    nextRank = 'Analyst';
    nextRankPoints = 300;
    minPoints = 150;
  } else if (totalPoints >= 50) {
    rank = 'Learner';
    nextRank = 'Knowledge Explorer';
    nextRankPoints = 150;
    minPoints = 50;
  }

  let progressPercentage = 100;
  if (rank !== 'Master') {
    const range = nextRankPoints - minPoints;
    const progress = totalPoints - minPoints;
    progressPercentage = Math.round((progress / range) * 100);
  }

  return {
    rank,
    nextRank,
    nextRankPoints,
    progressPercentage
  };
};

module.exports = {
  calculateRankDetails
};
