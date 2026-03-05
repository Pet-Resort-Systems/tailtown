/**
 * Operational Report Service
 * Generates operational metrics and efficiency reports
 */

import { PrismaClient } from '@prisma/client';
import {
  StaffPerformance,
  ResourceUtilization,
  BookingPattern,
  CapacityAnalysis
} from '../types/reports.types';

const prisma = new PrismaClient();

/**
 * Get staff performance report
 */
export const getStaffPerformanceReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<StaffPerformance[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Get all staff members
  const staff = await prisma.staff.findMany({
    where: { tenantId }
  });
  
  const staffPerformance: StaffPerformance[] = [];
  
  for (const member of staff) {
    // For now, return basic staff info
    // In a full implementation, this would include:
    // - Services completed
    // - Revenue generated
    // - Average service time
    // - Customer ratings
    
    staffPerformance.push({
      staffId: member.id,
      staffName: `${member.firstName} ${member.lastName}`,
      role: member.role,
      servicesCompleted: 0,
      revenue: 0,
      averageServiceTime: 0,
      customerRating: 0,
      efficiency: 0
    });
  }
  
  return staffPerformance;
};

/**
 * Get resource utilization report
 */
export const getResourceUtilizationReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<ResourceUtilization[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // This would require reservation service data
  // Placeholder implementation
  
  return [];
};

/**
 * Get booking patterns report
 */
export const getBookingPatternsReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<BookingPattern[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Get all reservations in date range
  const reservations = await prisma.reservation.findMany({
    where: {
      tenantId,
      startDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      invoice: true
    }
  });
  
  // Aggregate by day of week and hour
  const patternMap = new Map<string, {
    count: number;
    revenue: number;
  }>();
  
  for (const reservation of reservations) {
    const dayOfWeek = reservation.startDate.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = reservation.startDate.getHours();
    const key = `${dayOfWeek}-${hour}`;
    
    // Calculate revenue from invoice if it exists and is paid
    const revenue = (reservation.invoice && reservation.invoice.status === 'PAID') 
      ? reservation.invoice.total 
      : 0;
    
    const existing = patternMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.revenue += revenue;
    } else {
      patternMap.set(key, {
        count: 1,
        revenue
      });
    }
  }
  
  // Convert to array
  const patterns: BookingPattern[] = [];
  for (const [key, data] of patternMap.entries()) {
    const [dayOfWeek, hourStr] = key.split('-');
    const hour = parseInt(hourStr);
    
    patterns.push({
      dayOfWeek,
      hour,
      bookingCount: data.count,
      revenue: data.revenue,
      averageBookingValue: data.count > 0 ? data.revenue / data.count : 0
    });
  }
  
  return patterns.sort((a, b) => {
    // Sort by day of week, then hour
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCompare = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayCompare !== 0) return dayCompare;
    return a.hour - b.hour;
  });
};

/**
 * Get capacity analysis report
 */
export const getCapacityAnalysisReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CapacityAnalysis[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // This would require resource and reservation data from reservation service
  // Placeholder implementation
  
  const capacityData: CapacityAnalysis[] = [];
  
  // Generate daily capacity analysis
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Get reservations for this date
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const reservations = await prisma.reservation.count({
      where: {
        tenantId,
        startDate: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    });
    
    // Placeholder capacity (would come from resource service)
    const totalCapacity = 166; // Total kennels
    const bookedCapacity = reservations;
    const availableCapacity = totalCapacity - bookedCapacity;
    const utilizationRate = totalCapacity > 0 ? (bookedCapacity / totalCapacity) * 100 : 0;
    
    capacityData.push({
      date: dateStr,
      totalCapacity,
      bookedCapacity,
      availableCapacity,
      utilizationRate,
      revenue: 0, // Would calculate from invoices
      potentialRevenue: 0 // Would calculate based on average rates
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return capacityData;
};
