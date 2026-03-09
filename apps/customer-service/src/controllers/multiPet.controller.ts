import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get suite capacity configuration
export const getSuiteCapacityConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = {
      id: 'default',
      tenantId: 'dev',
      suiteCapacities: [],
      allowMultiplePets: true,
      requireSameOwner: true,
      requireSameHousehold: false,
      enableCompatibilityChecks: true,
      compatibilityRules: [],
      showOccupancyIndicators: true,
      showPetNamesInSuite: true
    };
    
    res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    next(error);
  }
};

// Update suite capacity configuration
export const updateSuiteCapacityConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = req.body;
    res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    next(error);
  }
};

// Get all suite capacities
export const getAllSuiteCapacities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ status: 'success', data: [] });
  } catch (error) {
    next(error);
  }
};

// Create suite capacity
export const createSuiteCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capacity = req.body;
    
    if (!capacity.suiteType || !capacity.maxPets) {
      return next(new AppError('Suite type and max pets are required', 400));
    }
    
    const newCapacity = {
      id: Math.random().toString(36).substring(7),
      ...capacity
    };
    
    res.status(201).json({ status: 'success', data: newCapacity });
  } catch (error) {
    next(error);
  }
};

// Update suite capacity
export const updateSuiteCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const capacity = req.body;
    
    const updated = { id, ...capacity };
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

// Delete suite capacity
export const deleteSuiteCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Calculate multi-pet pricing
export const calculateMultiPetPricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suiteType, numberOfPets, basePrice, pricingType } = req.body;
    
    if (!numberOfPets || !basePrice) {
      return next(new AppError('Number of pets and base price are required', 400));
    }
    
    let totalPrice = basePrice;
    let perPetCost = basePrice;
    let savings = 0;
    
    // Simple pricing logic
    if (pricingType === 'PER_PET') {
      const additionalPetPrice = basePrice * 0.8; // 20% off additional pets
      totalPrice = basePrice + (additionalPetPrice * (numberOfPets - 1));
      perPetCost = totalPrice / numberOfPets;
      savings = (basePrice * numberOfPets) - totalPrice;
    } else if (pricingType === 'FLAT_RATE') {
      totalPrice = basePrice;
      perPetCost = basePrice / numberOfPets;
      savings = (basePrice * numberOfPets) - basePrice;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        totalPrice,
        perPetCost,
        savings,
        savingsPercentage: savings > 0 ? (savings / (basePrice * numberOfPets)) * 100 : 0,
        breakdown: []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Check pet compatibility
export const checkPetCompatibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pets, requireSameOwner } = req.body;
    
    if (!pets || !Array.isArray(pets)) {
      return next(new AppError('Pets array is required', 400));
    }
    
    const isCompatible = true;
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Simple compatibility check
    if (requireSameOwner && pets.length > 1) {
      const owners = [...new Set(pets.map((p: any) => p.ownerId))];
      if (owners.length > 1) {
        issues.push('All pets must belong to the same owner');
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        isCompatible: issues.length === 0,
        issues,
        warnings,
        recommendations: []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get suite occupancy
export const getSuiteOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suiteId } = req.params;
    
    // In production, query reservations for this suite
    res.status(200).json({
      status: 'success',
      data: {
        suiteId,
        currentOccupancy: 0,
        maxCapacity: 4,
        occupancyPercentage: 0,
        pets: []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Check suite availability for multiple pets
export const checkSuiteAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suiteType, numberOfPets, startDate, endDate } = req.body;
    
    if (!numberOfPets || !startDate || !endDate) {
      return next(new AppError('Missing required fields', 400));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        isAvailable: true,
        availableSuites: [],
        message: 'Suites available for multiple pets'
      }
    });
  } catch (error) {
    next(error);
  }
};
