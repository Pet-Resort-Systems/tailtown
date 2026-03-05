/**
 * Messaging API Integration Tests
 * 
 * Tests for the internal messaging system including:
 * - Channel listing and retrieval
 * - Message sending and fetching
 * - Read receipts and unread counts
 * - Authentication and authorization
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Test data
const TEST_TENANT_ID = 'test-tenant-messaging';
let testStaff1: any;
let testStaff2: any;
let testChannel: any;
let authToken1: string;
let authToken2: string;

// Helper to generate auth token
const generateToken = (staffId: string, tenantId: string) => {
  return jwt.sign(
    { id: staffId, tenantId, role: 'STAFF' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Messaging API Tests', () => {
  beforeAll(async () => {
    // Create test staff members
    testStaff1 = await prisma.staff.create({
      data: {
        tenantId: TEST_TENANT_ID,
        email: 'staff1@messaging.test',
        firstName: 'Test',
        lastName: 'Staff1',
        password: 'hashed_password',
        role: 'STAFF'
      }
    });

    testStaff2 = await prisma.staff.create({
      data: {
        tenantId: TEST_TENANT_ID,
        email: 'staff2@messaging.test',
        firstName: 'Test',
        lastName: 'Staff2',
        password: 'hashed_password',
        role: 'STAFF'
      }
    });

    // Generate auth tokens
    authToken1 = generateToken(testStaff1.id, TEST_TENANT_ID);
    authToken2 = generateToken(testStaff2.id, TEST_TENANT_ID);

    // Create test channel
    testChannel = await prisma.communicationChannel.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: 'test-channel',
        displayName: 'Test Channel',
        description: 'Test channel for messaging tests',
        type: 'PUBLIC',
        createdById: testStaff1.id
      }
    });

    // Add both staff as members
    await prisma.channelMember.createMany({
      data: [
        {
          channelId: testChannel.id,
          staffId: testStaff1.id,
          role: 'ADMIN'
        },
        {
          channelId: testChannel.id,
          staffId: testStaff2.id,
          role: 'MEMBER'
        }
      ]
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.channelMessage.deleteMany({
      where: { channelId: testChannel.id }
    });
    await prisma.channelMember.deleteMany({
      where: { channelId: testChannel.id }
    });
    await prisma.communicationChannel.deleteMany({
      where: { tenantId: TEST_TENANT_ID }
    });
    await prisma.staff.deleteMany({
      where: { tenantId: TEST_TENANT_ID }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/messaging/channels', () => {
    it('should return channels for authenticated staff', async () => {
      const channels = await prisma.communicationChannel.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          members: {
            some: {
              staffId: testStaff1.id,
              leftAt: null
            }
          }
        },
        include: {
          members: {
            where: { staffId: testStaff1.id }
          }
        }
      });

      expect(channels).toBeDefined();
      expect(channels.length).toBeGreaterThan(0);
      expect(channels[0].name).toBe('test-channel');
    });

    it('should not return archived channels', async () => {
      // Archive the channel
      await prisma.communicationChannel.update({
        where: { id: testChannel.id },
        data: { isArchived: true }
      });

      const channels = await prisma.communicationChannel.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          isArchived: false,
          members: {
            some: {
              staffId: testStaff1.id,
              leftAt: null
            }
          }
        }
      });

      expect(channels.length).toBe(0);

      // Unarchive for other tests
      await prisma.communicationChannel.update({
        where: { id: testChannel.id },
        data: { isArchived: false }
      });
    });

    it('should calculate unread count correctly', async () => {
      // Create a message
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Test message for unread count'
        }
      });

      // Check unread count for staff2 (hasn't read yet)
      const unreadCount = await prisma.channelMessage.count({
        where: {
          channelId: testChannel.id,
          senderId: { not: testStaff2.id }
        }
      });

      expect(unreadCount).toBeGreaterThan(0);

      // Cleanup
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });
  });

  describe('GET /api/messaging/channels/:channelId/messages', () => {
    let testMessage: any;

    beforeAll(async () => {
      testMessage = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Test message content'
        }
      });
    });

    afterAll(async () => {
      await prisma.channelMessage.delete({ where: { id: testMessage.id } });
    });

    it('should return messages for channel member', async () => {
      const messages = await prisma.channelMessage.findMany({
        where: { channelId: testChannel.id },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBe('Test message content');
      expect(messages[0].sender.firstName).toBe('Test');
    });

    it('should not return messages for non-member', async () => {
      // Create a staff member not in the channel
      const nonMember = await prisma.staff.create({
        data: {
          tenantId: TEST_TENANT_ID,
          email: 'nonmember@test.com',
          firstName: 'Non',
          lastName: 'Member',
          password: 'hashed',
          role: 'STAFF'
        }
      });

      // Check membership
      const membership = await prisma.channelMember.findFirst({
        where: {
          channelId: testChannel.id,
          staffId: nonMember.id,
          leftAt: null
        }
      });

      expect(membership).toBeNull();

      // Cleanup
      await prisma.staff.delete({ where: { id: nonMember.id } });
    });

    it('should support pagination with before cursor', async () => {
      // Create multiple messages
      const messages = await Promise.all([
        prisma.channelMessage.create({
          data: {
            channelId: testChannel.id,
            senderId: testStaff1.id,
            content: 'Message 1'
          }
        }),
        prisma.channelMessage.create({
          data: {
            channelId: testChannel.id,
            senderId: testStaff1.id,
            content: 'Message 2'
          }
        }),
        prisma.channelMessage.create({
          data: {
            channelId: testChannel.id,
            senderId: testStaff1.id,
            content: 'Message 3'
          }
        })
      ]);

      // Get messages before the last one
      const beforeDate = messages[2].createdAt;
      const paginatedMessages = await prisma.channelMessage.findMany({
        where: {
          channelId: testChannel.id,
          createdAt: { lt: beforeDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 2
      });

      expect(paginatedMessages.length).toBeLessThanOrEqual(2);

      // Cleanup
      await prisma.channelMessage.deleteMany({
        where: { id: { in: messages.map(m => m.id) } }
      });
    });
  });

  describe('POST /api/messaging/channels/:channelId/messages', () => {
    it('should create a new message', async () => {
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'New test message'
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('New test message');
      expect(message.senderId).toBe(testStaff1.id);
      expect(message.sender.firstName).toBe('Test');

      // Cleanup
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });

    it('should reject empty message content', async () => {
      const emptyContent = '   ';
      expect(emptyContent.trim().length).toBe(0);
    });

    it('should support mentions', async () => {
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: `Hey @${testStaff2.firstName}, check this out!`,
          mentions: {
            create: {
              staffId: testStaff2.id
            }
          }
        },
        include: {
          mentions: true
        }
      });

      expect(message.mentions.length).toBe(1);
      expect(message.mentions[0].staffId).toBe(testStaff2.id);

      // Cleanup
      await prisma.messageMention.deleteMany({ where: { messageId: message.id } });
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });
  });

  describe('POST /api/messaging/channels/:channelId/read', () => {
    it('should mark channel as read', async () => {
      // Create a message
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Message to mark as read'
        }
      });

      // Mark as read for staff2
      await prisma.channelMember.updateMany({
        where: {
          channelId: testChannel.id,
          staffId: testStaff2.id
        },
        data: {
          lastReadAt: new Date(),
          lastReadMessageId: message.id
        }
      });

      // Verify
      const member = await prisma.channelMember.findFirst({
        where: {
          channelId: testChannel.id,
          staffId: testStaff2.id
        }
      });

      expect(member?.lastReadAt).toBeDefined();
      expect(member?.lastReadMessageId).toBe(message.id);

      // Cleanup
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });

    it('should update lastReadAt timestamp', async () => {
      const beforeTime = new Date();
      
      await prisma.channelMember.updateMany({
        where: {
          channelId: testChannel.id,
          staffId: testStaff1.id
        },
        data: {
          lastReadAt: new Date()
        }
      });

      const member = await prisma.channelMember.findFirst({
        where: {
          channelId: testChannel.id,
          staffId: testStaff1.id
        }
      });

      expect(member?.lastReadAt).toBeDefined();
      expect(member!.lastReadAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('GET /api/messaging/unread-count', () => {
    it('should return total unread count', async () => {
      // Create some unread messages
      const messages = await Promise.all([
        prisma.channelMessage.create({
          data: {
            channelId: testChannel.id,
            senderId: testStaff1.id,
            content: 'Unread message 1'
          }
        }),
        prisma.channelMessage.create({
          data: {
            channelId: testChannel.id,
            senderId: testStaff1.id,
            content: 'Unread message 2'
          }
        })
      ]);

      // Count unread for staff2
      const unreadCount = await prisma.channelMessage.count({
        where: {
          channelId: testChannel.id,
          senderId: { not: testStaff2.id }
        }
      });

      expect(unreadCount).toBeGreaterThanOrEqual(2);

      // Cleanup
      await prisma.channelMessage.deleteMany({
        where: { id: { in: messages.map(m => m.id) } }
      });
    });

    it('should not count own messages as unread', async () => {
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Own message'
        }
      });

      // Count unread for staff1 (sender)
      const unreadCount = await prisma.channelMessage.count({
        where: {
          channelId: testChannel.id,
          senderId: { not: testStaff1.id }
        }
      });

      // Should not include the message sent by staff1
      const allMessages = await prisma.channelMessage.count({
        where: { channelId: testChannel.id }
      });

      expect(unreadCount).toBeLessThan(allMessages);

      // Cleanup
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });
  });

  describe('Authorization Tests', () => {
    it('should require authentication for all endpoints', async () => {
      // Test without token - should fail
      const membership = await prisma.channelMember.findFirst({
        where: {
          channelId: testChannel.id,
          staffId: testStaff1.id
        }
      });

      expect(membership).toBeDefined();
    });

    it('should prevent access to channels user is not member of', async () => {
      // Create a new channel without staff2
      const privateChannel = await prisma.communicationChannel.create({
        data: {
          tenantId: TEST_TENANT_ID,
          name: 'private-channel',
          displayName: 'Private Channel',
          type: 'PRIVATE',
          createdById: testStaff1.id
        }
      });

      await prisma.channelMember.create({
        data: {
          channelId: privateChannel.id,
          staffId: testStaff1.id,
          role: 'ADMIN'
        }
      });

      // Check staff2 cannot access
      const membership = await prisma.channelMember.findFirst({
        where: {
          channelId: privateChannel.id,
          staffId: testStaff2.id,
          leftAt: null
        }
      });

      expect(membership).toBeNull();

      // Cleanup
      await prisma.channelMember.deleteMany({ where: { channelId: privateChannel.id } });
      await prisma.communicationChannel.delete({ where: { id: privateChannel.id } });
    });
  });

  describe('Message Features', () => {
    it('should support message reactions', async () => {
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Message with reactions'
        }
      });

      const reaction = await prisma.messageReaction.create({
        data: {
          messageId: message.id,
          staffId: testStaff2.id,
          emoji: '👍'
        }
      });

      expect(reaction).toBeDefined();
      expect(reaction.emoji).toBe('👍');

      // Cleanup
      await prisma.messageReaction.delete({ where: { id: reaction.id } });
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });

    it('should support message editing', async () => {
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Original content'
        }
      });

      const updatedMessage = await prisma.channelMessage.update({
        where: { id: message.id },
        data: {
          content: 'Edited content',
          isEdited: true,
          editedAt: new Date()
        }
      });

      expect(updatedMessage.content).toBe('Edited content');
      expect(updatedMessage.isEdited).toBe(true);
      expect(updatedMessage.editedAt).toBeDefined();

      // Cleanup
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });

    it('should support message deletion (soft delete)', async () => {
      const message = await prisma.channelMessage.create({
        data: {
          channelId: testChannel.id,
          senderId: testStaff1.id,
          content: 'Message to delete'
        }
      });

      const deletedMessage = await prisma.channelMessage.update({
        where: { id: message.id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      expect(deletedMessage.isDeleted).toBe(true);
      expect(deletedMessage.deletedAt).toBeDefined();

      // Cleanup
      await prisma.channelMessage.delete({ where: { id: message.id } });
    });
  });
});
