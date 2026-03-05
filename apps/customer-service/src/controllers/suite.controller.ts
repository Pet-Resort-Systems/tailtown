import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ResourceType } from '@prisma/client';
import AppError from '../utils/appError';

const prisma = new PrismaClient();

// Suite types stored in attributes
enum SuiteType {
  STANDARD = 'STANDARD',
  STANDARD_PLUS = 'STANDARD_PLUS',
  VIP = 'VIP'
}

/**
 * Get all kennel suites with optional filtering
 */
export const getAllSuites = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, available, status, search, date } = req.query;
    console.log('Query params:', { type, available, status, search, date });
    
    // Base where condition that only returns suite type resources
    const where: any = {
      type: {
        in: [ResourceType.STANDARD_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.VIP_SUITE]
      },
      isActive: true
    };
    
    // Filter by specific suite type if provided
    if (type) {
      where.type = type;
    }
    
    // Create start and end of the selected date in UTC for filtering
    let filterDate: Date;
    
    if (date && typeof date === 'string') {
      // If date is provided, use it (format: YYYY-MM-DD)
      // Add time to ensure proper date handling (noon in UTC to avoid timezone issues)
      filterDate = new Date(`${date}T12:00:00Z`);
      console.log(`Parsed date from string: ${date} -> ${filterDate.toISOString()}`);
      // Check if date is valid
      if (isNaN(filterDate.getTime())) {
        console.log('Invalid date provided, falling back to today');
        filterDate = new Date(); // Fallback to today if invalid
      }
    } else {
      // Default to today
      filterDate = new Date();
      console.log('No date provided, using today');
    }
    
    // Create start of day in UTC (midnight)
    const filterTodayStart = new Date(filterDate);
    filterTodayStart.setUTCHours(0, 0, 0, 0);
    
    // Create end of day in UTC (23:59:59.999)
    const filterTodayEnd = new Date(filterDate);
    filterTodayEnd.setUTCHours(23, 59, 59, 999);
    
    console.log(`Filtering with date range: ${filterTodayStart.toISOString()} to ${filterTodayEnd.toISOString()}`);
    console.log(`Filter params: type=${type}, status=${status}, available=${available}`);
    
    // Filter by status (AVAILABLE, OCCUPIED, MAINTENANCE)
    if (status) {
      console.log(`Filtering by status: ${status} for date ${filterTodayStart.toISOString().split('T')[0]}`);
      
      if (status === 'OCCUPIED') {
        console.log('Applying OCCUPIED filter - looking for suites with active reservations');
        // Find suites with reservations for today
        // A reservation overlaps with today if:
        // 1. It starts before or on the end of the day AND
        // 2. It ends on or after the start of the day
        where.reservations = {
          some: {
            AND: [
              { startDate: { lte: filterTodayEnd } },   // Starts before or on the end of today
              { endDate: { gte: filterTodayStart } }    // Ends on or after the start of today
            ],
            status: { in: ['CONFIRMED', 'CHECKED_IN'] }
          }
        };
        
        // Log the query for debugging
        console.log('OCCUPIED filter where clause:', JSON.stringify(where, null, 2));
      } else if (status === 'AVAILABLE') {
        // Find suites with no reservations for today and not in maintenance
        where.reservations = {
          none: {
            AND: [
              { startDate: { lte: filterTodayEnd } },   // Starts before or on the end of today
              { endDate: { gte: filterTodayStart } },   // Ends on or after the start of today
              { status: { in: ['CONFIRMED', 'CHECKED_IN'] } }
            ]
          }
        };
        
        // Log the query for debugging
        console.log('AVAILABLE filter where clause:', JSON.stringify(where, null, 2));
        // Not in maintenance
        where.NOT = {
          attributes: {
            path: ['maintenanceStatus'],
            equals: 'MAINTENANCE'
          }
        };
      } else if (status === 'MAINTENANCE') {
        // Find suites in maintenance
        where.attributes = {
          path: ['maintenanceStatus'],
          equals: 'MAINTENANCE'
        };
      }
    }
    
    // For backward compatibility
    if (available === 'true') {
      where.reservations = {
        none: {
          AND: [
            { startDate: { lte: filterTodayEnd } },   // Starts before or on the end of today
            { endDate: { gte: filterTodayStart } },   // Ends on or after the start of today
            { status: { in: ['CONFIRMED', 'CHECKED_IN'] } }
          ]
        }
      };
      
      // Log the query for backward compatibility
      console.log('Backward compatibility available=true filter where clause:', JSON.stringify(where, null, 2));
    }
    
    // Search by suite number or name
    if (search) {
      const searchNum = parseInt(search as string);
      where.OR = [
        // Use JSON path since suiteNumber is in attributes
        searchNum ? {
          attributes: {
            path: ['suiteNumber'],
            equals: searchNum
          }
        } : undefined,
        { name: { contains: search as string, mode: 'insensitive' } }
      ].filter(Boolean);
    }
    
    // Create start and end of today in UTC for the query
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);
    
    console.log(`getAllSuites - Today's range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
    
    const suites = await prisma.resource.findMany({
      where,
      include: {
        reservations: {
          where: {
            OR: [
              // Reservation starts today
              { startDate: { gte: filterTodayStart, lte: filterTodayEnd } },
              // Reservation ends today
              { endDate: { gte: filterTodayStart, lte: filterTodayEnd } },
              // Reservation spans today (starts before today and ends after today)
              { AND: [
                { startDate: { lte: filterTodayStart } },
                { endDate: { gte: filterTodayStart } }
              ]}
            ],
            status: { in: ['CONFIRMED', 'CHECKED_IN'] }
          },
          include: {
            pet: {
              select: {
                id: true,
                name: true,
                type: true,
                owner: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        // Always include attributes (suiteNumber, suiteType, etc)
      },
      orderBy: [
        { name: 'asc' }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      results: suites.length,
      data: suites
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize suite numbers in bulk
 */
export const initializeSuites = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { count = 168, vipCount = 1, standardPlusCount = 25 } = req.body;
    
    if (count < 1 || vipCount < 0 || standardPlusCount < 0) {
      return next(new AppError('Invalid counts provided', 400));
    }
    
    if (vipCount + standardPlusCount > count) {
      return next(new AppError('Sum of VIP and Standard Plus suites exceeds total count', 400));
    }
    
    const suites = [];
    
    // Create VIP suites
    for (let i = 1; i <= vipCount; i++) {
      suites.push({
        name: `VIP Suite ${i}`,
        type: ResourceType.VIP_SUITE,
        description: 'Premium suite with extra amenities and dedicated care',
        capacity: 1,
        isActive: true,
        attributes: {
          suiteType: SuiteType.VIP,
          suiteNumber: i,
          lastCleaned: null,
          maintenanceStatus: 'AVAILABLE',
          amenities: ['Premium Bedding', 'Dedicated Play Time', 'Webcam', 'Spa Treatment'],
          size: 'Extra Large',
          location: 'Premium Wing'
        }
      });
    }
    
    // Create Standard Plus suites
    for (let i = vipCount + 1; i <= vipCount + standardPlusCount; i++) {
      suites.push({
        name: `Standard Plus Suite ${i}`,
        type: ResourceType.STANDARD_PLUS_SUITE,
        description: 'Enhanced suite with additional comfort features',
        capacity: 1,
        isActive: true,
        attributes: {
          suiteType: SuiteType.STANDARD_PLUS,
          suiteNumber: i,
          lastCleaned: null,
          maintenanceStatus: 'AVAILABLE',
          amenities: ['Enhanced Bedding', 'Extra Play Time', 'Treats'],
          size: 'Large',
          location: 'East Wing'
        }
      });
    }
    
    // Create Standard suites
    for (let i = vipCount + standardPlusCount + 1; i <= count; i++) {
      suites.push({
        name: `Standard Suite ${i}`,
        type: ResourceType.STANDARD_SUITE,
        description: 'Comfortable standard accommodation',
        capacity: 1,
        isActive: true,
        attributes: {
          suiteType: SuiteType.STANDARD,
          suiteNumber: i,
          lastCleaned: null,
          maintenanceStatus: 'AVAILABLE',
          amenities: ['Comfortable Bedding', 'Regular Play Time'],
          size: 'Standard',
          location: 'Main Building'
        }
      });
    }
    
    // Use transactions to ensure all-or-nothing creation
    const createdSuites = await prisma.$transaction(
      suites.map(suite => 
        prisma.resource.create({
          data: suite
        })
      )
    );
    
    res.status(201).json({
      status: 'success',
      message: `${createdSuites.length} suites initialized`,
      data: {
        vipCount,
        standardPlusCount,
        standardCount: count - vipCount - standardPlusCount,
        totalCount: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the cleaning status of a suite
 */
export const updateSuiteCleaning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { maintenanceStatus, notes } = req.body;
    
    // First get the current resource and its attributes
    const currentResource = await prisma.resource.findUnique({
      where: { id }
    });
    
    if (!currentResource) {
      return next(new AppError('Suite not found', 404));
    }
    
    // Update the cleaning information in attributes
    const attributes = currentResource.attributes as any || {};
    attributes.lastCleaned = new Date().toISOString();
    attributes.maintenanceStatus = maintenanceStatus || 'AVAILABLE';
    
    const suite = await prisma.resource.update({
      where: { id },
      data: {
        attributes,
        notes: notes ? `${notes}\n[Cleaned: ${new Date().toLocaleString()}]` : `[Cleaned: ${new Date().toLocaleString()}]`
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: suite
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get occupancy stats for suites
 */
export const getSuiteStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.query;
    
    // Get the selected date/time for accurate reservation calculations
    let statsDate: Date;
    
    if (date && typeof date === 'string') {
      // If date is provided, use it (format: YYYY-MM-DD)
      // Add time to ensure proper date handling (noon in UTC to avoid timezone issues)
      statsDate = new Date(`${date}T12:00:00Z`);
      console.log(`Stats - Parsed date from string: ${date} -> ${statsDate.toISOString()}`);
      // Check if date is valid
      if (isNaN(statsDate.getTime())) {
        console.log('Stats - Invalid date provided, falling back to today');
        statsDate = new Date(); // Fallback to today if invalid
      }
    } else {
      // Default to today
      statsDate = new Date();
      console.log('Stats - No date provided, using today');
    }
    
    // Create start and end of the selected date in UTC
    const statsTodayStart = new Date(statsDate);
    statsTodayStart.setUTCHours(0, 0, 0, 0);
    
    const statsTodayEnd = new Date(statsDate);
    statsTodayEnd.setUTCHours(23, 59, 59, 999);
    
    console.log(`Stats - Selected date: ${date || 'today'}`);
    console.log(`Stats - Date range: ${statsTodayStart.toISOString()} to ${statsTodayEnd.toISOString()}`);
    
    // Log the query parameters for debugging
    console.log(`Stats - Query parameters: ${JSON.stringify(req.query)}`);
    
    // For debugging, let's check if we have any reservations for today
    const todaysReservations = await prisma.reservation.count({
      where: {
        OR: [
          // Reservation starts today
          { startDate: { gte: statsTodayStart, lte: statsTodayEnd } },
          // Reservation ends today
          { endDate: { gte: statsTodayStart, lte: statsTodayEnd } },
          // Reservation spans today (starts before today and ends after today)
          { AND: [
            { startDate: { lte: statsTodayStart } },
            { endDate: { gte: statsTodayStart } }
          ]}
        ],
        status: { in: ['CONFIRMED', 'CHECKED_IN'] }
      }
    });
    
    console.log(`Found ${todaysReservations} reservations for today`);
    
    // For debugging, let's check which resources have reservations
    const resourcesWithReservations = await prisma.resource.findMany({
      where: {
        reservations: {
          some: {
            OR: [
              // Reservation starts today
              { startDate: { gte: statsTodayStart, lte: statsTodayEnd } },
              // Reservation ends today
              { endDate: { gte: statsTodayStart, lte: statsTodayEnd } },
              // Reservation spans today (starts before today and ends after today)
              { AND: [
                { startDate: { lte: statsTodayStart } },
                { endDate: { gte: statsTodayStart } }
              ]}
            ],
            status: { in: ['CONFIRMED', 'CHECKED_IN'] }
          }
        }
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    });
    
    console.log(`Resources with reservations:`, resourcesWithReservations);
    
    const [
      totalSuites,
      occupiedSuites,
      maintenanceSuites,
      availableSuites
    ] = await Promise.all([
      // Total count
      prisma.resource.count({
        where: { 
          type: {
            in: [ResourceType.STANDARD_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.VIP_SUITE]
          },
          isActive: true
        }
      }),
      
      // Occupied count - suites with reservations for today
      prisma.resource.count({
        where: {
          type: {
            in: [ResourceType.STANDARD_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.VIP_SUITE]
          },
          isActive: true,
          reservations: {
            some: {
              OR: [
                // Reservation starts today
                { startDate: { gte: statsTodayStart, lte: statsTodayEnd } },
                // Reservation ends today
                { endDate: { gte: statsTodayStart, lte: statsTodayEnd } },
                // Reservation spans today (starts before today and ends after today)
                { AND: [
                  { startDate: { lte: statsTodayStart } },
                  { endDate: { gte: statsTodayStart } }
                ]}
              ],
              status: { in: ['CONFIRMED', 'CHECKED_IN'] }
            }
          }
        }
      }),
      
      // Maintenance count
      prisma.resource.count({
        where: {
          type: {
            in: [ResourceType.STANDARD_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.VIP_SUITE]
          },
          isActive: true,
          attributes: {
            path: ['maintenanceStatus'],
            equals: 'MAINTENANCE'
          }
        }
      }),
      
      // Available suites (no reservations for today and not in maintenance)
      prisma.resource.count({
        where: {
          type: {
            in: [ResourceType.STANDARD_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.VIP_SUITE]
          },
          isActive: true,
          // No reservations for today
          reservations: {
            none: {
              OR: [
                // Reservation starts today
                { startDate: { gte: statsTodayStart, lte: statsTodayEnd } },
                // Reservation ends today
                { endDate: { gte: statsTodayStart, lte: statsTodayEnd } },
                // Reservation spans today (starts before today and ends after today)
                { AND: [
                  { startDate: { lte: statsTodayStart } },
                  { endDate: { gte: statsTodayStart } }
                ]}
              ],
              status: { in: ['CONFIRMED', 'CHECKED_IN'] }
            }
          },
          // Not in maintenance
          NOT: {
            attributes: {
              path: ['maintenanceStatus'],
              equals: 'MAINTENANCE'
            }
          }
        }
      })
    ]);
    
    // Calculate occupancy rate
    const occupancyRate = totalSuites > 0 ? (occupiedSuites / totalSuites) * 100 : 0;
    
    // Calculate suites needing cleaning (available suites that need cleaning)
    // This is a subset of available suites that might need cleaning after previous use
    const needsCleaning = Math.floor(availableSuites * 0.2); // Assuming ~20% need cleaning
    
    console.log('Suite stats:', {
      total: totalSuites,
      occupied: occupiedSuites,
      available: availableSuites,
      maintenance: maintenanceSuites,
      needsCleaning,
      occupancyRate
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        total: totalSuites,
        occupied: occupiedSuites,
        occupancyRate,
        available: availableSuites,
        maintenance: maintenanceSuites,
        needsCleaning
      }
    });
  } catch (error) {
    next(error);
  }
};
