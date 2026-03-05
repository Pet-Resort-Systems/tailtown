import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, ErrorType } from '../middleware/error.middleware';

const prisma = new PrismaClient();

/**
 * Get all channels for the current staff member
 */
export const getChannels = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const staffId = req.user?.id;

    if (!staffId) {
      return next(new AppError('Staff ID is required', 401, ErrorType.AUTHENTICATION_ERROR));
    }

    // Get channels where user is a member
    const channels = await prisma.communicationChannel.findMany({
      where: {
        tenantId,
        isArchived: false,
        members: {
          some: {
            staffId,
            leftAt: null
          }
        }
      },
      include: {
        members: {
          where: {
            staffId,
            leftAt: null
          },
          select: {
            lastReadAt: true,
            lastReadMessageId: true,
            isMuted: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    // Calculate unread count for each channel
    const channelsWithUnread = await Promise.all(
      channels.map(async (channel) => {
        const member = channel.members[0];
        const lastMessage = channel.messages[0];
        
        let unreadCount = 0;
        if (member?.lastReadAt && lastMessage) {
          unreadCount = await prisma.channelMessage.count({
            where: {
              channelId: channel.id,
              createdAt: { gt: member.lastReadAt },
              senderId: { not: staffId } // Don't count own messages
            }
          });
        } else if (!member?.lastReadAt && channel._count.messages > 0) {
          // Never read, count all messages except own
          unreadCount = await prisma.channelMessage.count({
            where: {
              channelId: channel.id,
              senderId: { not: staffId }
            }
          });
        }

        return {
          id: channel.id,
          name: channel.name,
          displayName: channel.displayName,
          description: channel.description,
          type: channel.type,
          icon: channel.icon,
          color: channel.color,
          isDefault: channel.isDefault,
          isMuted: member?.isMuted || false,
          unreadCount,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId
          } : null,
          messageCount: channel._count.messages
        };
      })
    );

    res.json(channelsWithUnread);
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for a specific channel
 */
export const getChannelMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const staffId = req.user?.id;
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    if (!staffId) {
      return next(new AppError('Staff ID is required', 401, ErrorType.AUTHENTICATION_ERROR));
    }

    // Verify user is a member of the channel
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        staffId,
        leftAt: null
      }
    });

    if (!membership) {
      return next(new AppError('Not a member of this channel', 403, ErrorType.AUTHORIZATION_ERROR));
    }

    // Get messages
    const messages = await prisma.channelMessage.findMany({
      where: {
        channelId,
        ...(before && { createdAt: { lt: new Date(before as string) } })
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        reactions: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        mentions: true,
        attachments: true
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message to a channel
 */
export const sendChannelMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const staffId = req.user?.id;
    const { channelId } = req.params;
    const { content, mentions } = req.body;

    if (!staffId) {
      return next(new AppError('Staff ID is required', 401, ErrorType.AUTHENTICATION_ERROR));
    }

    if (!content || content.trim().length === 0) {
      return next(new AppError('Message content is required', 400, ErrorType.VALIDATION_ERROR));
    }

    // Verify user is a member of the channel
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        staffId,
        leftAt: null
      }
    });

    if (!membership) {
      return next(new AppError('Not a member of this channel', 403, ErrorType.AUTHORIZATION_ERROR));
    }

    // Create message
    const message = await prisma.channelMessage.create({
      data: {
        channelId,
        senderId: staffId,
        content: content.trim(),
        mentions: mentions && mentions.length > 0 ? {
          create: mentions.map((mentionedStaffId: string) => ({
            staffId: mentionedStaffId
          }))
        } : undefined
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        mentions: true
      }
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark channel as read
 */
export const markChannelAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffId = req.user?.id;
    const { channelId } = req.params;

    if (!staffId) {
      return next(new AppError('Staff ID is required', 401, ErrorType.AUTHENTICATION_ERROR));
    }

    // Get the latest message in the channel
    const latestMessage = await prisma.channelMessage.findFirst({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });

    // Update member's last read time
    await prisma.channelMember.updateMany({
      where: {
        channelId,
        staffId,
        leftAt: null
      },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: latestMessage?.id
      }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count across all channels
 */
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const staffId = req.user?.id;

    if (!staffId) {
      return next(new AppError('Staff ID is required', 401, ErrorType.AUTHENTICATION_ERROR));
    }

    // Get all channels user is a member of
    const memberships = await prisma.channelMember.findMany({
      where: {
        staffId,
        leftAt: null,
        channel: {
          tenantId,
          isArchived: false
        }
      },
      select: {
        channelId: true,
        lastReadAt: true
      }
    });

    let totalUnread = 0;

    for (const membership of memberships) {
      if (membership.lastReadAt) {
        const unread = await prisma.channelMessage.count({
          where: {
            channelId: membership.channelId,
            createdAt: { gt: membership.lastReadAt },
            senderId: { not: staffId }
          }
        });
        totalUnread += unread;
      } else {
        // Never read, count all messages except own
        const unread = await prisma.channelMessage.count({
          where: {
            channelId: membership.channelId,
            senderId: { not: staffId }
          }
        });
        totalUnread += unread;
      }
    }

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    next(error);
  }
};
