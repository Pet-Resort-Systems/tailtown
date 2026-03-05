import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

/**
 * Get dashboard summary analytics data 
 * Fixed version that avoids using cutOffDate or problematic fields
 */
export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    console.log('Fixed Analytics: Getting dashboard summary with period:', period);
    
    // Set up date filters based on the period
    const dateFilter = getDateFilter(period as string, startDate as string, endDate as string);
    console.log('Fixed Analytics: Date filter:', JSON.stringify(dateFilter));
    
    // Get customer count - directly from customer table
    const customerCount = await prisma.customer.count();
    console.log(`Fixed Analytics: Found ${customerCount} customers`);
    
    // Get reservations with proper date filtering
    const reservations = await prisma.reservation.findMany({
      where: {
        startDate: dateFilter,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      select: {
        id: true,
        status: true,
        serviceId: true,
        startDate: true,
      }
    });
    
    console.log(`Fixed Analytics: Found ${reservations.length} reservations`);
    
    // Get all services
    const allServices = await prisma.service.findMany({
      where: {
        isActive: true
      }
    });
    
    // Group reservations by service
    const serviceStatsMap = new Map();
    
    for (const reservation of reservations) {
      const serviceId = reservation.serviceId;
      const service = allServices.find(s => s.id === serviceId);
      
      if (service) {
        if (!serviceStatsMap.has(serviceId)) {
          serviceStatsMap.set(serviceId, {
            id: serviceId,
            name: service.name,
            count: 0
          });
        }
        
        const stat = serviceStatsMap.get(serviceId);
        stat.count += 1;
      }
    }
    
    const serviceData = Array.from(serviceStatsMap.values());
    
    // Calculate total revenue from invoices with date filtering
    const invoiceTotal = await prisma.invoice.aggregate({
      where: {
        issueDate: dateFilter,
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      },
      _sum: {
        total: true
      }
    });
    
    // Get reservation add-ons with date filtering
    const addOns = await prisma.reservationAddOn.findMany({
      where: {
        reservation: {
          startDate: dateFilter,
          status: {
            notIn: ['CANCELLED', 'NO_SHOW']
          }
        }
      },
      include: {
        addOn: true
      }
    });
    
    // Group by add-on type
    const addOnMap = new Map();
    let addOnRevenue = 0;
    
    for (const addOnEntry of addOns) {
      const addOnId = addOnEntry.addOnId;
      const addOnName = addOnEntry.addOn.name;
      
      if (!addOnMap.has(addOnId)) {
        addOnMap.set(addOnId, {
          id: addOnId,
          name: addOnName,
          count: 0
        });
      }
      
      const addOnData = addOnMap.get(addOnId);
      addOnData.count += 1;
      addOnRevenue += addOnEntry.price || 0;
    }
    
    const addOnData = Array.from(addOnMap.values());
    
    console.log(`Fixed Analytics: Dashboard summary - Revenue: ${invoiceTotal._sum.total || 0}, Customers: ${customerCount}, Services: ${serviceData.length}, Add-ons: ${addOnData.length}, Reservations: ${reservations.length}`);
    
    // If no data for current period, add a note
    const hasCurrentData = reservations.length > 0 || (invoiceTotal._sum.total || 0) > 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        period: period as string,
        totalRevenue: invoiceTotal._sum.total || 0,
        customerCount,
        serviceData,
        addOnData,
        addOnRevenue,
        reservationCount: reservations.length,
        hasCurrentData,
        message: hasCurrentData ? null : `No data found for ${period === 'month' ? 'current month' : period}. Try selecting 'All Time' to see historical data.`
      }
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    return next(new AppError('Error getting dashboard summary', 500));
  }
};

/**
 * Get sales data by service type
 * Fixed version that avoids using cutOffDate or problematic fields
 */
export const getSalesByService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    console.log('Fixed Analytics: Getting sales by service with period:', period);
    
    // Set up date filters based on the period
    const dateFilter = getDateFilter(period as string, startDate as string, endDate as string);
    console.log('Fixed Analytics: Date filter:', JSON.stringify(dateFilter));
    
    // Get all reservations for the period
    const reservations = await prisma.reservation.findMany({
      where: {
        startDate: dateFilter,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      select: {
        id: true,
        serviceId: true,
        startDate: true,
        service: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });
    
    console.log(`Fixed Analytics: Found ${reservations.length} reservations for the period`);
    
    // Get all services
    const allServices = await prisma.service.findMany({
      where: {
        isActive: true
      }
    });
    
    // Group sales by service
    const serviceMap = new Map();
    
    // Count all reservations by service
    for (const reservation of reservations) {
      const serviceId = reservation.serviceId;
      const service = reservation.service || allServices.find(s => s.id === serviceId);
      
      if (service) {
        if (!serviceMap.has(serviceId)) {
          serviceMap.set(serviceId, {
            id: serviceId,
            name: service.name,
            revenue: 0,
            count: 0
          });
        }
        
        const serviceData = serviceMap.get(serviceId);
        serviceData.count += 1;
        serviceData.revenue += Number(service.price) || 0;
      }
    }
    
    // Convert map to array
    const salesByService = Array.from(serviceMap.values());
    
    // Calculate total revenue
    const totalRevenue = salesByService.reduce((sum, service) => sum + service.revenue, 0);
    
    // Calculate percentages
    const servicesWithPercentages = salesByService.map(service => ({
      ...service,
      percentage: totalRevenue > 0 ? parseFloat(((service.revenue / totalRevenue) * 100).toFixed(1)) : 0
    }));
    
    console.log(`Fixed Analytics: Found ${salesByService.length} services with total revenue ${totalRevenue}`);
    
    const hasCurrentData = reservations.length > 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        period: period,
        totalRevenue,
        services: servicesWithPercentages,
        totalBookings: reservations.length,
        hasCurrentData,
        message: hasCurrentData ? null : `No reservations found for ${period === 'month' ? 'current month' : period}. Try selecting 'All Time' to see historical data.`
      }
    });
  } catch (error) {
    console.error('Error getting sales by service:', error);
    return next(new AppError('Error getting sales by service', 500));
  }
};

