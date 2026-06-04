const Notification = require('../models/Notification');

async function createNotification(studentId, title, message, type) {
  try {
    const notification = await Notification.create({
      studentId,
      title,
      message,
      type,
    });
    return notification;
  } catch (err) {
    console.error('Create notification error:', err.message);
    return null;
  }
}

async function notifyTeacherReview(studentId, status) {
  const statusText = status === 'approved' ? 'qabul qilindi' : 'rad etildi';
  return createNotification(
    studentId,
    'O\'qituvchi tekshiruvi yakunlandi',
    `Sizning vazifangiz o'qituvchi tomonidan tekshirildi va ${statusText}.`,
    'teacher_review'
  );
}

async function notifyAIFeedback(studentId) {
  return createNotification(
    studentId,
    'AI Baholashi tayyor',
    'AI sizning kognitiv baholashingizni yakunladi. Bloom taksonomiyasining batafsil tahlili uchun dashboard sahifasini ko\'ring.',
    'ai_feedback'
  );
}

async function notifyFinalResult(studentId, score) {
  return createNotification(
    studentId,
    'Yakuniy natija tayyor',
    `Sizning yakuniy balingiz ${score}%. To'liq tahlilni ko'rish uchun analitika bo'limiga o'ting.`,
    'final_result'
  );
}

async function notifyRecommendation(studentId) {
  return createNotification(
    studentId,
    'Yangi tavsiya mavjud',
    'Natijalaringiz asosida siz uchun shaxsiy o\'quv tavsiyasi ishlab chiqildi.',
    'recommendation'
  );
}

module.exports = {
  createNotification,
  notifyTeacherReview,
  notifyAIFeedback,
  notifyFinalResult,
  notifyRecommendation,
};
