# BugBox Features Guide

## Overview
This document covers all new features added to BugBox:
1. AI-Based Bug Detection
2. Automatic Log Collection
3. Cloud Video Storage
4. Notification System

---

## 1. AI-Based Bug Detection

### What It Does
Automatically analyzes bug reports using OpenAI's GPT-3.5-turbo to:
- Assign severity levels (Critical, High, Medium, Low)
- Categorize bugs (UI, Performance, Logic, Security, Database, API)
- Extract relevant keywords
- Suggest fixes
- Find duplicate/related bugs
- Calculate confidence scores

### Frontend Integration
```javascript
// Bug analysis is automatic when reporting a bug
// Results appear in bug details as aiAnalysis field
{
  severity: "High",
  category: "UI",
  keywords: ["responsive", "button", "mobile"],
  suggestions: ["Check CSS media queries", "Test on mobile devices"],
  confidenceScore: 0.85,
  relatedBugs: ["bugId1", "bugId2"]
}
```

### API Endpoint
- **POST** `/api/bugs/report-bug` - Automatically analyzes and returns AI results

### Configuration
- Set `OPENAI_API_KEY` in `.env`
- AI analysis only triggers for English descriptions
- If OpenAI API fails, bug still reports (graceful degradation)

---

## 2. Automatic Log Collection

### What It Does
Captures and stores comprehensive logs including:
- **Console Logs**: log, error, warn, info, debug
- **Network Requests**: method, URL, status, response time
- **User Interactions**: clicks, inputs, scrolls, focus events
- **Performance Metrics**: memory usage, load time, FPS
- **Device Info**: browser version, OS, screen resolution

### Frontend Integration
```javascript
import LogCollector from './services/logCollector.js';

// Initialize log collector
const logCollector = new LogCollector({
  apiUrl: 'http://localhost:5000',
  enableConsole: true,
  enableNetwork: true,
  enableUserInteractions: true,
  enablePerformance: true,
});

// Submit logs when reporting a bug
const result = await logCollector.submitLogs(bugId);

// Get all collected logs
const logs = logCollector.getLogs();

// Clear logs
logCollector.clearLogs();
```

### API Endpoints
- **POST** `/api/logs/collect` - Submit collected logs
- **GET** `/api/logs/:bugId` - Get logs for a specific bug
- **GET** `/api/logs/:bugId/summary` - Get log summary with stats
- **DELETE** `/api/logs/cleanup/old` - Delete logs older than 30 days

### Log Summary Example
```json
{
  "totalConsoleLogs": 45,
  "errorCount": 3,
  "warningCount": 8,
  "totalNetworkRequests": 23,
  "failedRequests": 2,
  "successRate": 91.30,
  "totalUserInteractions": 156,
  "sessionDuration": 245,
  "averageResponseTime": 234.5,
  "topErrors": [...],
  "slowRequests": [...]
}
```

---

## 3. Cloud Video Storage (AWS S3)

### What It Does
- Automatically uploads screen recordings to AWS S3
- Generates public, shareable URLs
- Stores local file references in database
- Supports fallback to local storage if S3 not configured
- Configurable access control and retention policies

### Frontend Integration
Screen recording continues to work as before:
```javascript
// Recording URI is automatically uploaded to S3
// videoStorageUrl contains the S3 URL
// videoFile contains local filename (if S3 not configured)
```

### API Endpoints
- **POST** `/api/bugs/report-bug` - Handles S3 upload automatically
- Uses multer middleware with S3 storage backend

### Configuration
Required environment variables:
```env
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=bugbox-videos
```

### S3 Bucket Setup
1. Create S3 bucket: `bugbox-videos`
2. Set object ACL to public-read
3. Configure CORS policy for your frontend domain
4. Create IAM user with S3 permissions

### Storage Methods
- **With S3**: Videos stored in cloud, local file deleted
- **Without S3**: Videos stored in `uploads/` directory (local)
- System automatically falls back to local if S3 fails

---

## 4. Notification System

### What It Does
Real-time and email notifications for:
- **New Bug Reports**: Notify all developers
- **Status Changes**: Notify reporter and developers
- **New Comments**: Notify all relevant parties
- **Critical Alerts**: Immediate notification for critical bugs

### Frontend Integration

#### NotificationPanel Component
```jsx
import NotificationPanel from './components/NotificationPanel.jsx';

// In your layout
<NotificationPanel userId={currentUser._id} />
```

#### Notification Features
- Real-time updates via Socket.IO
- Unread badge counter
- Mark as read/unread
- Delete notifications
- Notification history
- Click to navigate to bug

#### Example Usage
```jsx
import { useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext.jsx';

function App() {
  const { user } = useContext(AuthContext);
  
  return (
    <div>
      <header>
        <NotificationPanel userId={user._id} />
      </header>
      {/* rest of app */}
    </div>
  );
}
```

