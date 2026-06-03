const Material = require('../models/Material');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const Recommendation = require('../models/Recommendation');
const LessonPlan = require('../models/LessonPlan');
const Analytics = require('../models/Analytics');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');

/**
 * POST /api/ai/analyze-material
 * Analyze uploaded material using AI
 */
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

    // Run AI analysis
    const analysis = await aiService.analyzeMaterial(material);

    // Update material with analysis results
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

/**
 * POST /api/ai/generate-test
 * Generate test questions from material using AI
 */
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

/**
 * POST /api/ai/evaluate-answer
 * Evaluate student's answer using Bloom's taxonomy
 */
const evaluateAnswer = async (req, res) => {
  try {
    const { submissionId, questionIndex, question, answer, context } = req.body;

    if (!question || !answer) {
      return error(res, 'question and answer are required.', 400);
    }

    const evaluation = await aiService.evaluateAnswer(question, answer, context);

    // If submissionId provided, update the submission with AI feedback
    if (submissionId) {
      const submission = await Submission.findById(submissionId);
      if (submission) {
        submission.aiFeedback = evaluation.feedback;
        submission.bloomAnalysis = evaluation.bloomAnalysis;
        await submission.save();

        // Update student cognitive growth
        await updateCognitiveGrowth(submission.studentId, evaluation.bloomAnalysis);

        // Update Analytics Bloom snapshot
        await updateAnalyticsBloom(submission.studentId, evaluation.bloomAnalysis, submission.percentage);

        // Notify student: AI evaluation completed
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

/**
 * POST /api/ai/recommendations
 * Generate personalized recommendations for a student
 */
const recommendations = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return error(res, 'studentId is required.', 400);
    }

    // Get student analytics
    let analytics = await Analytics.findOne({ studentId });
    if (!analytics) {
      analytics = { totalScore: 0, testsCompleted: 0, weakTopics: [], strongTopics: [], cognitiveGrowth: [] };
    }

    const result = await aiService.generateRecommendations(analytics);

    // Save recommendations
    await Recommendation.findOneAndUpdate(
      { studentId },
      {
        studentId,
        recommendations: result.recommendations,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update analytics recommendation text
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

    // Notify student: recommendation generated
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

/**
 * POST /api/ai/evaluate-lesson-plan
 * Evaluate student-created lesson plan
 */
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

    // Get material context if available
    let materialContext = '';
    if (lessonPlan.materialId) {
      const material = await Material.findById(lessonPlan.materialId);
      if (material) {
        materialContext = `${material.title} - ${material.topic}: ${material.textContent || material.description || ''}`;
      }
    }

    const evaluation = await aiService.evaluateLessonPlan(lessonPlan, materialContext);

    // Update lesson plan with AI evaluation
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

/**
 * POST /api/ai/chat
 * Chat with AI Mentor based on material context
 */
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


/**
 * POST /api/ai/global-chat
 * Global AI Mentor Chat with file uploads and strict daily limits (3 files, 5MB).
 */
const globalChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    const files = req.files || [];

    if (!message && files.length === 0) {
      return error(res, 'Message or file is required.', 400);
    }

    const userId = req.user._id;
    const User = require('../models/User'); // Import dynamically or at top
    const user = await User.findById(userId);

    // Check if it's a new day to reset limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!user.aiLastUsageDate || user.aiLastUsageDate < today) {
      user.aiDailyFilesCount = 0;
      user.aiDailyBytesUsed = 0;
      user.aiLastUsageDate = new Date();
    }

    // Calculate total size of current upload
    const currentUploadSize = files.reduce((acc, file) => acc + file.size, 0);

    // Enforce limits
    const MAX_FILES = 3;
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB

    if (user.aiDailyFilesCount + files.length > MAX_FILES) {
      return error(res, `Kunlik fayl yuborish limiti oshib ketdi (Maksimum ${MAX_FILES} ta fayl).`, 403);
    }
    if (user.aiDailyBytesUsed + currentUploadSize > MAX_BYTES) {
      return error(res, `Kunlik xotira hajmi oshib ketdi (Maksimum 5MB).`, 403);
    }

    // Parse history (it comes as a string in multipart/form-data)
    let parsedHistory = [];
    try {
      if (history) {
        parsedHistory = JSON.parse(history);
      }
    } catch (e) {
      console.warn('Failed to parse history JSON', e);
    }

    // Process chat with AI
    const aiResponse = await aiService.globalChatWithMentor(message, files, parsedHistory);

    // Update usage only if AI responds successfully
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

/**
 * Helper: Update student cognitive growth after answer evaluation
 */
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

    // Keep only last 50 entries
    if (analytics.cognitiveGrowth.length > 50) {
      analytics.cognitiveGrowth = analytics.cognitiveGrowth.slice(-50);
    }

    analytics.lastUpdated = new Date();
    await analytics.save();
  } catch (err) {
    console.error('Update cognitive growth error:', err);
  }
}

/**
 * Helper: Update Analytics Bloom snapshot fields after AI evaluation
 */
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
