const Material = require('../models/Material');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const Recommendation = require('../models/Recommendation');
const LessonPlan = require('../models/LessonPlan');
const Analytics = require('../models/Analytics');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');

const analyzeMaterial = async (req, res) => {
  try {
    const { materialId } = req.body;

    if (!materialId) {
      return error(res, 'materialId is required.', 400);
    }

    const material = await Material.findById(materialId);
    if (!material) {
      return error(res, 'Material not found.', 404);
    }

    const analysis = await aiService.analyzeMaterial(material);

    material.aiAnalysis = analysis;
    material.aiStatus = 'analyzed';
    await material.save();

    return success(res, {
      materialId: material._id,
      analysis,
      aiAvailable: aiService.isAIAvailable(),
    }, 'Material analyzed successfully');
  } catch (err) {
    console.error('AI analyze material error:', err);
    return error(res, 'Failed to analyze material.');
  }
};

const generateTest = async (req, res) => {
  try {
    const { materialId, questionCount } = req.body;

    if (!materialId) {
      return error(res, 'materialId is required.', 400);
    }

    const material = await Material.findById(materialId);
    if (!material) {
      return error(res, 'Material not found.', 404);
    }

    const generatedTest = await aiService.generateTest(material, questionCount || 5);

    return success(res, {
      materialId: material._id,
      generatedTest,
      aiAvailable: aiService.isAIAvailable(),
    }, 'Test generated successfully');
  } catch (err) {
    console.error('AI generate test error:', err);
    return error(res, 'Failed to generate test.');
  }
};

const evaluateAnswer = async (req, res) => {
  try {
    const { submissionId, questionIndex, question, answer, context } = req.body;

    if (!question || !answer) {
      return error(res, 'question and answer are required.', 400);
    }

    const evaluation = await aiService.evaluateAnswer(question, answer, context);

    if (submissionId) {
      const submission = await Submission.findById(submissionId);
      if (submission) {
        submission.aiFeedback = evaluation.feedback;
        submission.bloomAnalysis = evaluation.bloomAnalysis;
        await submission.save();

        await updateCognitiveGrowth(submission.studentId, evaluation.bloomAnalysis);

        await updateAnalyticsBloom(submission.studentId, evaluation.bloomAnalysis, submission.percentage);

        notificationService.notifyAIFeedback(submission.studentId).catch(err =>
          console.error('AI feedback notification error:', err)
        );
      }
    }

    return success(res, {
      evaluation,
      aiAvailable: aiService.isAIAvailable(),
    }, 'Answer evaluated successfully');
  } catch (err) {
    console.error('AI evaluate answer error:', err);
    return error(res, 'Failed to evaluate answer.');
  }
};

const recommendations = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return error(res, 'studentId is required.', 400);
    }

    let analytics = await Analytics.findOne({ studentId });
    if (!analytics) {
      analytics = { totalScore: 0, testsCompleted: 0, weakTopics: [], strongTopics: [], cognitiveGrowth: [] };
    }

    const result = await aiService.generateRecommendations(analytics);

    await Recommendation.findOneAndUpdate(
      { studentId },
      {
        studentId,
        recommendations: result.recommendations,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    try {
      let analytics = await Analytics.findOne({ studentId });
      if (!analytics) {
        analytics = await Analytics.create({ studentId });
      }
      analytics.recommendation = result.overallAssessment || result.suggestedFocus || '';
      analytics.lastUpdated = new Date();
      await analytics.save();
    } catch (analyticsErr) {
      console.error('Analytics recommendation update error:', analyticsErr);
    }

    notificationService.notifyRecommendation(studentId).catch(err =>
      console.error('Recommendation notification error:', err)
    );

    return success(res, {
      studentId,
      ...result,
      aiAvailable: aiService.isAIAvailable(),
    }, 'Recommendations generated successfully');
  } catch (err) {
    console.error('AI recommendations error:', err);
    return error(res, 'Failed to generate recommendations.');
  }
};

const evaluateLessonPlan = async (req, res) => {
  try {
    const { lessonPlanId } = req.body;

    if (!lessonPlanId) {
      return error(res, 'lessonPlanId is required.', 400);
    }

    const lessonPlan = await LessonPlan.findById(lessonPlanId);
    if (!lessonPlan) {
      return error(res, 'Lesson plan not found.', 404);
    }

    let materialContext = '';
    if (lessonPlan.materialId) {
      const material = await Material.findById(lessonPlan.materialId);
      if (material) {
        materialContext = `${material.title} - ${material.topic}: ${material.textContent || material.description || ''}`;
      }
    }

    const evaluation = await aiService.evaluateLessonPlan(lessonPlan, materialContext);

    lessonPlan.aiEvaluation = evaluation;
    lessonPlan.status = 'ai_evaluated';
    await lessonPlan.save();

    return success(res, {
      lessonPlanId: lessonPlan._id,
      evaluation,
      aiAvailable: aiService.isAIAvailable(),
    }, 'Lesson plan evaluated successfully');
  } catch (err) {
    console.error('AI evaluate lesson plan error:', err);
    return error(res, 'Failed to evaluate lesson plan.');
  }
};