/**
 * Get sales data by add-on type
 * Fixed version that avoids using cutOffDate or problematic fields
 */
export const getSalesByAddOn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    console.log('Fixed Analytics: Getting sales by add-on with period:', period);
    
    // Get all add-ons with pricing information
    const addOns = await prisma.reservationAddOn.findMany({
      include: {
        addOn: true
      }
    });
    
    // Group by add-on type
    const addOnMap = new Map();
    
    for (const addOnEntry of addOns) {
      const addOnId = addOnEntry.addOnId;
      const addOnName = addOnEntry.addOn.name;
      const price = addOnEntry.price || 0;
      
      if (!addOnMap.has(addOnId)) {
        addOnMap.set(addOnId, {
          id: addOnId,
          name: addOnName,
          revenue: 0,
          count: 0
        });
      }
      
      const addOnData = addOnMap.get(addOnId);
      addOnData.count += 1;
      addOnData.revenue += price;
    }
    
    // Convert map to array
    const salesByAddOn = Array.from(addOnMap.values());
    
    // Calculate total revenue
    const totalRevenue = salesByAddOn.reduce((sum, addOn) => sum + addOn.revenue, 0);
    
    console.log(`Fixed Analytics: Found ${salesByAddOn.length} add-ons with total revenue ${totalRevenue}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        period: period,
        totalRevenue,
        addOns: salesByAddOn,
        totalAddOns: addOns.length
      }
    });
  } catch (error) {
    console.error('Error getting sales by add-on:', error);
    return next(new AppError('Error getting sales by add-on', 500));
  }
};

/**
 * Get customer value data (total spend, breakdown by service type)
 * Fixed version that avoids using cutOffDate or problematic fields
 */
export const getCustomerValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    // Set up date filters based on the period
    const dateFilter = getDateFilter(period as string, startDate as string, endDate as string);
    
    // Get all customers with their reservation counts
    const customers = await prisma.customer.findMany({
      include: {
        reservations: {
          where: {
            startDate: dateFilter,
            status: {
              notIn: ['CANCELLED', 'NO_SHOW']
            }
          },
          select: {
            id: true,
            serviceId: true,
            startDate: true,
            service: {
              select: {
                id: true,
                name: true,
                price: true
              }
            },
            addOnServices: {
              select: {
                id: true,
                price: true,
                addOn: true
              }
            }
          }
        }
      }
    });
    
    // Process customer data
    const customerValues = customers.map(customer => {
      // Skip customers with no reservations
      if (customer.reservations.length === 0) {
        return null;
      }
      
      // Group by service type
      const serviceMap = new Map();
      const addOnMap = new Map();
      let totalSpend = 0;
      
      // Process each reservation
      for (const reservation of customer.reservations) {
        if (reservation.service) {
          const serviceId = reservation.serviceId;
          const serviceName = reservation.service.name;
          const servicePrice = Number(reservation.service.price) || 0;
          
          // Update service map
          if (!serviceMap.has(serviceId)) {
            serviceMap.set(serviceId, {
              id: serviceId,
              name: serviceName,
              count: 0,
              revenue: 0
            });
          }
          
          const serviceData = serviceMap.get(serviceId);
          serviceData.count += 1;
          serviceData.revenue += servicePrice;
          totalSpend += servicePrice;
          
          // Process add-ons
          if (reservation.addOnServices && reservation.addOnServices.length > 0) {
            for (const addOnService of reservation.addOnServices) {
              const addOnId = addOnService.addOn.id;
              const addOnName = addOnService.addOn.name;
              const addOnPrice = Number(addOnService.price) || 0;
              
              // Update add-on map
              if (!addOnMap.has(addOnId)) {
                addOnMap.set(addOnId, {
                  id: addOnId,
                  name: addOnName,
                  count: 0,
                  revenue: 0
                });
              }
              
              const addOnData = addOnMap.get(addOnId);
              addOnData.count += 1;
              addOnData.revenue += addOnPrice;
              totalSpend += addOnPrice;
            }
          }
        }
      }
      
      // Calculate add-on total
      const addOnTotal = Array.from(addOnMap.values()).reduce((sum, addOn) => sum + addOn.revenue, 0);
      
      return {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        totalSpend,
        invoiceCount: customer.reservations.length, // Frontend expects invoiceCount
        reservationCount: customer.reservations.length,
        serviceBreakdown: Array.from(serviceMap.values()),
        addOnBreakdown: Array.from(addOnMap.values()),
        addOnTotal
      };
    }).filter(Boolean); // Remove null entries
    
    // Sort by total spend (highest first)
    customerValues.sort((a, b) => (b?.totalSpend || 0) - (a?.totalSpend || 0));
    
    res.status(200).json({
      status: 'success',
      results: customerValues.length,
      data: customerValues
    });
  } catch (error) {
    console.error('Error getting customer value data:', error);
    return next(new AppError('Error getting customer value data', 500));
  }
};

/**
 * Get detailed customer report for a specific customer
 * Fixed version that avoids using cutOffDate or problematic fields
 */
export const getCustomerReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { period = 'month', startDate, endDate } = req.query;
    
    if (!customerId) {
      return next(new AppError('Customer ID is required', 400));
    }
    
    // Get customer with reservations
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        reservations: {
          where: {
            status: {
              notIn: ['CANCELLED', 'NO_SHOW']
            }
          },
          include: {
            service: true,
            addOnServices: {
              include: {
                addOn: true
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    });
    
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }
    
    // Group by service type
    const serviceMap = new Map();
    const addOnMap = new Map();
    let totalSpend = 0;
    
    // Process each reservation
    for (const reservation of customer.reservations) {
      if (reservation.service) {
        const serviceId = reservation.service.id;
        const serviceName = reservation.service.name;
        const servicePrice = reservation.service.price || 0;
        
        // Update service map
        if (!serviceMap.has(serviceId)) {
          serviceMap.set(serviceId, {
            id: serviceId,
            name: serviceName,
            count: 0,
            revenue: 0,
            transactions: []
          });
        }
        
        const serviceData = serviceMap.get(serviceId);
        serviceData.count += 1;
        serviceData.revenue += servicePrice;
        totalSpend += servicePrice;
        
        serviceData.transactions.push({
          id: reservation.id,
          date: reservation.startDate,
          amount: servicePrice
        });
        
        // Process add-ons
        if (reservation.addOnServices) {
          for (const addOnService of reservation.addOnServices) {
            const addOnId = addOnService.addOn.id;
            const addOnName = addOnService.addOn.name;
            const addOnPrice = addOnService.price || 0;
            
            // Update add-on map
            if (!addOnMap.has(addOnId)) {
              addOnMap.set(addOnId, {
                id: addOnId,
                name: addOnName,
                count: 0,
                revenue: 0,
                transactions: []
              });
            }
            
            const addOnData = addOnMap.get(addOnId);
            addOnData.count += 1;
            addOnData.revenue += addOnPrice;
            totalSpend += addOnPrice;
            
            addOnData.transactions.push({
              id: reservation.id,
              date: reservation.startDate,
              amount: addOnPrice
            });
          }
        }
      }
    }
    
    // Calculate add-on total
    const addOnTotal = Array.from(addOnMap.values()).reduce((sum, addOn) => sum + addOn.revenue, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        customer: {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone
        },
        period: period,
        totalSpend,
        invoiceCount: customer.reservations.length, // Frontend expects invoiceCount
        reservationCount: customer.reservations.length,
        serviceBreakdown: Array.from(serviceMap.values()),
        addOnBreakdown: Array.from(addOnMap.values()),
        addOnTotal,
        transactions: customer.reservations.map(reservation => ({
          id: reservation.id,
          date: reservation.startDate,
          total: reservation.service?.price || 0,
          serviceName: reservation.service?.name || 'N/A',
          addOns: reservation.addOnServices?.map(addOn => ({
            name: addOn.addOn.name,
            price: addOn.price
          })) || []
        }))
      }
    });
  } catch (error) {
    console.error('Error getting customer report:', error);
    return next(new AppError('Error getting customer report', 500));
  }
};

/**
 * Helper function to generate date filters based on period
 */
const getDateFilter = (period: string, startDate?: string, endDate?: string) => {
  const now = new Date();
  console.log(`Fixed Analytics: Generating date filter for period: ${period}`);
  
  // If custom date range is provided
  if (period === 'custom' && startDate && endDate) {
    const customStart = new Date(startDate);
    const customEnd = new Date(endDate);
    return {
      gte: customStart,
      lte: customEnd
    };
  }
  
  // Standard periods
  switch (period) {
    case 'day':
      // Today
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return {
        gte: today,
        lt: tomorrow
      };
      
    case 'week':
      // Current week (Sunday to Saturday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday
      
      return {
        gte: startOfWeek,
        lt: endOfWeek
      };
      
    case 'month':
      // Current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return {
        gte: startOfMonth,
        lte: endOfMonth
      };
      
    case 'year':
      // Current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      
      return {
        gte: startOfYear,
        lte: endOfYear
      };
      
    case 'all':
    default:
      // All time (no date filter)
      return {};
  }
};
