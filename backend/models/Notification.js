import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bugId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bug',
      required: true,
    },
    notificationType: {
      type: String,
      enum: ['status_change', 'new_comment', 'bug_assigned', 'severity_alert', 'new_bug_report'],
      required: true,
    },
    title: String,
    message: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: mongoose.Schema.Types.Mixed, // Additional info about the notification
    sentVia: {
      email: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
      emailStatus: String, // 'pending', 'sent', 'failed'
    },
    actionUrl: String, // Link to take action on the notification
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
