/**
 * Controller Error Handling Examples
 * 
 * This file provides examples of how to use the standardized error handling
 * in controllers across all services.
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        [key: string]: any;
      };
    }
  }
}
import { AppError, ErrorType } from './AppError';
import { catchAsync } from './errorHandler';

/**
 * Example controller using the catchAsync wrapper and AppError
 */
export const exampleController = {
  /**
   * Get a resource by ID
   */
  getById: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    
    // Validate input
    if (!id) {
      throw AppError.validationError('ID is required');
    }
    
    // Example database operation with error handling
    try {
      // Simulated database query
      const resource = await findResourceById(id, organizationId);
      
      if (!resource) {
        throw AppError.notFoundError('Resource', id, { organizationId });
      }
      
      // Success response
      res.status(200).json({
        success: true,
        data: resource
      });
    } catch (error) {
      // If it's already an AppError, pass it along
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle database-specific errors
      if (error.code && error.code.startsWith('P')) {
        // Let the middleware handle Prisma errors
        throw error;
      }
      
      // For unexpected errors, create a server error
      throw AppError.serverError(
        'Failed to retrieve resource',
        { originalError: error.message },
        { resourceId: id, organizationId }
      );
    }
  }),
  
  /**
   * Create a new resource
   */
  create: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, description } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;
    
    // Validate required fields
    if (!name) {
      throw AppError.validationError(
        'Name is required',
        { invalidFields: ['name'] }
      );
    }
    
    // Example of multi-field validation
    const validationErrors: Record<string, string> = {};
    
    if (name.length < 3) {
      validationErrors.name = 'Name must be at least 3 characters';
    }
    
    if (description && description.length > 500) {
      validationErrors.description = 'Description must be less than 500 characters';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      throw AppError.validationError(
        'Validation failed',
        validationErrors
      );
    }
    
    try {
      // Simulated database operation
      const newResource = await createResource({ name, description, organizationId });
      
      // Success response
      res.status(201).json({
        success: true,
        data: newResource
      });
    } catch (error) {
      // Handle specific error cases
      if (error.code === 'P2002') {
        throw AppError.conflictError(
          'A resource with this name already exists',
          { field: 'name' }
        );
      }
      
      // Pass other errors to the error handler
      throw error;
    }
  }),
  
  /**
   * Update a resource
   */
  update: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updates = req.body;
    const organizationId = req.headers['x-organization-id'] as string;
    
    // Check if resource exists
    const existingResource = await findResourceById(id, organizationId);
    
    if (!existingResource) {
      throw AppError.notFoundError('Resource', id, { organizationId });
    }
    
    // Check authorization
    if (!canUserUpdateResource(req.user, existingResource)) {
      throw AppError.authorizationError(
        'You do not have permission to update this resource',
        { resourceId: id, userId: req.user?.id }
      );
    }
    
    try {
      // Update resource
      const updatedResource = await updateResource(id, updates, organizationId);
      
      res.status(200).json({
        success: true,
        data: updatedResource
      });
    } catch (error) {
      // Handle schema alignment errors
      if (error.message.includes('column does not exist')) {
        throw AppError.schemaAlignmentError(
          'Schema mismatch detected',
          { errorDetails: error.message },
          { resourceId: id, updates }
        );
      }
      
      throw error;
    }
  }),
  
  /**
   * Delete a resource
   */
  delete: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    
    try {
      // Check if resource exists
      const resource = await findResourceById(id, organizationId);
      
      if (!resource) {
        throw AppError.notFoundError('Resource', id, { organizationId });
      }
      
      // Delete resource
      await deleteResource(id, organizationId);
      
      // Return success with no content
      res.status(204).send();
    } catch (error) {
      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        throw AppError.validationError(
          'Cannot delete this resource because it is referenced by other records',
          { resourceId: id }
        );
      }
      
      throw error;
    }
  })
};

// Simulated database functions
async function findResourceById(id: string, organizationId: string) {
  // This would be a real database query in actual code
  return { id, name: 'Example Resource', organizationId };
}

async function createResource(data: any) {
  // This would be a real database query in actual code
  return { id: '123', ...data };
}

async function updateResource(id: string, updates: any, organizationId: string) {
  // This would be a real database query in actual code
  return { id, ...updates, organizationId };
}

async function deleteResource(id: string, organizationId: string) {
  // This would be a real database query in actual code
  return true;
}

// Simulated authorization function
function canUserUpdateResource(user: any, resource: any) {
  // This would be a real authorization check in actual code
  return true;
}
