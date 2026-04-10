import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

let io = null;

export const setSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
};

export const sendEmailNotification = async (recipientEmail, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email Notification Error:', error.message);
    return { success: false, error: error.message };
  }
};

export const createNotification = async (
  recipientId,
  bugId,
  notificationType,
  title,
  message,
  metadata = {},
  actionUrl = null
) => {
  try {
    const notification = await Notification.create({
      recipientId,
      bugId,
      notificationType,
      title,
      message,
      metadata,
      actionUrl,
      sentVia: {
        email: false,
        inApp: true,
      },
    });

    // Emit real-time notification via Socket.IO
    if (io) {
      io.to(`user-${recipientId}`).emit('notification', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        notificationType: notification.notificationType,
        bugId: bugId,
        timestamp: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error('Create Notification Error:', error.message);
    throw error;
  }
};

export const notifyStatusChange = async (bug, newStatus, updatedBy) => {
  try {
    const recipients = await getRelevantRecipients(bug, 'status_change');

    for (const recipient of recipients) {
      const message = `Bug "${bug.title}" status has been changed to "${newStatus}" by ${updatedBy.name}`;
      const htmlContent = `
        <h2>Bug Status Update</h2>
        <p><strong>${bug.title}</strong> status has been updated.</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
        <p><strong>Updated by:</strong> ${updatedBy.name}</p>
        <a href="${process.env.FRONTEND_URL}/bugs/${bug._id}">View Bug Details</a>
      `;

      // Create in-app notification
      await createNotification(
        recipient._id,
        bug._id,
        'status_change',
        'Bug Status Updated',
        message,
        { oldStatus: bug.status, newStatus, updatedBy: updatedBy._id },
        `/bugs/${bug._id}`
      );

      // Send email if enabled
      if (recipient.preferences?.emailNotifications?.statusChange) {
        await sendEmailNotification(
          recipient.email,
          `Bug Status Changed: ${bug.title}`,
          htmlContent
        );
      }
    }
  } catch (error) {
    console.error('Notify Status Change Error:', error.message);
  }
};

export const notifyNewComment = async (bug, comment, commentAuthor) => {
  try {
    const recipients = await getRelevantRecipients(bug, 'new_comment');

    for (const recipient of recipients) {
      if (recipient._id.equals(commentAuthor._id)) continue; // Don't notify the commenter

      const message = `${commentAuthor.name} added a comment on "${bug.title}"`;
      const htmlContent = `
        <h2>New Comment on Bug</h2>
        <p><strong>${commentAuthor.name}</strong> commented on <strong>${bug.title}</strong></p>
        <blockquote>${comment.text}</blockquote>
        <a href="${process.env.FRONTEND_URL}/bugs/${bug._id}">View Bug</a>
      `;

      await createNotification(
        recipient._id,
        bug._id,
        'new_comment',
        'New Comment Added',
        message,
        { commentAuthor: commentAuthor._id, commentText: comment.text },
        `/bugs/${bug._id}`
      );

      if (recipient.preferences?.emailNotifications?.newComment) {
        await sendEmailNotification(
          recipient.email,
          `New Comment: ${bug.title}`,
          htmlContent
        );
      }
    }
  } catch (error) {
    console.error('Notify New Comment Error:', error.message);
  }
};

export const notifySeverityAlert = async (bug, severity) => {
  try {
    if (severity === 'Critical') {
      // Notify all developers
      const recipients = await getRelevantRecipients(bug, 'severity_alert');

      for (const recipient of recipients) {
        const message = `CRITICAL: "${bug.title}" has been flagged as critical severity`;
        const htmlContent = `
          <h2 style="color: red;">CRITICAL BUG ALERT</h2>
          <p><strong>${bug.title}</strong> has been classified as CRITICAL severity.</p>
          <p><strong>Category:</strong> ${bug.aiAnalysis?.category || 'Unknown'}</p>
          <p><strong>AI Confidence:</strong> ${Math.round(
            bug.aiAnalysis?.confidenceScore * 100
          )}%</p>
          <a href="${process.env.FRONTEND_URL}/bugs/${bug._id}" 
             style="background-color: red; color: white; padding: 10px 20px; text-decoration: none;">
            View & Take Action
          </a>
        `;

        await createNotification(
          recipient._id,
          bug._id,
          'severity_alert',
          'CRITICAL BUG ALERT',
          message,
          { severity, aiAnalysis: bug.aiAnalysis },
          `/bugs/${bug._id}`
        );

        if (recipient.preferences?.emailNotifications?.criticalAlert) {
          await sendEmailNotification(
            recipient.email,
            `CRITICAL: ${bug.title}`,
            htmlContent
          );
        }
      }
    }
  } catch (error) {
    console.error('Notify Severity Alert Error:', error.message);
  }
};

export const notifyNewBugReport = async (bug) => {
  try {
    // Notify all developers
    const recipients = await getRelevantRecipients(bug, 'new_bug_report');

    for (const recipient of recipients) {
      const message = `New bug report: "${bug.title}"`;
      const htmlContent = `
        <h2>New Bug Report</h2>
        <p><strong>${bug.title}</strong> has been reported.</p>
        <p><strong>Description:</strong> ${bug.description}</p>
        <p><strong>Reported by:</strong> ${bug.reportedBy?.name || 'Unknown'}</p>
        <p><strong>Severity:</strong> ${bug.aiAnalysis?.severity || 'Not analyzed'}</p>
        <a href="${process.env.FRONTEND_URL}/bugs/${bug._id}">Review Bug</a>
      `;

      await createNotification(
        recipient._id,
        bug._id,
        'new_bug_report',
        'New Bug Report',
        message,
        { severity: bug.aiAnalysis?.severity, category: bug.aiAnalysis?.category },
        `/bugs/${bug._id}`
      );

      if (recipient.preferences?.emailNotifications?.newBugReport) {
        await sendEmailNotification(
          recipient.email,
          `New Bug Report: ${bug.title}`,
          htmlContent
        );
      }
    }
  } catch (error) {
    console.error('Notify New Bug Report Error:', error.message);
  }
};

const getRelevantRecipients = async (bug, notificationType) => {
  const User = (await import('../models/User.js')).default;

  if (notificationType === 'status_change' || notificationType === 'new_comment') {
    // Notify bug reporter and all developers
    const recipients = await User.find({
      $or: [{ _id: bug.reportedBy }, { role: 'developer' }],
    });
    return recipients;
  } else if (notificationType === 'severity_alert' || notificationType === 'new_bug_report') {
    // Notify all developers
    return await User.find({ role: 'developer' });
  }

  return [];
};

export const getNotifications = async (userId, limit = 20) => {
  try {
    const notifications = await Notification.find({ recipientId: userId })
      .populate('bugId', 'bugId title')
      .sort({ createdAt: -1 })
      .limit(limit);

    return notifications;
  } catch (error) {
    console.error('Get Notifications Error:', error.message);
    throw error;
  }
};

export const markAsRead = async (notificationId) => {
  try {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
  } catch (error) {
    console.error('Mark as Read Error:', error.message);
    throw error;
  }
};

export const isEmailConfigured = () => {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
};
