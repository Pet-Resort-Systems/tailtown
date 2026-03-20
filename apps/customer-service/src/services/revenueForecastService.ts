/**
 * Revenue Forecast Service
 * Projects future revenue from confirmed reservations
 */

import { prisma } from '../config/prisma';

interface DailyForecast {
  date: string;
  boardingRevenue: number;
  daycareRevenue: number;
  groomingRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  reservationCount: number;
}

interface ForecastSummary {
  next7Days: number;
  next30Days: number;
  next90Days: number;
  dailyBreakdown: DailyForecast[];
  byServiceCategory: Record<string, number>;
}

/**
 * Get revenue forecast from future confirmed reservations
 */
export async function getRevenueForecast(
  tenantId: string,
  daysAhead: number = 30
): Promise<ForecastSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setDate(today.getDate() + daysAhead);

  // Fetch future reservations with service info
  const reservations = await prisma.reservation.findMany({
    where: {
      tenantId,
      startDate: {
        gte: today,
        lte: endDate,
      },
      status: {
        in: ['CONFIRMED', 'PENDING'],
      },
    },
    include: {
      service: {
        select: {
          name: true,
          price: true,
          serviceCategory: true,
        },
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  // Calculate daily breakdown
  const dailyMap = new Map<string, DailyForecast>();
  const categoryTotals: Record<string, number> = {};

  for (const res of reservations) {
    const dateKey = new Date(res.startDate).toISOString().split('T')[0];
    const price = res.service?.price || 0;
    const category = res.service?.serviceCategory || 'OTHER';

    // Update daily breakdown
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        boardingRevenue: 0,
        daycareRevenue: 0,
        groomingRevenue: 0,
        otherRevenue: 0,
        totalRevenue: 0,
        reservationCount: 0,
      });
    }

    const daily = dailyMap.get(dateKey)!;
    daily.totalRevenue += price;
    daily.reservationCount++;

    switch (category) {
      case 'BOARDING':
        daily.boardingRevenue += price;
        break;
      case 'DAYCARE':
        daily.daycareRevenue += price;
        break;
      case 'GROOMING':
        daily.groomingRevenue += price;
        break;
      default:
        daily.otherRevenue += price;
    }

    // Update category totals
    categoryTotals[category] = (categoryTotals[category] || 0) + price;
  }

  // Calculate period totals
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);
  const in90Days = new Date();
  in90Days.setDate(today.getDate() + 90);

  let next7Days = 0;
  let next30Days = 0;
  let next90Days = 0;

  for (const res of reservations) {
    const startDate = new Date(res.startDate);
    const price = res.service?.price || 0;

    if (startDate <= in7Days) next7Days += price;
    if (startDate <= in30Days) next30Days += price;
    if (startDate <= in90Days) next90Days += price;
  }

  // Sort daily breakdown by date
  const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    next7Days,
    next30Days,
    next90Days,
    dailyBreakdown,
    byServiceCategory: categoryTotals,
  };
}

/**
 * Get occupancy forecast (percentage of capacity booked)
 */
export async function getOccupancyForecast(
  tenantId: string,
  daysAhead: number = 30
): Promise<
  {
    date: string;
    occupancyRate: number;
    bookedKennels: number;
    totalKennels: number;
  }[]
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get total kennel count
  const totalKennels = await prisma.resource.count({
    where: {
      tenantId,
      type: 'KENNEL',
      isActive: true,
    },
  });

  if (totalKennels === 0) return [];

  const results: {
    date: string;
    occupancyRate: number;
    bookedKennels: number;
    totalKennels: number;
  }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];

    // Count reservations that overlap with this date
    const bookedKennels = await prisma.reservation.count({
      where: {
        tenantId,
        startDate: { lte: checkDate },
        endDate: { gt: checkDate },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        service: {
          serviceCategory: 'BOARDING',
        },
      },
    });

    results.push({
      date: dateStr,
      bookedKennels,
      totalKennels,
      occupancyRate: Math.round((bookedKennels / totalKennels) * 100),
    });
  }

  return results;
}

export default {
  getRevenueForecast,
  getOccupancyForecast,
};
