import api from './api';
import staffService, { Staff } from './staffService';

export interface Channel {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'ANNOUNCEMENT' | 'ARCHIVED';
  icon?: string;
  color?: string;
  isDefault: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderId: string;
  } | null;
  messageCount: number;
  // Helper to identify direct messages (PRIVATE channels with dm- prefix)
  isDirect?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reactions?: MessageReaction[];
  mentions?: MessageMention[];
  attachments?: MessageAttachment[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  staffId: string;
  emoji: string;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface MessageMention {
  id: string;
  messageId: string;
  staffId: string;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface DirectMessageThread {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderId: string;
  };
  unreadCount: number;
}

/**
 * Messaging Service
 * Handles all messaging and team communication functionality
 */
class MessagingService {
  /**
   * Get all channels for the current user
   */
  async getChannels(): Promise<Channel[]> {
    try {
      const response = await api.get<Channel[]>('/api/messaging/channels');
      return response.data;
    } catch (error) {
      console.error('Error fetching channels:', error);
      return this.getMockChannels();
    }
  }

  /**
   * Get messages for a specific channel
   */
  async getChannelMessages(channelId: string, limit: number = 50, before?: string): Promise<Message[]> {
    try {
      const params: any = { limit };
      if (before) params.before = before;
      
      const response = await api.get<Message[]>(`/api/messaging/channels/${channelId}/messages`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching messages for channel ${channelId}:`, error);
      return [];
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: string, content: string, mentions?: string[]): Promise<Message> {
    try {
      const response = await api.post<Message>(`/api/messaging/channels/${channelId}/messages`, {
        content,
        mentions
      });
      return response.data;
    } catch (error) {
      console.error(`Error sending message to channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a channel as read
   */
  async markChannelAsRead(channelId: string): Promise<void> {
    try {
      await api.post(`/api/messaging/channels/${channelId}/read`);
    } catch (error) {
      console.error(`Error marking channel ${channelId} as read:`, error);
    }
  }

  /**
   * Get total unread message count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get<{ unreadCount: number }>('/api/messaging/unread-count');
      return response.data.unreadCount;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Get all staff members for direct messaging
   */
  async getStaffDirectory(): Promise<Staff[]> {
    try {
      return await staffService.getAllStaff();
    } catch (error) {
      console.error('Error fetching staff directory:', error);
      return [];
    }
  }

  /**
   * Get or create a direct message channel with another staff member
   */
  async getOrCreateDirectMessage(otherStaffId: string): Promise<Channel> {
    try {
      const response = await api.post<Channel>('/api/messaging/direct', {
        recipientId: otherStaffId
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating direct message with staff ${otherStaffId}:`, error);
      throw error;
    }
  }

  /**
   * Get all direct message threads
   */
  async getDirectMessageThreads(): Promise<DirectMessageThread[]> {
    try {
      const response = await api.get<DirectMessageThread[]>('/api/messaging/direct');
      return response.data;
    } catch (error) {
      console.error('Error fetching direct message threads:', error);
      return [];
    }
  }

  /**
   * Create a new group channel
   */
  async createChannel(data: {
    name: string;
    displayName: string;
    description?: string;
    type: 'PUBLIC' | 'PRIVATE';
    memberIds: string[];
  }): Promise<Channel> {
    try {
      const response = await api.post<Channel>('/api/messaging/channels', data);
      return response.data;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      await api.post(`/api/messaging/messages/${messageId}/reactions`, { emoji });
    } catch (error) {
      console.error(`Error adding reaction to message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, reactionId: string): Promise<void> {
    try {
      await api.delete(`/api/messaging/messages/${messageId}/reactions/${reactionId}`);
    } catch (error) {
      console.error(`Error removing reaction from message ${messageId}:`, error);
      throw error;
    }
  }

  // Mock data for development/fallback
  private getMockChannels(): Channel[] {
    return [
      {
        id: '1',
        name: 'general',
        displayName: 'General',
        description: 'General team discussion',
        type: 'PUBLIC',
        icon: '💬',
        color: '#2196F3',
        isDefault: true,
        isMuted: false,
        unreadCount: 3,
        lastMessage: {
          content: 'Morning team! Ready for a great day',
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
          senderId: 'user1'
        },
        messageCount: 156
      },
      {
        id: '2',
        name: 'announcements',
        displayName: 'Announcements',
        description: 'Important announcements and updates',
        type: 'PUBLIC',
        icon: '📢',
        color: '#FF9800',
        isDefault: true,
        isMuted: false,
        unreadCount: 1,
        lastMessage: {
          content: 'Staff meeting at 2 PM today',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          senderId: 'user2'
        },
        messageCount: 42
      },
      {
        id: '3',
        name: 'shift-handoff',
        displayName: 'Shift Handoff',
        description: 'Shift handoff notes and updates',
        type: 'PUBLIC',
        icon: '🔄',
        color: '#4CAF50',
        isDefault: false,
        isMuted: false,
        unreadCount: 0,
        lastMessage: {
          content: 'Max needs medication at 3 PM',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          senderId: 'user3'
        },
        messageCount: 89
      },
      {
        id: '4',
        name: 'grooming-team',
        displayName: 'Grooming Team',
        description: 'Grooming department communication',
        type: 'PRIVATE',
        icon: '✂️',
        color: '#9C27B0',
        isDefault: false,
        isMuted: false,
        unreadCount: 0,
        lastMessage: {
          content: 'Appointment schedule updated',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          senderId: 'user4'
        },
        messageCount: 34
      },
      {
        id: '5',
        name: 'boarding-team',
        displayName: 'Boarding Team',
        description: 'Boarding department communication',
        type: 'PRIVATE',
        icon: '🏠',
        color: '#00BCD4',
        isDefault: false,
        isMuted: false,
        unreadCount: 2,
        lastMessage: {
          content: 'New check-in at 4 PM',
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
          senderId: 'user5'
        },
        messageCount: 67
      }
    ];
  }
}

const messagingService = new MessagingService();
export default messagingService;
