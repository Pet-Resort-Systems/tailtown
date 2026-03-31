import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Badge,
  Divider,
  Paper,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  Fab,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';
import { useAuth } from '../../contexts/AuthContext';
import messagingService, {
  Channel,
  Message,
} from '../../services/messagingService';
import { Staff } from '../../services/staffService';

type ViewMode = 'channels' | 'chat' | 'staff-directory';

const TeamChat: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [tabValue, setTabValue] = useState(0);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [staffDirectory, setStaffDirectory] = useState<Staff[]>([]);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchChannels();
      fetchStaffDirectory();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]);

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      scrollToBottom();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages]
  );

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const channelData = await messagingService.getChannels();
      setChannels(channelData);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDirectory = async () => {
    try {
      const staff = await messagingService.getStaffDirectory();
      // Filter out current user and inactive staff
      const activeStaff = staff.filter((s) => s.id !== user?.id && s.isActive);
      setStaffDirectory(activeStaff);
    } catch (error) {
      console.error('Error fetching staff directory:', error);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const messageData = await messagingService.getChannelMessages(channelId);
      setMessages(messageData);
      // Mark channel as read
      await messagingService.markChannelAsRead(channelId);
      // Refresh channels to update unread count
      fetchChannels();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || sendingMessage) return;

    try {
      setSendingMessage(true);
      const message = await messagingService.sendMessage(
        selectedChannel.id,
        newMessage.trim()
      );
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      // Refresh channels to update last message
      fetchChannels();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBack = () => {
    setSelectedChannel(null);
    setMessages([]);
    setViewMode('channels');
  };

  const handleStartDirectMessage = async (staff: Staff) => {
    try {
      setLoading(true);
      setShowStaffDialog(false);
      const channel = await messagingService.getOrCreateDirectMessage(
        staff.id!
      );
      setSelectedChannel(channel);
      setViewMode('chat');
      await fetchMessages(channel.id);
    } catch (error) {
      console.error('Error starting direct message:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatMessageTime = (date: Date | string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box>
        <MobileHeader title="Team Chat" showNotifications />
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

  // Channel list view
  if (viewMode === 'channels') {
    // Direct messages are PRIVATE channels with names starting with "dm-"
    const groupChannels = channels.filter((c) => !c.name.startsWith('dm-'));
    const directChannels = channels.filter((c) => c.name.startsWith('dm-'));

    return (
      <Box sx={{ pb: 8 }}>
        <MobileHeader title="Team Chat" showNotifications />

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<GroupIcon />} label="Channels" />
          <Tab icon={<PersonIcon />} label="Direct" />
        </Tabs>

        {tabValue === 0 && (
          <List sx={{ p: 0 }}>
            {groupChannels.map((channel, index) => (
              <React.Fragment key={channel.id}>
                <ListItemButton
                  onClick={() => {
                    setSelectedChannel(channel);
                    setViewMode('chat');
                  }}
                  sx={{ py: 2, px: 2 }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={channel.unreadCount}
                      color="error"
                      max={99}
                    >
                      <Avatar
                        sx={{
                          bgcolor: channel.color || 'primary.light',
                          fontSize: '1.5rem',
                        }}
                      >
                        {channel.icon || channel.displayName.charAt(0)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={channel.displayName}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {channel.lastMessage?.content || 'No messages yet'}
                        </Typography>
                        {channel.lastMessage &&
                          ` — ${formatMessageTime(
                            channel.lastMessage.createdAt
                          )}`}
                      </>
                    }
                    primaryTypographyProps={{
                      fontWeight: channel.unreadCount > 0 ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      component: 'span',
                      variant: 'body2',
                      sx: {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                      },
                    }}
                  />
                </ListItemButton>
                {index < groupChannels.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        )}

        {tabValue === 1 && (
          <>
            <List sx={{ p: 0 }}>
              {directChannels.map((channel, index) => (
                <React.Fragment key={channel.id}>
                  <ListItemButton
                    onClick={() => {
                      setSelectedChannel(channel);
                      setViewMode('chat');
                    }}
                    sx={{ py: 2, px: 2 }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={channel.unreadCount}
                        color="error"
                        max={99}
                      >
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {channel.displayName.charAt(0)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={channel.displayName}
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {channel.lastMessage?.content || 'No messages yet'}
                          </Typography>
                          {channel.lastMessage &&
                            ` — ${formatMessageTime(
                              channel.lastMessage.createdAt
                            )}`}
                        </>
                      }
                      primaryTypographyProps={{
                        fontWeight: channel.unreadCount > 0 ? 600 : 400,
                      }}
                      secondaryTypographyProps={{
                        component: 'span',
                        variant: 'body2',
                        sx: {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                        },
                      }}
                    />
                  </ListItemButton>
                  {index < directChannels.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>

            <Fab
              color="primary"
              aria-label="new message"
              sx={{ position: 'fixed', bottom: 80, right: 16 }}
              onClick={() => setShowStaffDialog(true)}
            >
              <AddIcon />
            </Fab>

            <Dialog
              open={showStaffDialog}
              onClose={() => setShowStaffDialog(false)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>Start a Conversation</DialogTitle>
              <DialogContent>
                <List>
                  {staffDirectory.map((staff) => (
                    <ListItemButton
                      key={staff.id}
                      onClick={() => handleStartDirectMessage(staff)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {staff.firstName.charAt(0)}
                          {staff.lastName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${staff.firstName} ${staff.lastName}`}
                        secondary={staff.position || staff.role}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </DialogContent>
            </Dialog>
          </>
        )}

        <BottomNav />
      </Box>
    );
  }

  // Chat view
  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100vh', pb: 0 }}
    >
      {/* Chat Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
        }}
      >
        <IconButton edge="start" onClick={handleBack} sx={{ mr: 1 }}>
          <BackIcon />
        </IconButton>
        <Avatar
          sx={{
            bgcolor: selectedChannel?.color || 'primary.light',
            mr: 2,
            fontSize: '1.2rem',
          }}
        >
          {selectedChannel?.icon || selectedChannel?.displayName.charAt(0)}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {selectedChannel?.displayName}
          </Typography>
          {selectedChannel?.description && (
            <Typography variant="caption" color="text.secondary">
              {selectedChannel.description}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Messages */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          backgroundColor: '#f5f5f5',
        }}
      >
        {messages.map((message) => {
          const isCurrentUser = message.senderId === user?.id;
          const senderName = `${message.sender.firstName} ${message.sender.lastName}`;

          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              {!isCurrentUser && (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1,
                    fontSize: '0.875rem',
                    bgcolor: 'secondary.main',
                  }}
                >
                  {message.sender.firstName.charAt(0)}
                  {message.sender.lastName.charAt(0)}
                </Avatar>
              )}
              <Box sx={{ maxWidth: '70%' }}>
                {!isCurrentUser && (
                  <Typography
                    variant="caption"
                    sx={{ ml: 1, color: 'text.secondary' }}
                  >
                    {senderName}
                  </Typography>
                )}
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    backgroundColor: isCurrentUser ? 'primary.main' : 'white',
                    color: isCurrentUser ? 'white' : 'text.primary',
                    borderRadius: 2,
                    borderTopLeftRadius: !isCurrentUser ? 0 : 2,
                    borderTopRightRadius: isCurrentUser ? 0 : 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                </Paper>
                <Typography
                  variant="caption"
                  sx={{
                    ml: 1,
                    color: 'text.secondary',
                    display: 'block',
                    mt: 0.5,
                  }}
                >
                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sendingMessage}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default TeamChat;
