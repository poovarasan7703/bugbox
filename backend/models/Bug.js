import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const bugSchema = new mongoose.Schema(
  {
    bugId: {
      type: String,
      unique: true,
      default: () => `BUG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    videoFile: {
      type: String,
      default: null,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Fixed'],
      default: 'Open',
    },
    developerComments: [commentSchema],
    // AI Bug Detection Fields
    aiAnalysis: {
      severity: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: null,
      },
      category: {
        type: String,
        default: null, // e.g., 'UI', 'Performance', 'Logic', 'Security'
      },
      keywords: [String],
      relatedBugs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bug' }],
      suggestions: [String],
      confidenceScore: { type: Number, default: 0 }, // 0-1
    },
    // Automatic Log Collection
    collectedLogs: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BugLog',
      default: null,
    },
    deviceInfo: {
      userAgent: String,
      screenResolution: String,
      platform: String,
      timestamp: Date,
    },
    // Cloud Storage References
    videoStorageUrl: {
      type: String,
      default: null, // S3 or cloud storage URL
    },
    logStorageUrl: {
      type: String,
      default: null,
    },
    // Notification Tracking
    notifiedUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notificationType: String, // 'status_change', 'comment', 'assignment'
        notificationTime: Date,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Bug', bugSchema);
