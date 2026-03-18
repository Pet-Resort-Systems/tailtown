/**
 * Offline Indicator Component
 * Shows a banner when the app goes offline
 */

import React from 'react';
import {
  Alert,
  Snackbar,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import { WifiOff as OfflineIcon, Sync as SyncIcon } from '@mui/icons-material';
import useOnlineStatus, {
  getPendingActions,
} from '../../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  showPendingCount?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showPendingCount = true,
}) => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const pendingActions = getPendingActions();

  // Show "back online" message briefly after reconnecting
  const [showReconnected, setShowReconnected] = React.useState(false);

  React.useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            bgcolor: 'error.main',
            color: 'white',
            py: 1,
            px: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <OfflineIcon />
            <Typography variant="body2" fontWeight="bold">
              You're offline - Some features may be unavailable
            </Typography>
            {showPendingCount && pendingActions.length > 0 && (
              <Typography variant="body2">
                ({pendingActions.length} pending actions will sync when online)
              </Typography>
            )}
          </Box>
          <LinearProgress color="inherit" sx={{ mt: 0.5 }} />
        </Box>
      )}

      {/* Reconnected Snackbar */}
      <Snackbar
        open={showReconnected}
        autoHideDuration={3000}
        onClose={() => setShowReconnected(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" icon={<SyncIcon />} sx={{ width: '100%' }}>
          Connection restored
          {pendingActions.length > 0 &&
            ` - Syncing ${pendingActions.length} pending actions...`}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineIndicator;