### API Endpoints

#### Notification Management
- **GET** `/api/notifications` - Get notifications (paginated)
  - Query params: `limit`, `skip`, `unreadOnly`
- **PUT** `/api/notifications/:notificationId/read` - Mark as read
- **PUT** `/api/notifications/read-all` - Mark all as read
- **DELETE** `/api/notifications/:notificationId` - Delete
- **GET** `/api/notifications/stats` - Get notification statistics

### Email Configuration

#### Gmail Setup (Recommended)
1. Enable 2FA on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Set environment variables:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

#### Other Email Services
```env
EMAIL_SERVICE=outlook
# or
EMAIL_SERVICE=yahoo
```

### Notification Preferences
Users can configure notification settings (to be implemented in User settings):
```javascript
{
  preferences: {
    emailNotifications: {
      statusChange: true,
      newComment: true,
      criticalAlert: true,
      newBugReport: false
    }
  }
}
```

### Real-Time Updates via Socket.IO

#### Client-Side Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

// Join user's notification room
socket.emit('join', userId);

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

#### Server-Side Broadcasting
Notifications are automatically sent via Socket.IO when:
- Bug status changes
- New comment is added
- New bug is reported
- Bug severity is marked as Critical

---

## Integration Checklist

### Backend Setup
- [x] Update package.json with new dependencies
- [x] Create models: BugLog, Notification
- [x] Create services: aiService, storageService, notificationService
- [x] Create controllers: logController, notificationController
- [x] Create routes: logRoutes, notificationRoutes
- [x] Update index.js with Socket.IO
- [x] Update bugController with AI and notifications
- [ ] Update User model to add notification preferences
- [ ] Install dependencies: `npm install`

### Frontend Setup
- [x] Create LogCollector service
- [x] Create NotificationPanel component
- [x] Add styles
- [ ] Install socket.io-client: `npm install`
- [ ] Integrate NotificationPanel in Layout component
- [ ] Initialize LogCollector in main app
- [ ] Add log submission to bug report form

### Configuration
- [ ] Create `.env` file with all required variables
- [ ] Configure Gmail app password
- [ ] Configure AWS S3 bucket
- [ ] Set OpenAI API key
- [ ] Test all features

### Testing
- [ ] Test AI bug analysis
- [ ] Upload and view logs
- [ ] Test S3 video upload
- [ ] Send and receive notifications
- [ ] Test email notifications
- [ ] Test real-time Socket.IO updates

---

## Troubleshooting

### AI Analysis Not Working
- Check `OPENAI_API_KEY` is set correctly
- Verify OpenAI account has API credits
- Check bug description is in English
- Check logs for API errors

### Logs Not Collecting
- Verify LogCollector is initialized on page load
- Check browser console for JavaScript errors
- Verify auth token is being sent
- Check API request in Network tab

### S3 Upload Failing
- Verify AWS credentials are correct
- Check S3 bucket exists and is public-readable
- Verify CORS policy is configured
- Check IAM user has s3:PutObject permission
- Check bucket name matches environment variable

### Notifications Not Appearing
- Verify Socket.IO server is running
- Check browser network tab for Socket.IO connection
- Verify user joins the correct notification room
- Check OpenAI API errors in server logs
- Verify email service credentials if sending emails

### Email Not Sending
- Check `EMAIL_USER` and `EMAIL_PASSWORD` are correct
- For Gmail: verify app-specific password is used
- Check email service is configured correctly
- Enable less secure apps if needed for Gmail
- Check spam folder for emails

---

## Performance Optimization

### Log Collection
- Limit maximum logs with `maxLogs` config (default: 500)
- Consider sampling network requests in production
- Compress logs before sending

### S3 Storage
- Use CloudFront CDN for faster video delivery
- Set S3 lifecycle policies for automatic cleanup
- Consider video compression before upload

### Notifications
- Use database indexes on userId and bugId
- Implement notification pagination
- Archive old notifications periodically

### AI Analysis
- Cache analysis results
- Use batch processing for multiple bugs
- Consider switching to GPT-4 for higher quality analysis

---

## Future Enhancements

1. **Advanced Analytics**
   - Bug trend analysis
   - Performance degradation tracking
   - User session replay

2. **Machine Learning**
   - Automatic severity prediction
   - Smart duplicate detection
   - Predictive fix suggestions

3. **Integration**
   - GitHub/GitLab issue creation
   - Slack notifications
   - Jira integration

4. **Compliance**
   - GDPR data retention policies
   - Log encryption
   - Audit trails

---

## Support & Documentation

For more details on specific features:
- AI Service: See `backend/services/aiService.js`
- Log Collection: See `frontend/src/services/logCollector.js`
- Notifications: See `backend/services/notificationService.js`
- Storage: See `backend/services/storageService.js`
