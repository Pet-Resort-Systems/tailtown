/**
 * Customer Report Service
 * Generates customer analytics and insights
 */

import { prisma } from '../config/prisma.js';
import {
  type CustomerAcquisitionData,
  type CustomerRetentionData,
  type CustomerLifetimeValue,
  type CustomerDemographics,
  type InactiveCustomer,
} from '../types/reports.types.js';

/**
 * Get customer acquisition report
 */
export const getCustomerAcquisitionReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CustomerAcquisitionData[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all customers
  const allCustomers = await prisma.customer.count({
    where: { tenantId },
  });

  // Get new customers in date range
  const newCustomers = await prisma.customer.count({
    where: {
      tenantId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  const acquisitionRate =
    allCustomers > 0 ? (newCustomers / allCustomers) * 100 : 0;

  return [
    {
      period: `${startDate} to ${endDate}`,
      newCustomers,
      totalCustomers: allCustomers,
      acquisitionRate,
      source: 'All Sources',
    },
  ];
};

/**
 * Get customer retention report
 */
export const getCustomerRetentionReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CustomerRetentionData[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get customers who had reservations in the period
  const customersWithReservations = await prisma.reservation.findMany({
    where: {
      tenantId,
      startDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      customerId: true,
    },
    distinct: ['customerId'],
  });

  const returningCustomers = customersWithReservations.length;

  // Get total active customers (had any reservation ever)
  const totalActiveCustomers = await prisma.reservation.findMany({
    where: { tenantId },
    select: { customerId: true },
    distinct: ['customerId'],
  });

  const totalCustomers = totalActiveCustomers.length;
  const retentionRate =
    totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
  const churnRate = 100 - retentionRate;

  return [
    {
      period: `${startDate} to ${endDate}`,
      returningCustomers,
      totalCustomers,
      retentionRate,
      churnRate,
    },
  ];
};

/**
 * Get customer lifetime value report
 */
export const getCustomerLifetimeValueReport = async (
  tenantId: string,
  limit: number = 100
): Promise<CustomerLifetimeValue[]> => {
  // Get all customers with their invoices and pets
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    include: {
      invoices: {
        where: {
          status: 'PAID',
        },
        orderBy: {
          issueDate: 'asc',
        },
      },
      pets: {
        select: {
          name: true,
        },
      },
    },
  });

  const customerValues: CustomerLifetimeValue[] = [];

  for (const customer of customers) {
    if (customer.invoices.length === 0) continue;

    const totalSpent = customer.invoices.reduce(
      (sum, inv) => sum + inv.total,
      0
    );
    const totalVisits = customer.invoices.length;
    const averageTransaction = totalVisits > 0 ? totalSpent / totalVisits : 0;

    const firstVisit = customer.invoices[0].issueDate
      .toISOString()
      .split('T')[0];
    const lastVisit = customer.invoices[customer.invoices.length - 1].issueDate
      .toISOString()
      .split('T')[0];

    // Calculate tier based on total spent
    let tier = 'Bronze';
    if (totalSpent > 5000) tier = 'Platinum';
    else if (totalSpent > 2000) tier = 'Gold';
    else if (totalSpent > 1000) tier = 'Silver';

    // Get unique pet names (avoid duplicates from sync issues)
    const uniquePetNames = [...new Set(customer.pets.map((p) => p.name))];
    const petNames = uniquePetNames.join(', ') || 'No pets';

    customerValues.push({
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      petNames,
      firstVisit,
      lastVisit,
      totalVisits,
      totalSpent,
      averageTransaction,
      lifetimeValue: totalSpent,
      tier,
    });
  }

  // Sort by lifetime value and limit
  return customerValues
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
    .slice(0, limit);
};

/**
 * Get customer demographics report
 */
export const getCustomerDemographicsReport = async (
  tenantId: string
): Promise<CustomerDemographics> => {
  // Get all customers
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    include: {
      pets: true,
    },
  });

  const totalCustomers = customers.length;

  // Aggregate by location (city)
  const locationMap = new Map<string, number>();
  for (const customer of customers) {
    const city = customer.city || 'Unknown';
    locationMap.set(city, (locationMap.get(city) || 0) + 1);
  }

  const byLocation = Array.from(locationMap.entries()).map(([city, count]) => ({
    city,
    count,
    percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
  }));

  // Aggregate by pet type
  const petTypeMap = new Map<string, number>();
  for (const customer of customers) {
    for (const pet of customer.pets) {
      const type = pet.type || 'Unknown';
      petTypeMap.set(type, (petTypeMap.get(type) || 0) + 1);
    }
  }

  const byPetType = Array.from(petTypeMap.entries()).map(
    ([petType, count]) => ({
      petType,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
    })
  );

  // Service preference (would need reservation data - placeholder)
  const byServicePreference = [
    { service: 'Boarding', count: 0, percentage: 0 },
    { service: 'Daycare', count: 0, percentage: 0 },
    { service: 'Grooming', count: 0, percentage: 0 },
  ];

  return {
    totalCustomers,
    byLocation,
    byPetType,
    byServicePreference,
  };
};

/**
 * Get inactive customers report
 */
export const getInactiveCustomersReport = async (
  tenantId: string,
  daysSinceLastVisit: number = 90
): Promise<InactiveCustomer[]> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastVisit);

  // Get customers with their last reservation
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    include: {
      reservations: {
        orderBy: {
          startDate: 'desc',
        },
        take: 1,
      },
      invoices: {
        where: {
          status: 'PAID',
        },
      },
    },
  });

  const inactiveCustomers: InactiveCustomer[] = [];

  for (const customer of customers) {
    if (customer.reservations.length === 0) continue;

    const lastVisit = customer.reservations[0].startDate;

    if (lastVisit < cutoffDate) {
      const daysSince = Math.floor(
        (new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalSpent = customer.invoices.reduce(
        (sum, inv) => sum + inv.total,
        0
      );
      const totalVisits = customer.invoices.length;

      inactiveCustomers.push({
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        lastVisit: lastVisit.toISOString().split('T')[0],
        daysSinceLastVisit: daysSince,
        totalSpent,
        totalVisits,
        email: customer.email,
        phone: customer.phone || '',
      });
    }
  }

  // Sort by days since last visit (most inactive first)
  return inactiveCustomers.sort(
    (a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit
  );
};
