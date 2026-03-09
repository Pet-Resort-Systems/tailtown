import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const vaccineRecordsDir = path.join(uploadsDir, 'vaccine-records');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(vaccineRecordsDir)) {
  fs.mkdirSync(vaccineRecordsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, vaccineRecordsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename: petId-timestamp-originalname
    const petId = req.params.petId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${petId}-${timestamp}-${sanitizedName}${ext}`;
    cb(null, filename);
  },
});

// File filter to accept only images and PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, HEIC, and PDF files are allowed.'));
  }
};

// Configure multer
export const uploadVaccineRecord = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Helper function to delete a file
export const deleteFile = (filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(vaccineRecordsDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to get file path
export const getFilePath = (filename: string): string => {
  return path.join(vaccineRecordsDir, filename);
};

// Helper function to check if file exists
export const fileExists = (filename: string): boolean => {
  const filePath = path.join(vaccineRecordsDir, filename);
  return fs.existsSync(filePath);
};

// Helper function to get file URL
export const getFileUrl = (filename: string, req: Request): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/vaccine-records/${filename}`;
};
