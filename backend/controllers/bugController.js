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

export const generateBugDescription = async (req, res) => {
  try {
    const { title, duration, size } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Bug title is required.' });
    }

    const cleanTitle = title.trim();

    // Generate AI-powered description
    let generatedDescription = '';
    let suggestions = [];
    let usedAI = false;

    // Try to use AI first
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `Write a very simple bug description in ONE sentence.
Bug Title: "${cleanTitle}"

Write ONLY: "There is an error in [what is broken] and check the [code section/module] in the code."

Examples:
- "There is an error in button click and check the event handler in the code."
- "There is an error in user login and check the authentication module in the code."
- "There is an error in form submission and check the validation logic in the code."

Make it simple, direct, and focused on what to check.

Respond in JSON format:
{
  "description": "There is an error in X and check the Y in the code.",
  "solutions": ["solution1", "solution2"]
}`;

        const openai = (await import('openai')).default;
        const client = new openai({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful bug reporter. Write bugs in VERY SIMPLE words that anyone can understand. Use everyday language. NO technical jargon. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        const content = response.choices[0].message.content;
        const parsed = JSON.parse(content);

        generatedDescription = parsed.description || '';
        suggestions = parsed.solutions || [];
        usedAI = true;
      } catch (aiError) {
        console.error('AI generation error:', aiError.message);
        // Will use fallback below
      }
    }

    // If AI failed or not configured, use intelligent fallback
    if (!usedAI) {
      // Try to extract key words from title for smarter fallback
      const titleLower = cleanTitle.toLowerCase();
      let errorArea = 'this feature';
      let codeSection = 'the related code';

      // Common patterns
      if (titleLower.includes('login')) {
        errorArea = 'login';
        codeSection = 'the login/authentication module';
      } else if (titleLower.includes('button')) {
        errorArea = 'button click';
        codeSection = 'the button click handler';
      } else if (titleLower.includes('form')) {
        errorArea = 'form submission';
        codeSection = 'the form validation and submission code';
      } else if (titleLower.includes('email')) {
        errorArea = 'email';
        codeSection = 'the email sending module';
      } else if (titleLower.includes('upload')) {
        errorArea = 'file upload';
        codeSection = 'the upload handler';
      } else if (titleLower.includes('delete')) {
        errorArea = 'delete operation';
        codeSection = 'the delete function';
      } else if (titleLower.includes('search')) {
        errorArea = 'search';
        codeSection = 'the search filter code';
      } else if (titleLower.includes('display') || titleLower.includes('show')) {
        errorArea = 'display of data';
        codeSection = 'the data rendering code';
      }

      generatedDescription = `There is an error in ${errorArea} and check ${codeSection} in the code.`;

      suggestions = [
        `Review the code related to ${errorArea}`,
        'Look for errors in the logic or syntax',
        'Fix the error and test it',
      ];
    }

    res.json({
      success: true,
      generatedDescription,
      suggestions,
      videoMetadata: {
        duration,
        size,
      },
      usedAI,
    });
  } catch (error) {
    console.error('Generate description error:', error);
    // Still return a basic description even on hard errors
    const { title, duration, size } = req.body;
    const titleLower = (title || '').toLowerCase();
    
    let basicErrorArea = 'this feature';
    let basicCodeSection = 'the related code';
    
    if (titleLower.includes('login')) {
      basicErrorArea = 'login';
      basicCodeSection = 'the login module';
    } else if (titleLower.includes('email')) {
      basicErrorArea = 'email';
      basicCodeSection = 'the email module';
    } else if (titleLower.includes('form')) {
      basicErrorArea = 'form';
      basicCodeSection = 'the form code';
    }

    const basicDescription = `There is an error in ${basicErrorArea} and check ${basicCodeSection} in the code.`;

    res.json({
      success: true,
      generatedDescription: basicDescription,
      suggestions: [
        'Watch the video to see the error',
        'Check the code',
        'Fix it and test',
      ],
      videoMetadata: {
        duration: duration || 0,
        size: size || 0,
      },
      usedAI: false,
    });
  }
};