const chat = async (req, res) => {
  try {
    const { materialId, message, history } = req.body;

    if (!message) {
      return error(res, 'Message is required.', 400);
    }

    let materialContext = '';
    if (materialId) {
      const material = await Material.findById(materialId);
      if (material) {
        materialContext = `Material Title: ${material.title}\nMaterial Topic: ${material.topic}\nMaterial Content: ${material.textContent || material.description || ''}`;
      }
    }

    const aiResponse = await aiService.chatWithMentor(message, materialContext, history);

    return success(res, {
      message: aiResponse,
      aiAvailable: aiService.isAIAvailable(),
    }, 'Chat response generated successfully');
  } catch (err) {
    console.error('AI chat error:', err);
    return error(res, 'Failed to generate chat response.');
  }
};

const globalChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    const files = req.files || [];

    if (!message && files.length === 0) {
      return error(res, 'Message or file is required.', 400);
    }

    const userId = req.user._id;
    const User = require('../models/User');
    const user = await User.findById(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.aiLastUsageDate || user.aiLastUsageDate < today) {
      user.aiDailyFilesCount = 0;
      user.aiDailyBytesUsed = 0;
      user.aiLastUsageDate = new Date();
    }

    const currentUploadSize = files.reduce((acc, file) => acc + file.size, 0);

    const MAX_FILES = 3;
    const MAX_BYTES = 5 * 1024 * 1024;

    if (user.aiDailyFilesCount + files.length > MAX_FILES) {
      return error(res, `Kunlik fayl yuborish limiti oshib ketdi (Maksimum ${MAX_FILES} ta fayl).`, 403);
    }
    if (user.aiDailyBytesUsed + currentUploadSize > MAX_BYTES) {
      return error(res, `Kunlik xotira hajmi oshib ketdi (Maksimum 5MB).`, 403);
    }

    let parsedHistory = [];
    try {
      if (history) {
        parsedHistory = JSON.parse(history);
      }
    } catch (e) {
      console.warn('Failed to parse history JSON', e);
    }

    const aiResponse = await aiService.globalChatWithMentor(message, files, parsedHistory);

    if (files.length > 0) {
      user.aiDailyFilesCount += files.length;
      user.aiDailyBytesUsed += currentUploadSize;
      await user.save();
    }

    return success(res, {
      message: aiResponse,
      aiAvailable: aiService.isAIAvailable(),
      usage: {
        files: user.aiDailyFilesCount,
        bytes: user.aiDailyBytesUsed
      }
    }, 'Chat response generated successfully');
  } catch (err) {
    console.error('Global AI chat error:', err);
    return error(res, 'Failed to generate chat response.');
  }
};

async function updateCognitiveGrowth(studentId, bloomAnalysis) {
  try {
    let analytics = await Analytics.findOne({ studentId });
    if (!analytics) {
      analytics = await Analytics.create({ studentId });
    }

    analytics.cognitiveGrowth.push({
      date: new Date(),
      remember: bloomAnalysis.remember || 0,
      understand: bloomAnalysis.understand || 0,
      apply: bloomAnalysis.apply || 0,
      analyze: bloomAnalysis.analyze || 0,
    });

    if (analytics.cognitiveGrowth.length > 50) {
      analytics.cognitiveGrowth = analytics.cognitiveGrowth.slice(-50);
    }

    analytics.lastUpdated = new Date();
    await analytics.save();
  } catch (err) {
    console.error('Update cognitive growth error:', err);
  }
}

async function updateAnalyticsBloom(studentId, bloomAnalysis, percentage) {
  try {
    let analytics = await Analytics.findOne({ studentId });
    if (!analytics) {
      analytics = await Analytics.create({ studentId });
    }
    analytics.remember = bloomAnalysis.remember || analytics.remember;
    analytics.understand = bloomAnalysis.understand || analytics.understand;
    analytics.apply = bloomAnalysis.apply || analytics.apply;
    analytics.analyze = bloomAnalysis.analyze || analytics.analyze;
    if (percentage !== undefined) {
      analytics.score = percentage;
    }
    analytics.lastUpdated = new Date();
    await analytics.save();
  } catch (err) {
    console.error('Update analytics bloom error:', err);
  }
}

module.exports = {
  analyzeMaterial,
  generateTest,
  evaluateAnswer,
  recommendations,
  evaluateLessonPlan,
  chat,
  globalChat,
};
