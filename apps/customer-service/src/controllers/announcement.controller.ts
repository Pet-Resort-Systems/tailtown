import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

interface TenantRequest extends AuthRequest {
  tenantId?: string;
}

/**
 * Get all active announcements for the current tenant
 * Returns announcements that are active and within their date range
 */
export const getActiveAnnouncements = async (
  req: TenantRequest,
  res: Response
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    // Get user ID from authenticated session (if available)
    const userId = req.user?.id;
    const now = new Date();

    // Build the query based on whether user is authenticated
    const queryOptions: any = {
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    };

    // Only include dismissals if user is authenticated
    if (userId) {
      queryOptions.include = {
        dismissals: {
          where: { userId },
        },
      };
    }

    const announcements = await prisma.announcement.findMany(queryOptions);

    // Filter out dismissed announcements for this user
    const undismissed = announcements.filter(
      (a: any) => !userId || !a.dismissals || a.dismissals.length === 0
    );

    res.json({
      success: true,
      data: undismissed,
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch announcements",
    });
  }
};

/**
 * Get all announcements (admin view)
 */
export const getAllAnnouncements = async (
  req: TenantRequest,
  res: Response
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");

    const announcements = await prisma.announcement.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    res.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error("Error fetching all announcements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch announcements",
    });
  }
};

/**
 * Create a new announcement
 */
export const createAnnouncement = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const createdBy = req.user?.id;
    const { title, message, priority, type, startDate, endDate, isActive } =
      req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: "Title and message are required",
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        tenantId,
        title,
        message,
        priority: priority || "NORMAL",
        type: type || "INFO",
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy,
      },
    });

    res.status(201).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create announcement",
    });
  }
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const { title, message, priority, type, startDate, endDate, isActive } =
      req.body;

    const announcement = await prisma.announcement.update({
      where: {
        id,
      },
      data: {
        ...(title && { title }),
        ...(message && { message }),
        ...(priority && { priority }),
        ...(type && { type }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update announcement",
    });
  }
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");

    await prisma.announcement.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete announcement",
    });
  }
};

/**
 * Dismiss an announcement for the current user
 * Requires authentication
 */
export const dismissAnnouncement = async (
  req: TenantRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const userId = req.user?.id;

    // Require authentication for dismissals
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required to dismiss announcements",
      });
    }

    // Check if already dismissed
    const existing = await prisma.announcementDismissal.findUnique({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId,
        },
      },
    });

    if (existing) {
      return res.json({
        success: true,
        message: "Already dismissed",
      });
    }

    await prisma.announcementDismissal.create({
      data: {
        tenantId,
        announcementId: id,
        userId,
      },
    });

    res.json({
      success: true,
      message: "Announcement dismissed",
    });
  } catch (error) {
    console.error("Error dismissing announcement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to dismiss announcement",
    });
  }
};
