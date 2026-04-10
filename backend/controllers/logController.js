import BugLog from '../models/BugLog.js';
import Bug from '../models/Bug.js';

export const collectLogs = async (req, res) => {
  try {
    const { bugId, consolidateLogs } = req.body;

    if (!bugId) {
      return res.status(400).json({ message: 'bugId is required' });
    }

    const bug = await Bug.findById(bugId);
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found' });
    }

    // Create or update bug log
    let bugLog = await BugLog.findOne({ bugId });
    if (!bugLog) {
      bugLog = await BugLog.create({
        bugId,
        consoleLogs: consolidateLogs?.consoleLogs || [],
        networkRequests: consolidateLogs?.networkRequests || [],
        userInteractions: consolidateLogs?.userInteractions || [],
        performanceMetrics: consolidateLogs?.performanceMetrics || {},
        sessionDuration: consolidateLogs?.sessionDuration || 0,
        browserVersion: consolidateLogs?.browserVersion || '',
        osInfo: consolidateLogs?.osInfo || '',
      });
    } else {
      // Merge logs
      if (consolidateLogs?.consoleLogs) {
        bugLog.consoleLogs.push(...consolidateLogs.consoleLogs);
      }
      if (consolidateLogs?.networkRequests) {
        bugLog.networkRequests.push(...consolidateLogs.networkRequests);
      }
      if (consolidateLogs?.userInteractions) {
        bugLog.userInteractions.push(...consolidateLogs.userInteractions);
      }
      if (consolidateLogs?.performanceMetrics) {
        bugLog.performanceMetrics = consolidateLogs.performanceMetrics;
      }
      await bugLog.save();
    }

    // Update bug with log reference
    bug.collectedLogs = bugLog._id;
    await bug.save();

    res.status(201).json({
      message: 'Logs collected successfully',
      logId: bugLog._id,
      logCount: {
        consoleLogs: bugLog.consoleLogs.length,
        networkRequests: bugLog.networkRequests.length,
        userInteractions: bugLog.userInteractions.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBugLogs = async (req, res) => {
  try {
    const { bugId } = req.params;

    const bugLog = await BugLog.findOne({ bugId });
    if (!bugLog) {
      return res.status(404).json({ message: 'No logs found for this bug' });
    }

    res.json(bugLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLogSummary = async (req, res) => {
  try {
    const { bugId } = req.params;

    const bugLog = await BugLog.findOne({ bugId });
    if (!bugLog) {
      return res.status(404).json({ message: 'No logs found for this bug' });
    }

    const errorLogs = bugLog.consoleLogs.filter((log) => log.level === 'error');
    const warningLogs = bugLog.consoleLogs.filter((log) => log.level === 'warn');
    const failedRequests = bugLog.networkRequests.filter((req) => req.status >= 400);

    const summary = {
      totalConsoleLogs: bugLog.consoleLogs.length,
      errorCount: errorLogs.length,
      warningCount: warningLogs.length,
      totalNetworkRequests: bugLog.networkRequests.length,
      failedRequests: failedRequests.length,
      successRate: bugLog.networkRequests.length
        ? (
            ((bugLog.networkRequests.length - failedRequests.length) /
              bugLog.networkRequests.length) *
            100
          ).toFixed(2)
        : 100,
      totalUserInteractions: bugLog.userInteractions.length,
      sessionDuration: bugLog.sessionDuration,
      averageResponseTime: bugLog.networkRequests.length
        ? (
            bugLog.networkRequests.reduce((sum, req) => sum + (req.responseTime || 0), 0) /
            bugLog.networkRequests.length
          ).toFixed(2)
        : 0,
      performance: bugLog.performanceMetrics,
      browserVersion: bugLog.browserVersion,
      osInfo: bugLog.osInfo,
      topErrors: errorLogs.slice(0, 5),
      slowRequests: bugLog.networkRequests
        .filter((req) => req.responseTime > 1000)
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 5),
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteOldLogs = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await BugLog.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    res.json({
      message: 'Old logs deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
