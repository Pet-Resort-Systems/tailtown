import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    const uploadDir = 'uploads/pets';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pet-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  },
}).single('photo');

// Get all pets
/**
 * Retrieves all pets with pagination and search functionality.
 * Includes customer information in the response.
 * @param req - Express request object with query parameters
 * @param res - Express response object
 * @param next - Express next function
 */
export const getAllPets = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Process get all pets request
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = String(req.query.search || '');
    const skip = (page - 1) * limit;

    // Use tenant ID from middleware
    const tenantId = req.tenantId!;

    // Build where clause with tenant filter
    const where: any = {
      tenantId,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { breed: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [pets, total] = await prisma.$transaction([
      prisma.pet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          breed: true,
          color: true,
          birthdate: true,
          weight: true,
          gender: true,
          isNeutered: true,
          microchipNumber: true,
          profilePhoto: true,
          customerId: true,
          isActive: true,
          playgroupCompatibility: true,
          specialRequirements: true,
          petIcons: true,
          vaccinationStatus: true,
          vaccineExpirations: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.pet.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      results: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: pets,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single pet by ID
export const getPetById = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const pet = await prisma.pet.findFirst({
      where: { id, tenantId },
      include: {
        medicalRecords: {
          orderBy: {
            recordDate: 'desc',
          },
        },
      },
    });

    // Photo handling removed as profilePhoto is not in the current schema

    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }

    // Auto-sync vaccination data from medical records to vaccinationStatus field
    if (pet.medicalRecords && pet.medicalRecords.length > 0) {
      const vaccinationStatus: any = pet.vaccinationStatus || {};
      const vaccineExpirations: any = pet.vaccineExpirations || {};
      let needsUpdate = false;

      // Map medical records to vaccination data
      const vaccineMap: { [key: string]: string } = {
        'rabies vaccination': 'Rabies',
        'dhpp vaccination': 'DHPP',
        'bordetella vaccination': 'Bordetella',
        'fvrcp vaccination': 'FVRCP',
        'canine influenza vaccination': 'Influenza',
        'feline leukemia vaccination': 'Lepto',
      };

      pet.medicalRecords.forEach((record: any) => {
        if (record.recordType === 'VACCINATION' && record.description) {
          const vaccineName = vaccineMap[record.description.toLowerCase()];

          if (vaccineName && record.expirationDate) {
            const expDate = new Date(record.expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            const status = expDate >= today ? 'CURRENT' : 'EXPIRED';

            // Check if this vaccine is missing or outdated in vaccinationStatus
            if (
              !vaccinationStatus[vaccineName] ||
              vaccinationStatus[vaccineName].expiration !==
                record.expirationDate.toISOString()
            ) {
              vaccinationStatus[vaccineName] = {
                status: status,
                expiration: record.expirationDate.toISOString(),
                lastGiven: record.recordDate
                  ? record.recordDate.toISOString()
                  : undefined,
              };
              vaccineExpirations[vaccineName] =
                record.expirationDate.toISOString();
              needsUpdate = true;
            }
          }
        }
      });

      // Auto-save to database if we found new vaccination data
      if (needsUpdate) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            vaccinationStatus,
            vaccineExpirations,
          },
        });
      }

      // Update pet object with populated vaccination data
      pet.vaccinationStatus = vaccinationStatus;
      pet.vaccineExpirations = vaccineExpirations;
    }

    res.status(200).json({
      status: 'success',
      data: pet,
    });
  } catch (error) {
    next(error);
  }
};

// Get all reservations for a pet
export const getPetReservations = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findUnique({
      where: { id },
      include: { reservations: true },
    });

    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }

    if (!pet || !pet.reservations || pet.reservations.length === 0) {
      return next(new AppError('No reservations found for this pet', 404));
    }

    res.status(200).json({
      status: 'success',
      results: pet.reservations.length,
      data: pet.reservations,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new pet
/**
 * Creates a new pet record with associated customer and profile photo.
 * Validates customer existence and handles photo upload.
 * @param req - Express request object containing pet data
 * @param res - Express response object
 * @param next - Express next function
 */
export const createPet = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    let petData = { ...req.body };

    // Handle empty date strings
    if (petData.birthdate === '') {
      petData.birthdate = null;
    } else if (petData.birthdate) {
      petData.birthdate = new Date(petData.birthdate);
    }

    // Handle vaccine data - keep as JSON strings, don't convert to Date objects
    if (petData.vaccineExpirations) {
      try {
        if (typeof petData.vaccineExpirations === 'string') {
          petData.vaccineExpirations = JSON.parse(petData.vaccineExpirations);
        }
        // JSON fields need strings, not Date objects - leave dates as strings
      } catch (e) {
        return next(new AppError('Invalid vaccine expiration data', 400));
      }
    }

    // Handle vaccination status
    if (petData.vaccinationStatus) {
      try {
        if (typeof petData.vaccinationStatus === 'string') {
          petData.vaccinationStatus = JSON.parse(petData.vaccinationStatus);
        }
      } catch (e) {
        return next(new AppError('Invalid vaccination status data', 400));
      }
    }

    // Check if the customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id: petData.customerId,
        tenantId,
      },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Add tenantId to pet data
    petData.tenantId = tenantId;

    // Create the pet
    const newPet = await prisma.pet.create({
      data: petData,
    });

    res.status(201).json({
      status: 'success',
      data: newPet,
    });
  } catch (error) {
    next(error);
  }
};

