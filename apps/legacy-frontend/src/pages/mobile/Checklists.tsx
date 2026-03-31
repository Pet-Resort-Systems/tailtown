import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Avatar,
  CircularProgress,
  Fab,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Camera as CameraIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';
import mobileService from '../../services/mobileService';
import { useAuth } from '../../contexts/AuthContext';

interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  photoUrl?: string;
}

interface Checklist {
  id: string;
  title: string;
  description?: string;
  tasks: ChecklistTask[];
  dueDate?: string;
  type: string;
}

const Checklists: React.FC = () => {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchChecklists();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const tasks = await mobileService.getPendingTasks();

      // Convert pending tasks to checklists format
      const checklistData: Checklist[] = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        type: task.type,
        dueDate: task.dueDate,
        tasks: generateMockTasks(task.id, task.total, task.completed),
      }));

      setChecklists(checklistData);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock tasks for demo
  const generateMockTasks = (
    checklistId: string,
    total: number,
    completed: number
  ): ChecklistTask[] => {
    const taskNames = [
      'Unlock doors',
      'Turn on lights',
      'Check temperature',
      'Inspect play areas',
      'Prepare feeding stations',
      'Check water bowls',
      'Clean kennels',
      'Medication prep',
      'Safety inspection',
      'Log morning notes',
    ];

    return Array.from({ length: total }, (_, i) => ({
      id: `${checklistId}-task-${i}`,
      title: taskNames[i] || `Task ${i + 1}`,
      completed: i < completed,
      completedAt: i < completed ? new Date().toISOString() : undefined,
      completedBy: i < completed ? user?.firstName : undefined,
    }));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleToggleTask = (checklistId: string, taskId: string) => {
    setChecklists((prev) =>
      prev.map((checklist) => {
        if (checklist.id === checklistId) {
          return {
            ...checklist,
            tasks: checklist.tasks.map((task) => {
              if (task.id === taskId) {
                return {
                  ...task,
                  completed: !task.completed,
                  completedAt: !task.completed
                    ? new Date().toISOString()
                    : undefined,
                  completedBy: !task.completed ? user?.firstName : undefined,
                };
              }
              return task;
            }),
          };
        }
        return checklist;
      })
    );
  };

  const getProgress = (checklist: Checklist) => {
    const completed = checklist.tasks.filter((t) => t.completed).length;
    const total = checklist.tasks.length;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box>
        <MobileHeader title="Checklists" showNotifications />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <MobileHeader title="Checklists" showNotifications />

      <Box sx={{ p: 2, pb: 10 }}>
        {checklists.length === 0 ? (
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No checklists assigned
              </Typography>
            </CardContent>
          </Card>
        ) : (
          checklists.map((checklist) => {
            const progress = getProgress(checklist);
            const isExpanded = expandedId === checklist.id;
            const statusColor = getStatusColor(progress.percentage);

            return (
              <Card key={checklist.id} elevation={1} sx={{ mb: 2 }}>
                <CardContent sx={{ pb: 1 }}>
                  <ListItemButton
                    onClick={() => handleToggleExpand(checklist.id)}
                    sx={{ px: 0, borderRadius: 1 }}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor:
                            progress.percentage === 100
                              ? 'success.light'
                              : 'primary.light',
                          width: 40,
                          height: 40,
                        }}
                      >
                        {progress.percentage === 100 ? (
                          <CompleteIcon />
                        ) : (
                          <IncompleteIcon />
                        )}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={checklist.title}
                      secondary={`${progress.completed}/${progress.total} tasks completed`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`${Math.round(progress.percentage)}%`}
                      size="small"
                      color={statusColor}
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        transform: isExpanded
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.3s',
                      }}
                    >
                      <ExpandIcon />
                    </IconButton>
                  </ListItemButton>

                  <LinearProgress
                    variant="determinate"
                    value={progress.percentage}
                    color={statusColor}
                    sx={{ mt: 1, mb: 2, borderRadius: 1, height: 6 }}
                  />

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {checklist.tasks.map((task, index) => (
                        <React.Fragment key={task.id}>
                          <ListItem
                            disablePadding
                            secondaryAction={
                              task.completed && (
                                <IconButton edge="end" size="small">
                                  <CameraIcon fontSize="small" />
                                </IconButton>
                              )
                            }
                          >
                            <ListItemButton
                              onClick={() =>
                                handleToggleTask(checklist.id, task.id)
                              }
                              dense
                            >
                              <ListItemIcon sx={{ minWidth: 40 }}>
                                <Checkbox
                                  edge="start"
                                  checked={task.completed}
                                  tabIndex={-1}
                                  disableRipple
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={task.title}
                                secondary={
                                  task.completed && task.completedBy
                                    ? `Completed by ${task.completedBy}`
                                    : undefined
                                }
                                primaryTypographyProps={{
                                  style: {
                                    textDecoration: task.completed
                                      ? 'line-through'
                                      : 'none',
                                    color: task.completed
                                      ? 'text.secondary'
                                      : 'text.primary',
                                  },
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                          {index < checklist.tasks.length - 1 && (
                            <Box
                              sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                ml: 7,
                              }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>

      {/* Floating Action Button for adding notes/photos */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

<BottomNav />;

export default Checklists;
