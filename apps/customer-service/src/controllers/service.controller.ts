import { Response, NextFunction } from 'express';
import { PrismaClient, ServiceCategory } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { logger } from '../utils/logger';
import { getCache, setCache, deleteCache, getCacheKey, deleteCachePattern } from '../utils/redis';

const prisma = new PrismaClient();

// Get all services with filtering options
export const getAllServices = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const category = req.query.category as ServiceCategory | undefined;
    const tenantId = req.tenantId!;
    
    logger.debug('Fetching services', { tenantId, filters: { isActive, category, search } });
    
    // Build where condition with tenant filter
    const where: any = {
      tenantId
    };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (category) {
      where.serviceCategory = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Check cache for service list (only if no filters/pagination)
    const isSimpleQuery = !search && isActive === undefined && !category && page === 1 && limit === 10;
    const cacheKey = getCacheKey(tenantId, 'services', 'all');
    
    if (isSimpleQuery) {
      const cachedServices = await getCache<any>(cacheKey);
      if (cachedServices) {
        logger.debug('Service list cache hit', { tenantId });
        return res.status(200).json(cachedServices);
      }
    }
    
    const services = await prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        name: 'asc'
      },
      include: {
        availableAddOns: true,
        reservations: {
          select: {
            id: true,
            status: true
          },
          where: {
            status: {
              notIn: ['CANCELLED', 'COMPLETED']
            }
          },
          take: 1 // We only need to know if there are any active reservations
        },
        _count: {
          select: {
            reservations: true
          }
        }
      }
    });
    
    logger.debug('Services retrieved from database', { tenantId, count: services.length });
    
    // Add a softDeleted flag to services that have been deactivated due to having reservations
    const servicesWithMetadata = services.map(service => {
      // If the service is inactive and has reservations, mark it as soft deleted
      const isSoftDeleted = !service.isActive && service._count.reservations > 0;
      
      // Filter out services that have been soft deleted
      if (isSoftDeleted) {
        return null; // We'll filter these out below
      }
      
      return service;
    }).filter(Boolean); // Remove null entries (soft deleted services)
    
    const total = await prisma.service.count({ where });
    
    const response = {
      status: 'success',
      results: servicesWithMetadata.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: servicesWithMetadata
    };
    
    // Cache simple queries for 15 minutes
    if (isSimpleQuery) {
      await setCache(cacheKey, response, 900);
      logger.debug('Service list cached', { tenantId, ttl: 900 });
    }
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Get a single service by ID
export const getServiceById = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const includeDeleted = req.query.includeDeleted === 'true';
    
    // Try cache first (only for active services)
    if (!includeDeleted) {
      const cacheKey = getCacheKey(tenantId, 'service', id);
      const cachedService = await getCache<any>(cacheKey);
      if (cachedService) {
        logger.debug('Service cache hit', { tenantId, serviceId: id });
        return res.status(200).json({
          status: 'success',
          data: cachedService
        });
      }
    }
    
    // Build the where condition with tenant filter
    const where: any = { id, tenantId };
    if (!includeDeleted) {
      where.isActive = true;
    }
    
    const service = await prisma.service.findFirst({
      where,
      include: {
        availableAddOns: true,
        _count: {
          select: {
            reservations: true
          }
        }
      }
    });
    
    if (!service) {
      return next(new AppError('Service not found or inactive', 404));
    }
    
    // Cache for 15 minutes (only active services)
    if (!includeDeleted) {
      const cacheKey = getCacheKey(tenantId, 'service', id);
      await setCache(cacheKey, service, 900);
      logger.debug('Service cached', { tenantId, serviceId: id, ttl: 900 });
    }
    
    res.status(200).json({
      status: 'success',
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// Create a new service
export const createService = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const serviceData = req.body;
    const { availableAddOns, ...mainServiceData } = serviceData;
    
    // Add tenantId to service data
    mainServiceData.tenantId = tenantId;
    
    logger.info('Creating service', {
      name: mainServiceData.name,
      tenantId: mainServiceData.tenantId,
      serviceCategory: mainServiceData.serviceCategory
    });
    
    // Create the main service WITHOUT transaction
    const service = await prisma.service.create({
      data: {
        tenantId: mainServiceData.tenantId,
        name: mainServiceData.name,
        description: mainServiceData.description,
        duration: mainServiceData.duration,
        price: mainServiceData.price,
        color: mainServiceData.color,
        serviceCategory: mainServiceData.serviceCategory,
        isActive: mainServiceData.isActive !== undefined ? mainServiceData.isActive : true,
        capacityLimit: mainServiceData.capacityLimit || 0,
        requiresStaff: mainServiceData.requiresStaff || false,
        notes: mainServiceData.notes,
        taxable: mainServiceData.taxable !== undefined ? mainServiceData.taxable : true
      }
    });
    
    logger.info('Service created', { tenantId, serviceId: service.id });
    
    // Create any add-on services if provided
    if (availableAddOns && availableAddOns.length > 0) {
      await Promise.all(
        availableAddOns.map((addOn: any) => 
          prisma.addOnService.create({
            data: {
              ...addOn,
              serviceId: service.id
            }
          })
        )
      );
    }
    
    const newService = service;
    
    // Invalidate service list cache
    await deleteCachePattern(`${tenantId}:services:*`);
    logger.debug('Service list cache invalidated', { tenantId });
    
    res.status(201).json({
      status: 'success',
      data: newService
    });
  } catch (error: any) {
    logger.error('Error creating service', { tenantId: req.tenantId, error: error.message });
    next(error);
  }
};