// Update a pet
/**
 * Updates an existing pet's information and profile photo.
 * Validates pet existence and handles photo updates.
 * @param req - Express request object containing updated pet data
 * @param res - Express response object
 * @param next - Express next function
 */
export const updatePet = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    let petData = { ...req.body };

    // Handle empty date strings
    if (petData.birthdate === '') {
      petData.birthdate = null;
    } else if (petData.birthdate) {
      petData.birthdate = new Date(petData.birthdate);
    }

    // Handle vaccine data - keep as JSON strings, don't convert to Date objects
    if (petData.vaccineExpirations) {
      try {
        if (typeof petData.vaccineExpirations === 'string') {
          petData.vaccineExpirations = JSON.parse(petData.vaccineExpirations);
        }
        // JSON fields need strings, not Date objects - leave dates as strings
      } catch (e) {
        return next(new AppError('Invalid vaccine expiration data', 400));
      }
    }

    // Handle vaccination status
    if (petData.vaccinationStatus) {
      try {
        if (typeof petData.vaccinationStatus === 'string') {
          petData.vaccinationStatus = JSON.parse(petData.vaccinationStatus);
        }
      } catch (e) {
        return next(new AppError('Invalid vaccination status data', 400));
      }
    }

    // Check if pet exists and belongs to this tenant
    const existingPet = await prisma.pet.findFirst({
      where: {
        id,
        tenantId: req.tenantId,
      },
    });

    if (!existingPet) {
      return next(new AppError('Pet not found', 404));
    }

    // If customerId is being updated, check if the customer exists and belongs to this tenant
    if (petData.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: petData.customerId,
          tenantId: req.tenantId,
        },
      });

      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }
    }

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: petData,
    });

    res.status(200).json({
      status: 'success',
      data: updatedPet,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a pet
// Upload a pet's photo
export const uploadPetPhoto = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if pet exists
    const pet = await prisma.pet.findUnique({
      where: { id },
    });

    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }

    // Handle file upload
    upload(req, res, async (err: any) => {
      if (err instanceof multer.MulterError) {
        return next(new AppError(`Upload error: ${err.message}`, 400));
      } else if (err) {
        return next(new AppError(err.message, 400));
      }

      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }

      // Delete old photo if it exists
      // Photo handling removed as profilePhoto is not in the current schema
      // Will need to be updated when the schema includes photo handling
      // const oldPhotoPath = path.join(process.cwd(), pet.profilePhoto);
      // if (fs.existsSync(oldPhotoPath)) {
      //   fs.unlinkSync(oldPhotoPath);
      // }

      // Update pet with new photo URL - use a simpler path without the /api prefix
      const photoUrl = `/uploads/pets/${path.basename(req.file.path)}`;

      // Update pet with new photo URL
      const updatedPet = await prisma.pet.update({
        where: { id },
        data: { profilePhoto: photoUrl },
      });

      res.status(200).json({
        status: 'success',
        data: updatedPet,
        message: 'Photo uploaded successfully',
      });
    });
  } catch (error) {
    next(error);
  }
};

// Get all pets for a customer
export const getPetsByCustomer = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const pets = await prisma.pet.findMany({
      where: { customerId },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      results: pets.length,
      totalPages: 1,
      currentPage: 1,
      data: pets,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePet = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.pet.delete({
      where: { id },
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate a pet (soft delete).
 * Sets isActive to false and records the deactivation date.
 * Used when a pet passes away or is no longer a client.
 * History is preserved but communications will stop.
 */
export const deactivatePet = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { reason, deactivatedAt } = req.body;

    // Check if pet exists and belongs to this tenant
    const existingPet = await prisma.pet.findFirst({
      where: { id, tenantId },
    });

    if (!existingPet) {
      return next(new AppError('Pet not found', 404));
    }

    // Deactivate the pet
    const updatedPet = await prisma.pet.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: deactivatedAt ? new Date(deactivatedAt) : new Date(),
        deactivationReason: reason || null,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Pet has been deactivated',
      data: updatedPet,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate a previously deactivated pet.
 * Sets isActive to true and clears deactivation fields.
 */
export const reactivatePet = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    // Check if pet exists and belongs to this tenant
    const existingPet = await prisma.pet.findFirst({
      where: { id, tenantId },
    });

    if (!existingPet) {
      return next(new AppError('Pet not found', 404));
    }

    // Reactivate the pet
    const updatedPet = await prisma.pet.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Pet has been reactivated',
      data: updatedPet,
    });
  } catch (error) {
    next(error);
  }
};
