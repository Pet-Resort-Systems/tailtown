import { TenantRequest } from '../middleware/tenant.middleware';
/**
 * Reference Data Controller
 * 
 * Handles API endpoints for breeds, veterinarians, and temperaments
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all breeds, optionally filtered by species
 * Returns breeds from the Gingr reference data file
 */
export const getBreeds = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { species } = req.query;
    
    // Load breeds from the reference data file
    const fs = require('fs');
    const path = require('path');
    // Use environment variable or default to relative path
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../../../data');
    const breedsPath = path.join(dataDir, 'gingr-reference/breeds.json');
    
    let breeds: any[] = [];
    
    if (fs.existsSync(breedsPath)) {
      const breedsData = JSON.parse(fs.readFileSync(breedsPath, 'utf8'));
      
      // Transform to expected format
      breeds = breedsData.map((breed: any) => ({
        id: breed.value,
        name: breed.label,
        species: breed.label.includes('Cat') || breed.label.includes('Feline') ? 'CAT' : 'DOG'
      }));
      
      // Filter by species if provided
      if (species) {
        breeds = breeds.filter((breed: any) => breed.species === species.toString().toUpperCase());
      }
    }

    res.status(200).json({
      status: 'success',
      data: breeds
    });
  } catch (error) {
    console.error('Error fetching breeds:', error);
    next(error);
  }
};

/**
 * Get all veterinarians
 * Returns unique veterinarians from pets table
 */
export const getVeterinarians = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

    // Get unique veterinarians from pets table
    const vets = await prisma.$queryRaw`
      SELECT DISTINCT 
        "vetName" as name, 
        "vetPhone" as phone
      FROM pets
      WHERE "tenantId" = ${tenantId}
        AND "vetName" IS NOT NULL
        AND "vetName" != ''
      ORDER BY "vetName" ASC
    `;

    res.status(200).json({
      status: 'success',
      data: vets
    });
  } catch (error) {
    console.error('Error fetching veterinarians:', error);
    next(error);
  }
};

/**
 * Get all temperament types
 * Returns static list based on PlayGroupType enum
 */
export const getTemperamentTypes = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Return static temperament types based on PlayGroupType enum
    const temperaments = [
      { id: 'SMALL_CALM', name: 'Small & Calm', description: 'Small dogs with calm temperament' },
      { id: 'SMALL_ACTIVE', name: 'Small & Active', description: 'Small dogs with active temperament' },
      { id: 'MEDIUM_CALM', name: 'Medium & Calm', description: 'Medium dogs with calm temperament' },
      { id: 'MEDIUM_ACTIVE', name: 'Medium & Active', description: 'Medium dogs with active temperament' },
      { id: 'LARGE_CALM', name: 'Large & Calm', description: 'Large dogs with calm temperament' },
      { id: 'LARGE_ACTIVE', name: 'Large & Active', description: 'Large dogs with active temperament' },
      { id: 'SOLO', name: 'Solo', description: 'Prefers to play alone' }
    ];

    res.status(200).json({
      status: 'success',
      data: temperaments
    });
  } catch (error) {
    console.error('Error fetching temperament types:', error);
    next(error);
  }
};

/**
 * Get temperaments for a specific pet
 * Returns the idealPlayGroup from the pet record
 */
export const getPetTemperaments = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { petId } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

    // Get the pet's idealPlayGroup
    const pet = await prisma.pet.findFirst({
      where: { id: petId, tenantId },
      select: { idealPlayGroup: true }
    });

    // Return as array for compatibility
    const temperaments = pet?.idealPlayGroup ? [pet.idealPlayGroup] : [];

    res.status(200).json({
      status: 'success',
      data: temperaments
    });
  } catch (error) {
    console.error('Error fetching pet temperaments:', error);
    next(error);
  }
};

/**
 * Update temperaments for a pet
 * Updates the idealPlayGroup field on the pet
 */
export const updatePetTemperaments = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { petId } = req.params;
    const { temperaments } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

    // Update the pet's idealPlayGroup (take first temperament if multiple)
    const idealPlayGroup = temperaments && temperaments.length > 0 ? temperaments[0] : null;
    
    await prisma.pet.update({
      where: { id: petId },
      data: { idealPlayGroup }
    });

    res.status(200).json({
      status: 'success',
      message: 'Temperaments updated successfully'
    });
  } catch (error) {
    console.error('Error updating pet temperaments:', error);
    next(error);
  }
};