// Update a service
export const updateService = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const serviceData = req.body;
    const { availableAddOns, ...mainServiceData } = serviceData;
    logger.debug('Updating service', { tenantId: req.tenantId, serviceId: id, fields: Object.keys(mainServiceData) });
    
    // Check if service exists
    const serviceExists = await prisma.service.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!serviceExists) {
      return next(new AppError('Service not found', 404));
    }
    
    // Update only the main service data without touching add-ons
    // This avoids foreign key constraint issues with add-ons used in reservations
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        name: mainServiceData.name,
        description: mainServiceData.description,
        duration: mainServiceData.duration,
        price: mainServiceData.price,
        color: mainServiceData.color,
        serviceCategory: mainServiceData.serviceCategory,
        isActive: mainServiceData.isActive,
        capacityLimit: mainServiceData.capacityLimit,
        requiresStaff: mainServiceData.requiresStaff,
        notes: mainServiceData.notes
      },
      include: {
        availableAddOns: true
      }
    });
    
    // Invalidate caches
    const cacheKey = getCacheKey(req.tenantId!, 'service', id);
    await deleteCache(cacheKey);
    await deleteCachePattern(`${req.tenantId}:services:*`);
    logger.debug('Service caches invalidated', { tenantId: req.tenantId, serviceId: id });
    
    res.status(200).json({
      status: 'success',
      data: updatedService
    });
  } catch (error) {
    next(error);
  }
};

// Delete a service
export const deleteService = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const forceDelete = req.query.force === 'true';
    
    // Check if service exists
    const serviceExists = await prisma.service.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!serviceExists) {
      return next(new AppError('Service not found', 404));
    }
    
    // Check for existing reservations using this service
    const activeReservationsCount = await prisma.reservation.count({
      where: { 
        serviceId: id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
        }
      }
    });
    
    // If there are active reservations and force is not true, perform a soft delete instead
    if (activeReservationsCount > 0 && !forceDelete) {
      logger.info('Service has active reservations, performing soft delete', { tenantId: req.tenantId, serviceId: id, activeReservations: activeReservationsCount });
      
      // Soft delete - mark as inactive but keep the record
      await prisma.service.update({
        where: { id },
        data: { isActive: false }
      });
      
      // Also mark all add-ons as inactive
      await prisma.addOnService.updateMany({
        where: { serviceId: id },
        data: { isActive: false }
      });
      
      // Invalidate caches
      const cacheKey = getCacheKey(req.tenantId!, 'service', id);
      await deleteCache(cacheKey);
      await deleteCachePattern(`${req.tenantId}:services:*`);
      logger.debug('Service caches invalidated after soft delete', { tenantId: req.tenantId, serviceId: id });
      
      return res.status(200).json({
        status: 'success',
        message: 'Service has been deactivated (soft deleted) because it has active reservations'
      });
    }
    
    // Check if there are any historical reservations
    const historicalReservationsCount = await prisma.reservation.count({
      where: {
        serviceId: id,
        status: {
          notIn: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
        }
      }
    });
    
    // If there are historical reservations, perform a soft delete instead
    if (historicalReservationsCount > 0) {
      // Soft delete - mark as inactive but keep the record
      await prisma.service.update({
        where: { id },
        data: { isActive: false }
      });
      
      // Also mark all add-ons as inactive
      await prisma.addOnService.updateMany({
        where: { serviceId: id },
        data: { isActive: false }
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Service has been deactivated (soft deleted)'
      });
    } else {
      // No historical reservations, perform hard delete
      await prisma.$transaction([
        // First delete any add-on services
        prisma.addOnService.deleteMany({ where: { serviceId: id } }),
        // Then delete the service
        prisma.service.delete({ where: { id } })
      ]);
      
      res.status(204).send();
    }
  } catch (error) {
    next(error);
  }
};

// Deactivate a service (soft delete)
export const deactivateService = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const serviceExists = await prisma.service.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!serviceExists) {
      return next(new AppError('Service not found', 404));
    }
    
    // Update service to inactive
    const updatedService = await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });
    
    res.status(200).json({
      status: 'success',
      data: updatedService
    });
  } catch (error) {
    next(error);
  }
};

// Get add-on services for a service
export const getServiceAddOns = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const serviceExists = await prisma.service.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!serviceExists) {
      return next(new AppError('Service not found', 404));
    }
    
    const addOns = await prisma.addOnService.findMany({
      where: { serviceId: id },
      orderBy: { name: 'asc' }
    });
    
    res.status(200).json({
      status: 'success',
      results: addOns.length,
      data: addOns
    });
  } catch (error) {
    next(error);
  }
};

// Get reservations for a service
export const getServiceReservations = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    // Check if service exists
    const serviceExists = await prisma.service.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!serviceExists) {
      return next(new AppError('Service not found', 404));
    }
    
    // Build where condition
    const where: any = {
      serviceId: id
    };
    
    if (status) {
      where.status = status;
    }
    
    // Date filtering
    if (startDate || endDate) {
      where.AND = [];
      
      if (startDate) {
        where.AND.push({
          startDate: {
            gte: startDate
          }
        });
      }
      
      if (endDate) {
        where.AND.push({
          endDate: {
            lte: endDate
          }
        });
      }
    }
    
    const reservations = await prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            breed: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        addOnServices: true
      },
      orderBy: { startDate: 'desc' }
    });
    
    const total = await prisma.reservation.count({ where });
    
    res.status(200).json({
      status: 'success',
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};
