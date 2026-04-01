/**
 * Reservation Activity Log Component
 *
 * Displays the history of activities for a reservation including:
 * - Who created/modified the reservation
 * - What changes were made
 * - When the changes occurred
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Paper,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckInIcon,
  ExitToApp as CheckOutIcon,
  Cancel as CancelIcon,
  Payment as PaymentIcon,
  Note as NoteIcon,
  Person as PersonIcon,
  Computer as SystemIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

export interface ActivityLog {
  id: string;
  activityType: string;
  actorType: 'CUSTOMER' | 'EMPLOYEE' | 'SYSTEM';
  actorId?: string;
  actorName?: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
}

interface ReservationActivityLogProps {
  activities: ActivityLog[];
  defaultExpanded?: boolean;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'CREATED':
      return <AddIcon color="success" />;
    case 'UPDATED':
      return <EditIcon color="primary" />;
    case 'STATUS_CHANGED':
      return <EditIcon color="info" />;
    case 'CHECKED_IN':
      return <CheckInIcon color="success" />;
    case 'CHECKED_OUT':
      return <CheckOutIcon color="primary" />;
    case 'CANCELLED':
      return <CancelIcon color="error" />;
    case 'CONFIRMED':
      return <CheckInIcon color="success" />;
    case 'PAYMENT_RECEIVED':
      return <PaymentIcon color="success" />;
    case 'NOTE_ADDED':
      return <NoteIcon color="info" />;
    default:
      return <EditIcon color="action" />;
  }
};

const getActorIcon = (actorType: string) => {
  switch (actorType) {
    case 'CUSTOMER':
      return <PersonIcon fontSize="small" />;
    case 'EMPLOYEE':
      return <PersonIcon fontSize="small" color="primary" />;
    case 'SYSTEM':
      return <SystemIcon fontSize="small" color="action" />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

const getActorChipColor = (
  actorType: string
): 'default' | 'primary' | 'secondary' => {
  switch (actorType) {
    case 'CUSTOMER':
      return 'default';
    case 'EMPLOYEE':
      return 'primary';
    case 'SYSTEM':
      return 'secondary';
    default:
      return 'default';
  }
};

const formatActivityType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const ReservationActivityLog: React.FC<ReservationActivityLogProps> = ({
  activities,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  if (!activities || activities.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            No activity history available
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ mt: 2 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 1.5, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon color="action" />
          <Typography variant="subtitle1" fontWeight="medium">
            Activity History
          </Typography>
          <Chip
            label={activities.length}
            size="small"
            color="default"
            sx={{ height: 20, fontSize: '0.75rem' }}
          />
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <List dense sx={{ py: 0 }}>
          {activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem
                sx={{
                  py: 1.5,
                  alignItems: 'flex-start',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                  {getActivityIcon(activity.activityType)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {formatActivityType(activity.activityType)}
                      </Typography>
                      <Chip
                        icon={getActorIcon(activity.actorType)}
                        label={activity.actorName || activity.actorType}
                        size="small"
                        color={getActorChipColor(activity.actorType)}
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box mt={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {activity.description}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}{' '}
                        •{' '}
                        {format(
                          new Date(activity.createdAt),
                          'MMM d, yyyy h:mm a'
                        )}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      </Collapse>
    </Paper>
  );
};

export default ReservationActivityLog;
