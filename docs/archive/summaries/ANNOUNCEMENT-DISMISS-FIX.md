# Announcement Dismiss Fix

**Date**: November 22, 2025
**Issue**: "Dismiss Forever" button not working for unauthenticated users

## Problem

Users were unable to dismiss announcements because:

1. Announcements are shown to **everyone** (GET endpoint is public, no auth required)
2. Dismissing requires **authentication** (POST `/api/announcements/:id/dismiss` has `authenticate` middleware)
3. Unauthenticated users would click "Dismiss Forever" and get a 401 Unauthorized error
4. The dismissal would fail silently, and the announcement would reappear

## Root Cause

The backend stores dismissals per-user in the database (`announcement_dismissals` table with `userId` foreign key). This requires authentication to know which user is dismissing the announcement.

However, the frontend was showing the "Dismiss Forever" button to all users, including those not logged in.

## Solution

**Hide the "Dismiss Forever" button for unauthenticated users.**

Since dismissals are stored per-user in the database, it only makes sense to show the dismiss option to authenticated users. Unauthenticated users can still close the modal, but they'll see the announcements again on their next visit.

### Changes Made

#### 1. Frontend - AnnouncementModal Component

**File**: `frontend/src/components/announcements/AnnouncementModal.tsx`

Added `isAuthenticated` prop to control button visibility:

```typescript
interface AnnouncementModalProps {
  open: boolean;
  announcements: Announcement[];
  onClose: () => void;
  onDismiss: (id: string) => void;
  isAuthenticated?: boolean; // NEW
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  open,
  announcements,
  onClose,
  onDismiss,
  isAuthenticated = false, // NEW - defaults to false
}) => {
  // ... component logic

  // In the DialogActions:
  <Box sx={{ display: "flex", gap: 1 }}>
    <Button onClick={handleClose} variant="contained" color="primary">
      Close
    </Button>
    {isAuthenticated && ( // NEW - conditional rendering
      <Button
        onClick={handleDismiss}
        variant="outlined"
        color="error"
        startIcon={<DeleteIcon />}
      >
        Dismiss Forever
      </Button>
    )}
  </Box>;
};
```

#### 2. Frontend - Dashboard Page

**File**: `frontend/src/pages/Dashboard.tsx`

Pass authentication status to modal:

```typescript
import { useAuth } from "../contexts/AuthContext";

const Dashboard: React.FC = () => {
  const { user } = useAuth(); // NEW

  return (
    <AnnouncementModal
      open={showAnnouncementModal}
      announcements={announcements}
      onClose={() => setShowAnnouncementModal(false)}
      onDismiss={handleDismissAnnouncement}
      isAuthenticated={!!user} // NEW
    />
  );
};
```

#### 3. Frontend - MainLayout Component

**File**: `frontend/src/components/layouts/MainLayout.tsx`

Pass authentication status to modal:

```typescript
// user is already available from useAuth()
<AnnouncementModal
  open={showAnnouncementModal}
  announcements={announcements}
  onClose={() => setShowAnnouncementModal(false)}
  onDismiss={handleDismissAnnouncement}
  isAuthenticated={!!user} // NEW
/>
```

## User Experience

### Before Fix

- ❌ All users see "Dismiss Forever" button
- ❌ Unauthenticated users click it and get silent 401 error
- ❌ Announcement reappears, confusing the user
- ❌ No feedback about why dismiss didn't work

### After Fix

- ✅ Only authenticated users see "Dismiss Forever" button
- ✅ Unauthenticated users only see "Close" button
- ✅ Clear distinction between temporary close and permanent dismiss
- ✅ No confusing failed dismissals

## Alternative Solutions Considered

### Option 1: Use localStorage for unauthenticated users

**Pros**: Would allow unauthenticated users to dismiss announcements
**Cons**:

- Dismissals wouldn't persist across devices
- Dismissals would be lost if localStorage is cleared
- Inconsistent behavior between auth/unauth users
- More complex implementation

### Option 2: Make dismiss endpoint public with optional auth

**Pros**: Would work for all users
**Cons**:

- Can't track which user dismissed what
- Can't provide per-user dismissal analytics
- Defeats the purpose of the database-backed dismissal system

### Option 3: Show different message for unauth users

**Pros**: Could explain why they can't dismiss
**Cons**:

- Still confusing UX
- Encourages users to try to dismiss when they can't

**Decision**: Option (current solution) provides the cleanest UX and aligns with the database-backed dismissal system.

## Testing

### Test Case 1: Authenticated User

1. Log in as a staff member
2. View an announcement
3. ✅ "Dismiss Forever" button is visible
4. Click "Dismiss Forever"
5. ✅ Announcement is dismissed and doesn't reappear
6. ✅ Dismissal is stored in database

### Test Case 2: Unauthenticated User

1. Access the site without logging in
2. View an announcement
3. ✅ Only "Close" button is visible
4. ✅ No "Dismiss Forever" button
5. Click "Close"
6. ✅ Modal closes
7. Reload page
8. ✅ Announcement appears again (expected behavior)

### Test Case 3: User Logs In

1. View announcement while not logged in
2. ✅ Only "Close" button visible
3. Log in
4. View announcement again
5. ✅ "Dismiss Forever" button now visible
6. Dismiss announcement
7. ✅ Works correctly

## Database Schema

The dismissal system uses the `announcement_dismissals` table:

```sql
CREATE TABLE announcement_dismissals (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR NOT NULL,
  announcement_id UUID NOT NULL REFERENCES announcements(id),
  user_id VARCHAR NOT NULL,  -- Requires authentication
  dismissed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);
```

The `user_id` column requires authentication, which is why unauthenticated users cannot dismiss announcements.

## API Endpoints

### GET /api/announcements

- **Auth**: None required (public)
- **Returns**: Active announcements (excluding dismissed ones for authenticated users)

### POST /api/announcements/:id/dismiss

- **Auth**: Required (`authenticate` middleware)
- **Requires**: Valid JWT token with user ID
- **Action**: Creates dismissal record in database
- **Returns**: Success message or 401 if not authenticated

## Future Enhancements

1. **Snooze Feature**: Allow unauthenticated users to "snooze" announcements for a session using localStorage
2. **Dismissal Analytics**: Track dismissal rates to measure announcement effectiveness
3. **Undo Dismiss**: Allow users to un-dismiss announcements from their profile
4. **Dismissal Reasons**: Optionally collect feedback on why users dismiss announcements

## Related Documentation

- [Announcements Deployment Lessons](./ANNOUNCEMENTS-DEPLOYMENT-LESSONS.md)
- [Authentication Middleware](../services/customer/src/middleware/auth.middleware.ts)
- [Announcement Controller](../services/customer/src/controllers/announcement.controller.ts)

---

**Status**: ✅ Fixed and Deployed
**Tested**: November 22, 2025
**Production**: https://tailtown.canicloud.com
