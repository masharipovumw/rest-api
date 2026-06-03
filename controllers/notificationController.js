const Notification = require('../models/Notification');
const { success, error } = require('../utils/response');
const mongoose = require('mongoose');

/**
 * GET /api/notifications/:studentId
 * Get all notifications for a student with unread count
 */
const getNotifications = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return error(res, 'Invalid studentId.', 400);
    }

    const notifications = await Notification.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      studentId,
      isRead: false,
    });

    return success(res, {
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    return error(res, 'Failed to get notifications.');
  }
};

/**
 * POST /api/notifications
 * Create a new notification
 */
const createNotification = async (req, res) => {
  try {
    const { studentId, title, message, type } = req.body;

    // Validation
    if (!studentId || !title || !message || !type) {
      return error(res, 'studentId, title, message, and type are required.', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return error(res, 'Invalid studentId.', 400);
    }

    const validTypes = ['teacher_review', 'ai_feedback', 'final_result', 'recommendation'];
    if (!validTypes.includes(type)) {
      return error(res, `Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    const notification = await Notification.create({
      studentId,
      title,
      message,
      type,
    });

    return success(res, notification, 'Notification created successfully', 201);
  } catch (err) {
    console.error('Create notification error:', err);
    return error(res, 'Failed to create notification.');
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, 'Invalid notification ID.', 400);
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return error(res, 'Notification not found.', 404);
    }

    notification.isRead = true;
    await notification.save();

    return success(res, notification, 'Notification marked as read');
  } catch (err) {
    console.error('Mark as read error:', err);
    return error(res, 'Failed to mark notification as read.');
  }
};

module.exports = { getNotifications, createNotification, markAsRead };
