import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;

    let query = { recipientId: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('bugId', 'bugId title')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false,
    });

    res.json({
      notifications,
      total,
      unreadCount,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.recipientId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.recipientId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Notification.deleteOne({ _id: notificationId });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNotificationStats = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false,
    });

    const notificationTypes = await Notification.aggregate([
      {
        $match: { recipientId: req.user._id },
      },
      {
        $group: {
          _id: '$notificationType',
          count: { $sum: 1 },
        },
      },
    ]);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await Notification.countDocuments({
      recipientId: req.user._id,
      createdAt: { $gte: last24Hours },
    });

    res.json({
      unreadCount,
      notificationTypes: notificationTypes.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
