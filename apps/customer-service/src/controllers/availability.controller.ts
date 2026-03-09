import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Check availability for date range
export const checkAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      startDate,
      endDate,
      serviceId,
      suiteType,
      numberOfPets = 1
    } = req.body;
    
    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get all resources (suites)
    const resources = await prisma.resource.findMany({
      where: {
        isActive: true,
        ...(suiteType && { type: suiteType })
      }
    });
    
    // Get conflicting reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } }
            ]
          }
        ]
      }
    });
    
    // Check which suites are available
    const availableSuites = resources.filter(resource => {
      const hasConflict = reservations.some(reservation => 
        reservation.resourceId === resource.id
      );
      return !hasConflict;
    });
    
    const isAvailable = availableSuites.length > 0;
    const status = isAvailable ? 'AVAILABLE' : 
                   availableSuites.length > 0 ? 'PARTIALLY_AVAILABLE' : 'UNAVAILABLE';
    
    res.status(200).json({
      status: 'success',
      data: {
        isAvailable,
        status,
        message: isAvailable ? 
          `${availableSuites.length} suite(s) available` : 
          'No suites available for selected dates',
        availableSuites: availableSuites.map(suite => ({
          suiteId: suite.id,
          suiteName: suite.name,
          suiteType: suite.type,
          capacity: suite.capacity || 1,
          isAvailable: true
        })),
        waitlistAvailable: !isAvailable
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get availability calendar for a month
export const getAvailabilityCalendar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { year, month, suiteType } = req.query;
    
    if (!year || !month) {
      return next(new AppError('Year and month are required', 400));
    }
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);
    
    // Get all resources
    const resources = await prisma.resource.findMany({
      where: {
        isActive: true,
        ...(suiteType && { type: suiteType as any })
      }
    });
    
    const totalCount = resources.length;
    
    // Get reservations for the month
    const reservations = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } }
            ]
          }
        ]
      }
    });
    
    // Build calendar
    const calendar: any[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Count occupied suites for this date
      const occupiedSuites = reservations.filter(res => {
        const resStart = new Date(res.startDate);
        const resEnd = new Date(res.endDate);
        return currentDate >= resStart && currentDate <= resEnd;
      }).map(res => res.resourceId);
      
      const availableCount = totalCount - occupiedSuites.length;
      const availableSuites = resources
        .filter(r => !occupiedSuites.includes(r.id))
        .map(r => r.id);
      
      let status: string;
      if (availableCount === 0) status = 'UNAVAILABLE';
      else if (availableCount < totalCount / 2) status = 'PARTIALLY_AVAILABLE';
      else status = 'AVAILABLE';
      
      calendar.push({
        date: dateStr,
        status,
        availableCount,
        totalCount,
        availableSuites
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        month: Number(month),
        year: Number(year),
        dates: calendar
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get suite availability for specific dates
export const getSuiteAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { suiteId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }
    
    const suite = await prisma.resource.findUnique({
      where: { id: suiteId }
    });
    
    if (!suite) {
      return next(new AppError('Suite not found', 404));
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Check for conflicting reservations
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        resourceId: suiteId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } }
            ]
          }
        ]
      }
    });
    
    const isAvailable = conflictingReservations.length === 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        suiteId: suite.id,
        suiteName: suite.name,
        suiteType: suite.type,
        capacity: suite.capacity || 1,
        isAvailable,
        conflictingReservations: conflictingReservations.map(res => ({
          id: res.id,
          startDate: res.startDate,
          endDate: res.endDate
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get alternative dates if requested dates unavailable
export const getAlternativeDates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, suiteType, daysToCheck = 14 } = req.body;
    
    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }
    
    const requestedStart = new Date(startDate);
    const requestedEnd = new Date(endDate);
    const duration = Math.ceil((requestedEnd.getTime() - requestedStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get all resources
    const resources = await prisma.resource.findMany({
      where: {
        isActive: true,
        ...(suiteType && { type: suiteType })
      }
    });
    
    // Calculate date range for all alternatives upfront
    const earliestDate = new Date(requestedStart);
    earliestDate.setDate(earliestDate.getDate() - Number(daysToCheck));
    const latestDate = new Date(requestedStart);
    latestDate.setDate(latestDate.getDate() + Number(daysToCheck) + duration);
    
    // Batch fetch ALL reservations in the entire date range (prevents N+1 query)
    const allReservations = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            AND: [
              { startDate: { lte: latestDate } },
              { endDate: { gte: earliestDate } }
            ]
          }
        ]
      },
      select: {
        resourceId: true,
        startDate: true,
        endDate: true
      }
    });
    
    const alternatives: any[] = [];
    
    // Check dates before and after using pre-fetched data
    for (let offset = 1; offset <= Number(daysToCheck); offset++) {
      // Check before
      const beforeStart = new Date(requestedStart);
      beforeStart.setDate(beforeStart.getDate() - offset);
      const beforeEnd = new Date(beforeStart);
      beforeEnd.setDate(beforeEnd.getDate() + duration);
      
      const beforeReservations = allReservations.filter(res =>
        res.startDate <= beforeEnd && res.endDate >= beforeStart
      );
      
      const beforeAvailable = resources.filter(r => 
        !beforeReservations.some(res => res.resourceId === r.id)
      );
      
      if (beforeAvailable.length > 0) {
        alternatives.push({
          startDate: beforeStart.toISOString().split('T')[0],
          endDate: beforeEnd.toISOString().split('T')[0],
          availableCount: beforeAvailable.length,
          daysFromRequested: -offset
        });
      }
      
      // Check after
      const afterStart = new Date(requestedStart);
      afterStart.setDate(afterStart.getDate() + offset);
      const afterEnd = new Date(afterStart);
      afterEnd.setDate(afterEnd.getDate() + duration);
      
      const afterReservations = allReservations.filter(res =>
        res.startDate <= afterEnd && res.endDate >= afterStart
      );
      
      const afterAvailable = resources.filter(r => 
        !afterReservations.some(res => res.resourceId === r.id)
      );
      
      if (afterAvailable.length > 0) {
        alternatives.push({
          startDate: afterStart.toISOString().split('T')[0],
          endDate: afterEnd.toISOString().split('T')[0],
          availableCount: afterAvailable.length,
          daysFromRequested: offset
        });
      }
      
      // Stop if we found enough alternatives
      if (alternatives.length >= 5) break;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        requestedDates: {
          startDate,
          endDate
        },
        alternatives: alternatives.slice(0, 5)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Batch check availability for multiple dates
export const batchCheckAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dates, suiteType } = req.body;
    
    if (!dates || !Array.isArray(dates)) {
      return next(new AppError('Dates array is required', 400));
    }
    
    // Get all resources
    const resources = await prisma.resource.findMany({
      where: {
        isActive: true,
        ...(suiteType && { type: suiteType })
      }
    });
    
    const totalCount = resources.length;
    
    // Get all reservations that might conflict
    const allDates = dates.map(d => new Date(d));
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const reservations = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            AND: [
              { startDate: { lte: maxDate } },
              { endDate: { gte: minDate } }
            ]
          }
        ]
      }
    });
    
    // Check each date
    const results = dates.map(dateStr => {
      const date = new Date(dateStr);
      
      const occupiedSuites = reservations.filter(res => {
        const resStart = new Date(res.startDate);
        const resEnd = new Date(res.endDate);
        return date >= resStart && date <= resEnd;
      }).map(res => res.resourceId);
      
      const availableCount = totalCount - occupiedSuites.length;
      const availableSuites = resources
        .filter(r => !occupiedSuites.includes(r.id))
        .map(r => r.id);
      
      let status: string;
      if (availableCount === 0) status = 'UNAVAILABLE';
      else if (availableCount < totalCount / 2) status = 'PARTIALLY_AVAILABLE';
      else status = 'AVAILABLE';
      
      return {
        date: dateStr,
        status,
        availableCount,
        totalCount,
        availableSuites
      };
    });
    
    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
};
