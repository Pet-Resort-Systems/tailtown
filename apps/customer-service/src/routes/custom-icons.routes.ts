import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllCustomIcons,
  getCustomIconById,
  createCustomIcon,
  updateCustomIcon,
  deleteCustomIcon
} from '../controllers/custom-icons.controller';

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/icons');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `icon-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 // 1MB max
  }
});

// Routes
router.get('/', getAllCustomIcons);
router.get('/:id', getCustomIconById);
router.post('/', upload.single('image'), createCustomIcon);
router.put('/:id', upload.single('image'), updateCustomIcon);
router.delete('/:id', deleteCustomIcon);

export default router;
