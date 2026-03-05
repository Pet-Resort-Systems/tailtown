import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Note: Deposit configuration is stored as JSON in a simple config table
// This is a lightweight implementation focused on CRUD operations

// Get deposit configuration
export const getDepositConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For now, return a default config structure
    // In production, this would be stored in a deposits_config table
    const config = {
      id: 'default',
      tenantId: 'dev',
      isEnabled: true,
      rules: [],
      defaultDepositRequired: false,
      allowPartialPayments: true,
      sendDepositReminders: true,
      reminderDaysBefore: [7, 3, 1]
    };
    
    res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    next(error);
  }
};

// Update deposit configuration
export const updateDepositConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = req.body;
    
    // Validate required fields
    if (!config.isEnabled === undefined) {
      return next(new AppError('isEnabled is required', 400));
    }
    
    // In production, save to database
    // For now, return the updated config
    res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    next(error);
  }
};

// Calculate deposit for a reservation
export const calculateDeposit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      totalCost,
      serviceType,
      startDate,
      bookingDate,
      isFirstTime,
      duration
    } = req.body;
    
    if (!totalCost || !serviceType || !startDate) {
      return next(new AppError('Missing required fields', 400));
    }
    
    // Simple calculation logic
    // In production, this would evaluate all rules from config
    let depositAmount = 0;
    let depositPercentage = 0;
    let depositRequired = false;
    let depositDueDate = new Date();
    
    // Example: 20% deposit for bookings over $200
    if (totalCost > 200) {
      depositRequired = true;
      depositPercentage = 20;
      depositAmount = totalCost * 0.20;
    }
    
    // Due 7 days before check-in
    const checkInDate = new Date(startDate);
    depositDueDate = new Date(checkInDate);
    depositDueDate.setDate(depositDueDate.getDate() - 7);
    
    res.status(200).json({
      status: 'success',
      data: {
        depositRequired,
        depositAmount,
        depositPercentage,
        depositDueDate,
        totalCost,
        remainingBalance: totalCost - depositAmount,
        refundPolicy: 'FULL_REFUND'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Calculate refund amount
export const calculateRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      depositAmount,
      cancellationDate,
      checkInDate,
      refundPolicy
    } = req.body;
    
    if (!depositAmount || !cancellationDate || !checkInDate) {
      return next(new AppError('Missing required fields', 400));
    }
    
    const cancelDate = new Date(cancellationDate);
    const checkIn = new Date(checkInDate);
    const daysUntilCheckIn = Math.ceil((checkIn.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let refundAmount = 0;
    let refundPercentage = 0;
    
    // Simple tiered refund logic
    if (daysUntilCheckIn >= 14) {
      refundPercentage = 100;
      refundAmount = depositAmount;
    } else if (daysUntilCheckIn >= 7) {
      refundPercentage = 50;
      refundAmount = depositAmount * 0.5;
    } else {
      refundPercentage = 0;
      refundAmount = 0;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        refundAmount,
        refundPercentage,
        daysUntilCheckIn,
        originalDeposit: depositAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Validate deposit payment
export const validateDepositPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reservationId, amount } = req.body;
    
    if (!reservationId || !amount) {
      return next(new AppError('Missing required fields', 400));
    }
    
    // In production, check against reservation and deposit requirements
    const isValid = amount > 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        isValid,
        message: isValid ? 'Deposit amount is valid' : 'Invalid deposit amount'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get deposit rules
export const getDepositRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Return empty array for now
    // In production, fetch from database
    res.status(200).json({
      status: 'success',
      data: []
    });
  } catch (error) {
    next(error);
  }
};

// Create deposit rule
export const createDepositRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = req.body;
    
    // Validate required fields
    if (!rule.name || !rule.type) {
      return next(new AppError('Name and type are required', 400));
    }
    
    // In production, save to database
    const newRule = {
      id: Math.random().toString(36).substring(7),
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    res.status(201).json({ status: 'success', data: newRule });
  } catch (error) {
    next(error);
  }
};

// Update deposit rule
export const updateDepositRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const rule = req.body;
    
    // In production, update in database
    const updatedRule = {
      id,
      ...rule,
      updatedAt: new Date()
    };
    
    res.status(200).json({ status: 'success', data: updatedRule });
  } catch (error) {
    next(error);
  }
};

// Delete deposit rule
export const deleteDepositRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // In production, delete from database
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
