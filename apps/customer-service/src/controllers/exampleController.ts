/**
 * Example Controller
 * 
 * This controller demonstrates the standardized error handling pattern
 * with different error types and proper context.
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError, ErrorType, catchAsync } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get a customer by ID
 * Demonstrates not found error handling
 */
export const getCustomerById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  logger.info(`Fetching customer with ID: ${id}`);
  
  const customer = await prisma.customer.findUnique({
    where: { id }
  });
  
  if (!customer) {
    // Use factory method for standardized not found error
    throw AppError.notFoundError(
      'Customer', 
      id,
      { requestedAt: new Date().toISOString() }
    );
  }
  
  logger.success(`Successfully retrieved customer: ${id}`);
  
  res.status(200).json({
    success: true,
    data: customer
  });
});

/**
 * Create a new customer
 * Demonstrates validation error handling
 */
export const createCustomer = catchAsync(async (req: Request, res: Response) => {
  const { name, email, phone } = req.body;
  
  // Validate required fields
  if (!name || !email) {
    throw AppError.validationError(
      'Name and email are required fields',
      { providedFields: Object.keys(req.body) }
    );
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw AppError.validationError(
      'Invalid email format',
      { providedEmail: email }
    );
  }
  
  try {
    // Check for existing customer with same email
    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    });
    
    if (existingCustomer) {
      throw AppError.conflictError(
        'A customer with this email already exists',
        { email }
      );
    }
    
    // Create the customer
    const newCustomer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: phone || null
      }
    });
    
    logger.success(`Created new customer with ID: ${newCustomer.id}`);
    
    res.status(201).json({
      success: true,
      data: newCustomer
    });
  } catch (error) {
    // If it's already an AppError, rethrow it
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle Prisma errors (this should be caught by the error middleware,
    // but we're showing explicit handling as an example)
    if (error.code && error.code.startsWith('P')) {
      logger.error(`Prisma error during customer creation: ${error.code}`);
      
      if (error.code === 'P2002') {
        throw AppError.conflictError(
          'A customer with this information already exists',
          { fields: error.meta?.target }
        );
      }
      
      throw AppError.databaseError(
        'Failed to create customer due to database error',
        { prismaError: error.code, details: error.meta }
      );
    }
    
    // For unexpected errors, add context but let error middleware handle it
    logger.error(`Unexpected error in createCustomer: ${error.message}`);
    throw new AppError(
      'Failed to create customer',
      500,
      ErrorType.SERVER_ERROR,
      false, // Not operational - unexpected error
      null,
      { originalError: error.message }
    );
  }
});

/**
 * Update a customer
 * Demonstrates authorization error handling
 */
export const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  const organizationId = req.headers['x-organization-id'] as string;
  
  // Example authorization check
  if (!organizationId) {
    throw AppError.authorizationError(
      'Organization ID is required to update a customer'
    );
  }
  
  // Check if customer exists
  const customer = await prisma.customer.findUnique({
    where: { id }
  });
  
  if (!customer) {
    throw AppError.notFoundError('Customer', id);
  }
  
  // Example multi-tenant isolation check
  if (customer.organizationId !== organizationId) {
    throw new AppError(
      'You do not have permission to update this customer',
      403,
      ErrorType.MULTI_TENANT_ERROR,
      true,
      null,
      { 
        customerOrgId: customer.organizationId,
        requestOrgId: organizationId
      }
    );
  }
  
  // Update the customer
  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined
    }
  });
  
  logger.success(`Updated customer: ${id}`);
  
  res.status(200).json({
    success: true,
    data: updatedCustomer
  });
});

/**
 * Delete a customer
 * Demonstrates schema alignment error handling
 */
export const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id }
    });
    
    if (!customer) {
      throw AppError.notFoundError('Customer', id);
    }
    
    // Example schema alignment check
    const hasActiveReservations = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM "Reservation" 
        WHERE "customerId" = ${id} 
        AND "status" = 'active'
      )
    `;
    
    if (hasActiveReservations[0].exists) {
      throw new AppError(
        'Cannot delete customer with active reservations',
        400,
        ErrorType.SCHEMA_ALIGNMENT_ERROR,
        true,
        { customerId: id },
        { schemaConstraint: 'customer_active_reservations' }
      );
    }
    
    // Delete the customer
    await prisma.customer.delete({
      where: { id }
    });
    
    logger.success(`Deleted customer: ${id}`);
    
    res.status(204).send();
  } catch (error) {
    // If it's already an AppError, rethrow it
    if (error instanceof AppError) {
      throw error;
    }
    
    // For unexpected errors, add context but let error middleware handle it
    logger.error(`Error in deleteCustomer: ${error.message}`);
    throw new AppError(
      'Failed to delete customer',
      500,
      ErrorType.SERVER_ERROR,
      false,
      null,
      { originalError: error.message }
    );
  }
});
