import { TenantRequest } from '../middleware/tenant.middleware';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

/**
 * Vaccine Requirement Controller
 * Manages vaccine requirements configuration for tenants
 */

// Get all vaccine requirements
export const getAllVaccineRequirements = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { petType, serviceType, isActive } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const where: any = { tenantId };
    if (petType) where.petType = petType;
    if (serviceType) where.serviceType = serviceType;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const requirements = await prisma.vaccineRequirement.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.status(200).json({ status: 'success', data: requirements });
  } catch (error) {
    next(error);
  }
};

// Get vaccine requirement by ID
export const getVaccineRequirementById = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const requirement = await prisma.vaccineRequirement.findFirst({
      where: { id, tenantId }
    });
    
    if (!requirement) {
      return next(new AppError('Vaccine requirement not found', 404));
    }
    
    res.status(200).json({ status: 'success', data: requirement });
  } catch (error) {
    next(error);
  }
};

// Create vaccine requirement
export const createVaccineRequirement = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      petType,
      serviceType,
      isRequired,
      validityPeriodMonths,
      reminderDaysBefore,
      isActive,
      displayOrder,
      notes
    } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Validate required fields
    if (!name) {
      return next(new AppError('Vaccine name is required', 400));
    }
    
    // Check for duplicate
    const existing = await prisma.vaccineRequirement.findFirst({
      where: {
        tenantId,
        name,
        petType: petType || null,
        serviceType: serviceType || null
      }
    });
    
    if (existing) {
      return next(new AppError('A vaccine requirement with this name and criteria already exists', 409));
    }
    
    const requirement = await prisma.vaccineRequirement.create({
      data: {
        tenantId,
        name,
        description,
        petType,
        serviceType,
        isRequired: isRequired !== undefined ? isRequired : true,
        validityPeriodMonths,
        reminderDaysBefore: reminderDaysBefore || 30,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        notes
      }
    });
    
    res.status(201).json({ status: 'success', data: requirement });
  } catch (error) {
    next(error);
  }
};

// Update vaccine requirement
export const updateVaccineRequirement = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Verify requirement exists
    const existing = await prisma.vaccineRequirement.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Vaccine requirement not found', 404));
    }
    
    const updateData: any = {};
    const allowedFields = [
      'name', 'description', 'petType', 'serviceType', 'isRequired',
      'validityPeriodMonths', 'reminderDaysBefore', 'isActive', 'displayOrder', 'notes'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const requirement = await prisma.vaccineRequirement.update({
      where: { id },
      data: updateData
    });
    
    res.status(200).json({ status: 'success', data: requirement });
  } catch (error) {
    next(error);
  }
};

// Delete vaccine requirement
export const deleteVaccineRequirement = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const existing = await prisma.vaccineRequirement.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Vaccine requirement not found', 404));
    }
    
    await prisma.vaccineRequirement.delete({ where: { id } });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get applicable vaccine requirements for a pet
export const getApplicableRequirements = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { petId } = req.params;
    const { serviceType } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Get pet details
    const pet = await prisma.pet.findFirst({
      where: { id: petId, tenantId }
    });
    
    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }
    
    // Get applicable requirements
    // Requirements apply if:
    // 1. petType is null (applies to all) OR matches pet's type
    // 2. serviceType is null (applies to all) OR matches requested service
    const requirements = await prisma.vaccineRequirement.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { petType: null },
          { petType: pet.type }
        ],
        AND: serviceType ? {
          OR: [
            { serviceType: null },
            { serviceType: serviceType as string }
          ]
        } : {}
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.status(200).json({ status: 'success', data: requirements });
  } catch (error) {
    next(error);
  }
};

// Check pet's vaccine compliance
export const checkPetCompliance = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { petId } = req.params;
    const { serviceType } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Get pet with vaccination data
    const pet = await prisma.pet.findFirst({
      where: { id: petId, tenantId }
    });
    
    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }
    
    // Get applicable requirements
    const requirements = await prisma.vaccineRequirement.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { petType: null },
          { petType: pet.type }
        ],
        AND: serviceType ? {
          OR: [
            { serviceType: null },
            { serviceType: serviceType as string }
          ]
        } : {}
      }
    });
    
    // Parse pet's vaccination data
    const vaccinationStatus = (pet.vaccinationStatus as any) || {};
    const vaccineExpirations = (pet.vaccineExpirations as any) || {};
    
    // Check compliance for each requirement
    const complianceResults = requirements.map(req => {
      const vaccineStatus = vaccinationStatus[req.name];
      const expirationDate = vaccineExpirations[req.name];
      
      let isCompliant = false;
      let status = 'MISSING';
      let daysUntilExpiration = null;
      
      if (vaccineStatus && vaccineStatus.status === 'CURRENT' && expirationDate) {
        const expDate = new Date(expirationDate);
        const today = new Date();
        const diffTime = expDate.getTime() - today.getTime();
        daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiration > 0) {
          isCompliant = true;
          status = 'CURRENT';
          
          // Check if reminder should be sent
          if (req.reminderDaysBefore && daysUntilExpiration <= req.reminderDaysBefore) {
            status = 'EXPIRING_SOON';
          }
        } else {
          status = 'EXPIRED';
        }
      }
      
      return {
        requirementId: req.id,
        vaccineName: req.name,
        isRequired: req.isRequired,
        isCompliant,
        status,
        expirationDate,
        daysUntilExpiration,
        validityPeriodMonths: req.validityPeriodMonths
      };
    });
    
    // Overall compliance
    const requiredVaccines = complianceResults.filter(r => r.isRequired);
    const isFullyCompliant = requiredVaccines.every(r => r.isCompliant);
    const missingRequired = requiredVaccines.filter(r => !r.isCompliant);
    
    res.status(200).json({
      status: 'success',
      data: {
        petId,
        petName: pet.name,
        petType: pet.type,
        isFullyCompliant,
        complianceResults,
        missingRequired: missingRequired.map(r => r.vaccineName),
        summary: {
          total: complianceResults.length,
          required: requiredVaccines.length,
          compliant: complianceResults.filter(r => r.isCompliant).length,
          missing: complianceResults.filter(r => r.status === 'MISSING').length,
          expired: complianceResults.filter(r => r.status === 'EXPIRED').length,
          expiringSoon: complianceResults.filter(r => r.status === 'EXPIRING_SOON').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update display order
export const updateDisplayOrder = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { requirements } = req.body; // Array of { id, displayOrder }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!Array.isArray(requirements)) {
      return next(new AppError('Requirements must be an array', 400));
    }
    
    // Update each requirement's display order
    await Promise.all(
      requirements.map(({ id, displayOrder }) =>
        prisma.vaccineRequirement.updateMany({
          where: { id, tenantId },
          data: { displayOrder }
        })
      )
    );
    
    res.status(200).json({ status: 'success', message: 'Display order updated' });
  } catch (error) {
    next(error);
  }
};
