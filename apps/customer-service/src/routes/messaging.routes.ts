import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getChannels,
  getChannelMessages,
  sendChannelMessage,
  markChannelAsRead,
  getUnreadCount,
} from '../controllers/messaging.controller';

const router = express.Router();

// All messaging routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/messaging/channels
 * @desc    Get all channels for current staff member
 * @access  Private (Staff only)
 */
router.get('/channels', getChannels);

/**
 * @route   GET /api/messaging/channels/:channelId/messages
 * @desc    Get messages for a specific channel
 * @access  Private (Staff only, must be channel member)
 */
router.get('/channels/:channelId/messages', getChannelMessages);

/**
 * @route   POST /api/messaging/channels/:channelId/messages
 * @desc    Send a message to a channel
 * @access  Private (Staff only, must be channel member)
 */
router.post('/channels/:channelId/messages', sendChannelMessage);

/**
 * @route   POST /api/messaging/channels/:channelId/read
 * @desc    Mark channel as read
 * @access  Private (Staff only)
 */
router.post('/channels/:channelId/read', markChannelAsRead);

/**
 * @route   GET /api/messaging/unread-count
 * @desc    Get total unread message count
 * @access  Private (Staff only)
 */
router.get('/unread-count', getUnreadCount);

export default router;
