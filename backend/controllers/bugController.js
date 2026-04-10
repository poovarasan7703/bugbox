import Bug from '../models/Bug.js';
import { analyzeBugWithAI, findDuplicateBugs } from '../services/aiService.js';
import { uploadToS3, isS3Configured } from '../services/storageService.js';
import { notifyNewBugReport, notifySeverityAlert } from '../services/notificationService.js';
import fs from 'fs';
import path from 'path';

export const reportBug = async (req, res) => {
  try {
    const { title, description, deviceInfo } = req.body;
    let videoFile = req.file?.filename || null;
    let videoStorageUrl = null;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    // Upload video to S3 if configured
    if (videoFile && isS3Configured()) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', videoFile);
        const fileBuffer = fs.readFileSync(filePath);
        videoStorageUrl = await uploadToS3(
          fileBuffer,
          videoFile,
          'video/webm'
        );
        // Delete local file after upload
        fs.unlinkSync(filePath);
        videoFile = null; // Clear local filename
      } catch (error) {
        console.error('S3 upload failed, using local storage:', error.message);
      }
    }

    // Create bug record
    const bug = await Bug.create({
      title,
      description,
      videoFile,
      videoStorageUrl,
      reportedBy: req.user._id,
      deviceInfo: deviceInfo
        ? {
            ...deviceInfo,
            timestamp: new Date(),
          }
        : undefined,
    });

    // Analyze bug with AI
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeBugWithAI(title, description);
      bug.aiAnalysis = aiAnalysis;

      // Find potential duplicates
      const existingBugs = await Bug.find({
        _id: { $ne: bug._id },
        status: { $ne: 'Fixed' },
      }).select('aiAnalysis');

      const duplicateIndices = await findDuplicateBugs(aiAnalysis, existingBugs);
      if (duplicateIndices.length > 0) {
        bug.aiAnalysis.relatedBugs = duplicateIndices.map((idx) => existingBugs[idx]._id);
      }

      await bug.save();
    } catch (error) {
      console.error('AI analysis failed:', error.message);
      // Continue even if AI analysis fails
    }

    const populated = await Bug.findById(bug._id)
      .populate('reportedBy', 'name email')
      .populate('aiAnalysis.relatedBugs', 'bugId title');

    // Send notifications
    try {
      await notifyNewBugReport(populated);
      if (aiAnalysis?.severity === 'Critical') {
        await notifySeverityAlert(populated, 'Critical');
      }
    } catch (error) {
      console.error('Notification failed:', error.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBugs = async (req, res) => {
  try {
    const { role } = req.user;
    let query = {};

    if (role === 'tester') {
      query.reportedBy = req.user._id;
    }

    const bugs = await Bug.find(query)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(bugs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBugById = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate('reportedBy', 'name email')
      .populate('developerComments.author', 'name');

    if (!bug) {
      return res.status(404).json({ message: 'Bug not found.' });
    }

    if (req.user.role === 'tester' && !bug.reportedBy._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(bug);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Open', 'In Progress', 'Fixed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const bug = await Bug.findById(req.params.id);
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found.' });
    }

    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Only developers can update status.' });
    }

    const oldStatus = bug.status;
    bug.status = status;
    await bug.save();

    const updated = await Bug.findById(bug._id)
      .populate('reportedBy', 'name email')
      .populate('developerComments.author', 'name');

    // Send status change notification
    try {
      const { notifyStatusChange } = await import('../services/notificationService.js');
      await notifyStatusChange(updated, status, req.user);
    } catch (error) {
      console.error('Notification failed:', error.message);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const bug = await Bug.findById(req.params.id);
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found.' });
    }

    const comment = {
      author: req.user._id,
      text: text.trim(),
    };

    bug.developerComments.push(comment);
    await bug.save();

    const updated = await Bug.findById(bug._id)
      .populate('reportedBy', 'name email')
      .populate('developerComments.author', 'name');

    // Send comment notification
    try {
      const { notifyNewComment } = await import('../services/notificationService.js');
      await notifyNewComment(updated, comment, req.user);
    } catch (error) {
      console.error('Notification failed:', error.message);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
