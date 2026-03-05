import { TenantRequest } from '../middleware/tenant.middleware';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// Get all custom icons for tenant
export const getAllCustomIcons = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const icons = await prisma.customIcon.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json({
      status: 'success',
      data: icons
    });
  } catch (error) {
    console.error('Error fetching custom icons:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch custom icons'
    });
  }
};

// Get single custom icon
export const getCustomIconById = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const icon = await prisma.customIcon.findFirst({
      where: {
        id,
        tenantId
      }
    });
    
    if (!icon) {
      return res.status(404).json({
        status: 'error',
        message: 'Custom icon not found'
      });
    }
    
    res.json({
      status: 'success',
      data: icon
    });
  } catch (error) {
    console.error('Error fetching custom icon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch custom icon'
    });
  }
};

// Create new custom icon
export const createCustomIcon = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { name, label, description, category } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'Image file is required'
      });
    }
    
    // Validate required fields
    if (!name || !label || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, label, and description are required'
      });
    }
    
    // Check if icon with same name already exists for this tenant
    const existing = await prisma.customIcon.findFirst({
      where: {
        tenantId,
        name
      }
    });
    
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'An icon with this name already exists'
      });
    }
    
    // Create the icon record
    const icon = await prisma.customIcon.create({
      data: {
        tenantId,
        name,
        label,
        description,
        category: category || 'custom',
        imageUrl: `/uploads/icons/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    });
    
    res.status(201).json({
      status: 'success',
      data: icon
    });
  } catch (error) {
    console.error('Error creating custom icon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create custom icon'
    });
  }
};

// Update custom icon
export const updateCustomIcon = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { name, label, description, category, displayOrder } = req.body;
    const file = req.file;
    
    // Check if icon exists
    const existing = await prisma.customIcon.findFirst({
      where: {
        id,
        tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Custom icon not found'
      });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (label) updateData.label = label;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);
    
    // If new file uploaded, update file fields
    if (file) {
      // Delete old file
      try {
        const oldFilePath = path.join(__dirname, '../../', existing.imageUrl);
        await fs.unlink(oldFilePath);
      } catch (err) {
        console.error('Error deleting old file:', err);
      }
      
      updateData.imageUrl = `/uploads/icons/${file.filename}`;
      updateData.fileName = file.originalname;
      updateData.fileSize = file.size;
      updateData.mimeType = file.mimetype;
    }
    
    const icon = await prisma.customIcon.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      status: 'success',
      data: icon
    });
  } catch (error) {
    console.error('Error updating custom icon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update custom icon'
    });
  }
};

// Delete custom icon
export const deleteCustomIcon = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Check if icon exists
    const existing = await prisma.customIcon.findFirst({
      where: {
        id,
        tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Custom icon not found'
      });
    }
    
    // Delete the file
    try {
      const filePath = path.join(__dirname, '../../', existing.imageUrl);
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }
    
    // Delete the database record
    await prisma.customIcon.delete({
      where: { id }
    });
    
    res.json({
      status: 'success',
      message: 'Custom icon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom icon:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete custom icon'
    });
  }
};
