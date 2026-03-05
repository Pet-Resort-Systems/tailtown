import { Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { deleteFile, getFileUrl } from '../services/upload.service';

export class VaccineUploadController {
  /**
   * POST /api/pets/:petId/vaccine-records/upload
   * Upload a vaccine record file for a pet
   */
  async uploadVaccineRecord(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { petId } = req.params;
      const tenantId = req.tenantId!;
      const file = req.file;

      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      // Verify pet exists and belongs to tenant
      const pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          tenantId,
        },
      });

      if (!pet) {
        // Delete the uploaded file if pet not found
        await deleteFile(file.filename);
        throw new AppError('Pet not found', 404);
      }

      // Get existing vaccine record files or initialize empty array
      const existingFiles = (pet.vaccineRecordFiles as any[]) || [];

      // Add new file to the array
      const newFile = {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: (req as any).user?.id || 'system', // If you have user auth
      };

      const updatedFiles = [...existingFiles, newFile];

      // Update pet record with new file
      const updatedPet = await prisma.pet.update({
        where: { id: petId },
        data: {
          vaccineRecordFiles: updatedFiles as any,
        },
      });

      // Generate file URL
      const fileUrl = getFileUrl(file.filename, req);

      res.json({
        success: true,
        message: 'Vaccine record uploaded successfully',
        data: {
          file: {
            ...newFile,
            url: fileUrl,
          },
          totalFiles: updatedFiles.length,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await deleteFile(req.file.filename);
        } catch (deleteError) {
          console.error('Error deleting file after upload failure:', deleteError);
        }
      }
      next(error);
    }
  }

  /**
   * GET /api/pets/:petId/vaccine-records
   * Get all vaccine record files for a pet
   */
  async getVaccineRecords(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { petId } = req.params;
      const tenantId = req.tenantId!;

      const pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
          vaccineRecordFiles: true,
        },
      });

      if (!pet) {
        throw new AppError('Pet not found', 404);
      }

      const files = (pet.vaccineRecordFiles as any[]) || [];

      // Add URLs to each file
      const filesWithUrls = files.map(file => ({
        ...file,
        url: getFileUrl(file.filename, req),
      }));

      res.json({
        success: true,
        data: {
          petId: pet.id,
          petName: pet.name,
          files: filesWithUrls,
          totalFiles: filesWithUrls.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/pets/:petId/vaccine-records/:filename
   * Delete a vaccine record file
   */
  async deleteVaccineRecord(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { petId, filename } = req.params;
      const tenantId = req.tenantId!;

      const pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          tenantId,
        },
      });

      if (!pet) {
        throw new AppError('Pet not found', 404);
      }

      const existingFiles = (pet.vaccineRecordFiles as any[]) || [];
      const fileToDelete = existingFiles.find(f => f.filename === filename);

      if (!fileToDelete) {
        throw new AppError('File not found', 404);
      }

      // Remove file from array
      const updatedFiles = existingFiles.filter(f => f.filename !== filename);

      // Update pet record
      await prisma.pet.update({
        where: { id: petId },
        data: {
          vaccineRecordFiles: updatedFiles as any,
        },
      });

      // Delete physical file
      try {
        await deleteFile(filename);
      } catch (deleteError) {
        console.error('Error deleting physical file:', deleteError);
        // Continue even if physical file deletion fails
      }

      res.json({
        success: true,
        message: 'Vaccine record deleted successfully',
        data: {
          deletedFile: fileToDelete,
          remainingFiles: updatedFiles.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pets/:petId/vaccine-records/:filename/download
   * Download a vaccine record file
   */
  async downloadVaccineRecord(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { petId, filename } = req.params;
      const tenantId = req.tenantId!;

      const pet = await prisma.pet.findFirst({
        where: {
          id: petId,
          tenantId,
        },
      });

      if (!pet) {
        throw new AppError('Pet not found', 404);
      }

      const existingFiles = (pet.vaccineRecordFiles as any[]) || [];
      const file = existingFiles.find(f => f.filename === filename);

      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Send file for download
      const path = require('path');
      const filePath = path.join(__dirname, '../../uploads/vaccine-records', filename);
      
      res.download(filePath, file.originalName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          if (!res.headersSent) {
            next(new AppError('Error downloading file', 500));
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vaccineUploadController = new VaccineUploadController();
