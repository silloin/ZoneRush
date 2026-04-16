# ZoneRush Notification System

A comprehensive notification system with scheduled, delayed, and event-based notifications.

## Features

- **Scheduled Notifications**: Set notifications to trigger at specific dates/times
- **Delayed Notifications**: Create notifications that trigger after a delay (e.g., "remind me in 30 minutes")
- **Event-Based Notifications**: Immediate notifications for tile captures, friend requests, achievements
- **Real-Time Push**: WebSocket-based real-time delivery via Socket.io
- **Email Fallback**: Automatic email delivery when users are offline
- **Notification Preferences**: User-configurable settings for notification types and delivery methods
- **Robust Logging**: Comprehensive logging for debugging and monitoring

## Database Schema

### Enhanced Notifications Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) - Recipient
- type (ENUM) - scheduled, delayed, event, tile_captured, etc.
- title (VARCHAR)
- content (TEXT)
- trigger_time (TIMESTAMP) - When to deliver
- is_triggered (BOOLEAN) - Has been triggered?
- triggered_at (TIMESTAMP) - When triggered
- is_read (BOOLEAN) - Has user seen it?
- created_at (TIMESTAMP)
- data (JSONB) - Additional metadata
- is_duplicate (BOOLEAN) - Duplicate prevention
- duplicate_key (VARCHAR) - Unique constraint key
```

### Notification Preferences Table
```sql
- user_id (PRIMARY KEY)
- tile_capture_alerts (BOOLEAN)
- training_reminders (BOOLEAN)
- friend_activity (BOOLEAN)
- achievement_notifications (BOOLEAN)
- email_notifications (BOOLEAN)
- push_notifications (BOOLEAN)
```

### Notification Logs Table
```sql
- notification_id
- user_id
- event_type (created, triggered, delivered, failed)
- event_data (JSONB)
- created_at
```

## API Endpoints

### POST /api/notifications
Create a new notification
```json
{
  "type": "scheduled",  // scheduled | delayed | event
  "title": "Training Reminder",
  "content": "Time for your evening run!",
  "triggerTime": "2025-01-20T18:00:00Z",  // For scheduled
  "delayMinutes": 30,  // For delayed
  "data": { "planId": 123 }
}
```

### GET /api/notifications
Get user's notifications with query params:
- `limit` (default: 50)
- `unread` (boolean) - Only unread notifications

### GET /api/notifications/unread/count
Get unread notification count

### GET /api/notifications/stats
Get notification statistics (total, unread, triggered, pending)

### PUT /api/notifications/read/:id
Mark notification as read

### PUT /api/notifications/read-all
Mark all notifications as read

### DELETE /api/notifications/:id
Delete a notification

### GET /api/notifications/preferences
Get notification preferences

### PUT /api/notifications/preferences
Update notification preferences
```json
{
  "tile_capture_alerts": true,
  "training_reminders": true,
  "email_notifications": true
}
```

## Frontend Components

### NotificationBell
- Bell icon with unread badge
- Dropdown showing recent notifications
- Mark as read / delete actions
- Friend requests integration
- Settings button

### NotificationSettings
- Toggle switches for notification types
- Delivery method configuration (email, push)
- Save preferences to backend

## Socket Events

### Server → Client
- `notification` - Real-time notification delivery
- `tile-captured` - Tile capture event

### Client → Server
- `authenticate` - Register for notifications on connection

## Usage Examples

### Create a Scheduled Training Reminder
```javascript
await notificationService.createScheduledNotification(
  'Training Reminder',
  'Time for your scheduled run!',
  new Date('2025-01-20T18:00:00'),
  { planId: 123, type: 'training' }
);
```

### Create a Delayed Notification
```javascript
await notificationService.createDelayedNotification(
  'Break Time',
  'You have been running for 30 minutes. Take a break!',
  30, // minutes
  { type: 'safety' }
);
```

### Tile Capture Notification (Auto-triggered)
When a user captures another user's tile, the previous owner automatically receives a notification:
```
Title: "Tile Captured!"
Content: "user123 captured your tile at location xyz"
Type: "tile_captured"
```

## Testing

### Backend Tests
1. Create scheduled notification:
   ```bash
   curl -X POST http://localhost:5000/api/notifications \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"type":"scheduled","title":"Test","content":"Hello","triggerTime":"2025-01-20T12:00:00Z"}'
   ```

2. Create delayed notification:
   ```bash
   curl -X POST http://localhost:5000/api/notifications \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"type":"delayed","title":"Delayed","content":"In 5 min","delayMinutes":5}'
   ```

3. Get unread count:
   ```bash
   curl http://localhost:5000/api/notifications/unread/count \
     -H "Authorization: Bearer <token>"
   ```

### Frontend Tests
1. Click notification bell to see dropdown
2. Open settings to toggle preferences
3. Capture a tile while another user is online (they should receive notification)
4. Create a delayed notification and wait for it to trigger

## Files Created/Modified

### Backend
- `server/services/notificationService.js` - Main notification service
- `server/routes/notifications.js` - Enhanced API routes
- `server/sql/notifications_enhanced.sql` - Database schema
- `server/multiplayerSocketHandlers.js` - Socket.io integration
- `server/server.js` - Service initialization
- `server/services/tileService.js` - Tile capture notifications

### Frontend
- `client/src/services/notificationService.js` - API client
- `client/src/components/Notifications/NotificationBell.jsx` - Bell component
- `client/src/components/Notifications/NotificationSettings.jsx` - Settings modal

## Environment Variables
No additional environment variables required. Email service is reused from existing email configuration.

## Dependencies Added
- `node-cron` - Scheduler for checking pending notifications

## Notes
- Scheduler runs every minute to check for notifications to trigger
- Duplicate notifications are prevented using a unique key (userId + type + triggerTime)
- Email fallback is used when users are offline
- All notification events are logged for debugging
- Works in both local and production environments
