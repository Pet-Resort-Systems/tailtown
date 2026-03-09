import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all add-on services
export const getAllAddOnServices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Backend: Getting all add-on services');
    
    // Parse query parameters
    const serviceId = req.query.serviceId as string;
    const isActive = req.query.isActive === 'true';
    
    // Build where clause
    const where: any = {};
    
    if (serviceId) {
      where.serviceId = serviceId;
    }
    
    if (req.query.isActive !== undefined) {
      where.isActive = isActive;
    }
    
    console.log('Backend: Add-on services where clause:', where);
    
    // Fetch add-on services
    const addOnServices = await prisma.addOnService.findMany({
      where,
      include: {
        service: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`Backend: Found ${addOnServices.length} add-on services`);
    
    res.status(200).json({
      status: 'success',
      results: addOnServices.length,
      data: addOnServices
    });
  } catch (error) {
    console.error('Backend: Error in getAllAddOnServices:', error);
    next(error);
  }
};

// Get a single add-on service by ID
export const getAddOnServiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    console.log(`Backend: Getting add-on service with ID: ${id}`);
    
    const addOnService = await prisma.addOnService.findUnique({
      where: { id },
      include: {
        service: true
      }
    });
    
    if (!addOnService) {
      console.error(`Backend: Add-on service with ID ${id} not found`);
      return next(new AppError('Add-on service not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: addOnService
    });
  } catch (error) {
    console.error('Backend: Error in getAddOnServiceById:', error);
    next(error);
  }
};

// Create a new add-on service
export const createAddOnService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, price, duration, serviceId, isActive } = req.body;
    
    console.log('Backend: Creating new add-on service:', req.body);
    
    // Validate required fields
    if (!name || !price || !serviceId) {
      console.error('Backend: Missing required fields for add-on service');
      return next(new AppError('Name, price, and serviceId are required', 400));
    }
    
    // Check if the service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });
    
    if (!service) {
      console.error(`Backend: Service with ID ${serviceId} not found`);
      return next(new AppError('Service not found', 404));
    }
    
    // Create the add-on service
    const addOnService = await prisma.addOnService.create({
      data: {
        name,
        description,
        price: parseFloat(price as any),
        duration: duration ? parseInt(duration as any, 10) : null,
        serviceId,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    console.log(`Backend: Created add-on service: ${addOnService.id}`);
    
    res.status(201).json({
      status: 'success',
      data: addOnService
    });
  } catch (error) {
    console.error('Backend: Error in createAddOnService:', error);
    next(error);
  }
};

// Update an add-on service
export const updateAddOnService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, serviceId, isActive } = req.body;
    
    console.log(`Backend: Updating add-on service with ID: ${id}`, req.body);
    
    // Check if the add-on service exists
    const existingAddOnService = await prisma.addOnService.findUnique({
      where: { id }
    });
    
    if (!existingAddOnService) {
      console.error(`Backend: Add-on service with ID ${id} not found`);
      return next(new AppError('Add-on service not found', 404));
    }
    
    // If serviceId is provided, check if the service exists
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });
      
      if (!service) {
        console.error(`Backend: Service with ID ${serviceId} not found`);
        return next(new AppError('Service not found', 404));
      }
    }
    
    // Update the add-on service
    const updatedAddOnService = await prisma.addOnService.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        price: price !== undefined ? parseFloat(price as any) : undefined,
        duration: duration !== undefined ? parseInt(duration as any, 10) : undefined,
        serviceId: serviceId !== undefined ? serviceId : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    
    console.log(`Backend: Updated add-on service: ${updatedAddOnService.id}`);
    
    res.status(200).json({
      status: 'success',
      data: updatedAddOnService
    });
  } catch (error) {
    console.error('Backend: Error in updateAddOnService:', error);
    next(error);
  }
};

// Delete an add-on service
export const deleteAddOnService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    console.log(`Backend: Deleting add-on service with ID: ${id}`);
    
    // Check if the add-on service exists
    const existingAddOnService = await prisma.addOnService.findUnique({
      where: { id }
    });
    
    if (!existingAddOnService) {
      console.error(`Backend: Add-on service with ID ${id} not found`);
      return next(new AppError('Add-on service not found', 404));
    }
    
    // Delete the add-on service
    await prisma.addOnService.delete({
      where: { id }
    });
    
    console.log(`Backend: Deleted add-on service: ${id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Backend: Error in deleteAddOnService:', error);
    next(error);
  }
};
