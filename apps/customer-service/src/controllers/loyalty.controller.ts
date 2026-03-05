import { Request, Response, NextFunction } from 'express';
import { PrismaClient, PointEarningType, RedemptionType, TierLevel } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get or create loyalty member
export const getMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    
    let member = await prisma.loyaltyMember.findUnique({
      where: { customerId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        redemptions: { orderBy: { redeemedAt: 'desc' }, take: 10 }
      }
    });
    
    if (!member) {
      member = await prisma.loyaltyMember.create({
        data: { customerId },
        include: { transactions: true, redemptions: true }
      });
    }
    
    res.status(200).json({ status: 'success', data: member });
  } catch (error) {
    next(error);
  }
};

// Add points
export const addPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { points, type, description, referenceId } = req.body;
    
    if (!points || !type || !description) {
      return next(new AppError('Missing required fields', 400));
    }
    
    let member = await prisma.loyaltyMember.findUnique({ where: { customerId } });
    
    if (!member) {
      member = await prisma.loyaltyMember.create({ data: { customerId } });
    }
    
    const [transaction, updatedMember] = await prisma.$transaction([
      prisma.pointTransaction.create({
        data: { memberId: member.id, points, type, description, referenceId }
      }),
      prisma.loyaltyMember.update({
        where: { id: member.id },
        data: {
          currentPoints: { increment: points },
          lifetimePoints: { increment: points },
          lastActivityAt: new Date()
        }
      })
    ]);
    
    // Check tier upgrade
    const newTier = calculateTier(updatedMember.lifetimePoints);
    if (newTier !== updatedMember.currentTier) {
      await prisma.loyaltyMember.update({
        where: { id: member.id },
        data: { currentTier: newTier }
      });
    }
    
    res.status(201).json({ status: 'success', data: { transaction, member: updatedMember } });
  } catch (error) {
    next(error);
  }
};

// Redeem points
export const redeemPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { pointsToRedeem, redemptionType, value, description, reservationId } = req.body;
    
    if (!pointsToRedeem || !redemptionType || value === undefined || !description) {
      return next(new AppError('Missing required fields', 400));
    }
    
    const member = await prisma.loyaltyMember.findUnique({ where: { customerId } });
    
    if (!member) {
      return next(new AppError('Member not found', 404));
    }
    
    if (member.currentPoints < pointsToRedeem) {
      return next(new AppError('Insufficient points', 400));
    }
    
    const [redemption, updatedMember] = await prisma.$transaction([
      prisma.pointRedemption.create({
        data: {
          memberId: member.id,
          pointsRedeemed: pointsToRedeem,
          redemptionType,
          value,
          description,
          reservationId
        }
      }),
      prisma.loyaltyMember.update({
        where: { id: member.id },
        data: {
          currentPoints: { decrement: pointsToRedeem },
          lastActivityAt: new Date()
        }
      })
    ]);
    
    res.status(201).json({ status: 'success', data: { redemption, member: updatedMember } });
  } catch (error) {
    next(error);
  }
};

// Get member stats
export const getMemberStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    
    const member = await prisma.loyaltyMember.findUnique({
      where: { customerId },
      include: {
        transactions: true,
        redemptions: true
      }
    });
    
    if (!member) {
      return next(new AppError('Member not found', 404));
    }
    
    const totalEarned = member.transactions.reduce((sum, t) => sum + t.points, 0);
    const totalRedeemed = member.redemptions.reduce((sum, r) => sum + r.pointsRedeemed, 0);
    const nextTier = getNextTier(member.currentTier);
    const pointsToNextTier = nextTier ? getTierMinPoints(nextTier) - member.lifetimePoints : 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        currentPoints: member.currentPoints,
        lifetimePoints: member.lifetimePoints,
        currentTier: member.currentTier,
        totalEarned,
        totalRedeemed,
        nextTier,
        pointsToNextTier: Math.max(0, pointsToNextTier),
        transactionCount: member.transactions.length,
        redemptionCount: member.redemptions.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all members (admin)
export const getAllMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const members = await prisma.loyaltyMember.findMany({
      skip,
      take: limit,
      orderBy: { lifetimePoints: 'desc' }
    });
    
    const total = await prisma.loyaltyMember.count();
    
    res.status(200).json({
      status: 'success',
      results: members.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: members
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function calculateTier(lifetimePoints: number): TierLevel {
  if (lifetimePoints >= 10000) return 'DIAMOND';
  if (lifetimePoints >= 5000) return 'PLATINUM';
  if (lifetimePoints >= 2000) return 'GOLD';
  if (lifetimePoints >= 500) return 'SILVER';
  return 'BRONZE';
}

function getNextTier(currentTier: TierLevel): TierLevel | null {
  const tiers: TierLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

function getTierMinPoints(tier: TierLevel): number {
  const points = { BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, DIAMOND: 10000 };
  return points[tier];
}
