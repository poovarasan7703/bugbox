import mongoose from 'mongoose';

const bugLogSchema = new mongoose.Schema(
  {
    bugId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bug',
      required: true,
    },
    consoleLogs: [
      {
        level: {
          type: String,
          enum: ['log', 'error', 'warn', 'info', 'debug'],
        },
        message: String,
        timestamp: Date,
        stack: String, // For error logs
      },
    ],
    networkRequests: [
      {
        method: String,
        url: String,
        status: Number,
        responseTime: Number,
        timestamp: Date,
        headers: mongoose.Schema.Types.Mixed,
      },
    ],
    userInteractions: [
      {
        type: String, // 'click', 'input', 'scroll', 'focus'
        target: String,
        timestamp: Date,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    performanceMetrics: {
      memoryUsage: Number,
      cpuUsage: Number,
      fps: Number,
      loadTime: Number,
      timestamp: Date,
    },
    sessionDuration: Number,
    browserVersion: String,
    osInfo: String,
  },
  { timestamps: true }
);

export default mongoose.model('BugLog', bugLogSchema);
