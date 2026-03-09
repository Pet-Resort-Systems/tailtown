import { TenantRequest } from '../middleware/tenant.middleware';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all templates
export const getAllTemplates = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { area, isActive } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const where: any = { tenantId };
    if (area) where.area = area;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const templates = await prisma.checklistTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse JSON items
    const parsed = templates.map(t => ({
      ...t,
      items: JSON.parse(t.items),
      requiredForCompletion: t.requiredForCompletion ? JSON.parse(t.requiredForCompletion) : []
    }));
    
    res.status(200).json({ status: 'success', data: parsed });
  } catch (error) {
    next(error);
  }
};

// Get template by ID
export const getTemplateById = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const template = await prisma.checklistTemplate.findFirst({ 
      where: { id, tenantId } 
    });
    
    if (!template) {
      return next(new AppError('Template not found', 404));
    }
    
    const parsed = {
      ...template,
      items: JSON.parse(template.items),
      requiredForCompletion: template.requiredForCompletion ? JSON.parse(template.requiredForCompletion) : []
    };
    
    res.status(200).json({ status: 'success', data: parsed });
  } catch (error) {
    next(error);
  }
};

// Create template
export const createTemplate = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, area, items, estimatedMinutes, requiredForCompletion } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!name || !description || !area || !items) {
      return next(new AppError('Missing required fields', 400));
    }
    
    // Add IDs to items
    const itemsWithIds = items.map((item: any, index: number) => ({
      ...item,
      id: `item-${index + 1}`
    }));
    
    const template = await prisma.checklistTemplate.create({
      data: {
        tenantId,
        name,
        description,
        area,
        items: JSON.stringify(itemsWithIds),
        estimatedMinutes: estimatedMinutes || 15,
        requiredForCompletion: requiredForCompletion ? JSON.stringify(requiredForCompletion) : null
      }
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        ...template,
        items: itemsWithIds,
        requiredForCompletion: requiredForCompletion || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update template
export const updateTemplate = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, items, estimatedMinutes, isActive, requiredForCompletion } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Verify template belongs to tenant
    const existing = await prisma.checklistTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return next(new AppError('Template not found', 404));
    }
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (items) updateData.items = JSON.stringify(items);
    if (estimatedMinutes) updateData.estimatedMinutes = estimatedMinutes;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (requiredForCompletion) updateData.requiredForCompletion = JSON.stringify(requiredForCompletion);
    
    const template = await prisma.checklistTemplate.update({
      where: { id },
      data: updateData
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        ...template,
        items: JSON.parse(template.items),
        requiredForCompletion: template.requiredForCompletion ? JSON.parse(template.requiredForCompletion) : []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete template
export const deleteTemplate = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Verify template belongs to tenant before deleting
    const existing = await prisma.checklistTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return next(new AppError('Template not found', 404));
    }
    
    await prisma.checklistTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Start checklist (create instance)
export const startChecklist = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const {
      templateId,
      reservationId,
      petId,
      resourceId,
      customerId,
      assignedToStaffId,
      assignedToStaffName
    } = req.body;
    
    if (!templateId) {
      return next(new AppError('Template ID is required', 400));
    }
    
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const template = await prisma.checklistTemplate.findFirst({ 
      where: { id: templateId, tenantId } 
    });
    
    if (!template) {
      return next(new AppError('Template not found', 404));
    }
    
    // Initialize items with empty values
    const templateItems = JSON.parse(template.items);
    const instanceItems = templateItems.map((item: any) => ({
      templateItemId: item.id,
      label: item.label,
      description: item.description,
      type: item.type,
      isRequired: item.isRequired,
      isCompleted: false
    }));
    
    const instance = await prisma.checklistInstance.create({
      data: {
        tenantId,
        templateId,
        reservationId,
        petId,
        resourceId,
        customerId,
        assignedToStaffId,
        assignedToStaffName,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        items: JSON.stringify(instanceItems)
      }
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        ...instance,
        items: instanceItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get checklist instance
export const getChecklistInstance = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const instance = await prisma.checklistInstance.findFirst({
      where: { id, tenantId },
      include: { template: true }
    });
    
    if (!instance) {
      return next(new AppError('Checklist not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        ...instance,
        items: JSON.parse(instance.items),
        template: {
          ...instance.template,
          items: JSON.parse(instance.template.items)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update checklist item
export const updateChecklistItem = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { templateItemId, ...values } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const instance = await prisma.checklistInstance.findFirst({ 
      where: { id, tenantId } 
    });
    
    if (!instance) {
      return next(new AppError('Checklist not found', 404));
    }
    
    const items = JSON.parse(instance.items);
    const itemIndex = items.findIndex((i: any) => i.templateItemId === templateItemId);
    
    if (itemIndex === -1) {
      return next(new AppError('Item not found', 404));
    }
    
    // Update item
    items[itemIndex] = {
      ...items[itemIndex],
      ...values,
      isCompleted: true,
      completedAt: new Date()
    };
    
    const updated = await prisma.checklistInstance.update({
      where: { id },
      data: { items: JSON.stringify(items) }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        ...updated,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

// Complete checklist
export const completeChecklist = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Verify instance belongs to tenant
    const existing = await prisma.checklistInstance.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return next(new AppError('Checklist not found', 404));
    }
    
    const instance = await prisma.checklistInstance.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        ...instance,
        items: JSON.parse(instance.items)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all instances
export const getAllInstances = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { status, assignedToStaffId, reservationId } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const where: any = { tenantId };
    if (status) where.status = status;
    if (assignedToStaffId) where.assignedToStaffId = assignedToStaffId;
    if (reservationId) where.reservationId = reservationId;
    
    const instances = await prisma.checklistInstance.findMany({
      where,
      include: { template: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsed = instances.map(i => ({
      ...i,
      items: JSON.parse(i.items),
      template: {
        ...i.template,
        items: JSON.parse(i.template.items)
      }
    }));
    
    res.status(200).json({ status: 'success', data: parsed });
  } catch (error) {
    next(error);
  }
};

// Get checklist stats
export const getChecklistStats = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const [total, completed, pending, inProgress] = await Promise.all([
      prisma.checklistInstance.count({ where: { tenantId } }),
      prisma.checklistInstance.count({ where: { tenantId, status: 'COMPLETED' } }),
      prisma.checklistInstance.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.checklistInstance.count({ where: { tenantId, status: 'IN_PROGRESS' } })
    ]);
    
    const completedInstances = await prisma.checklistInstance.findMany({
      where: { tenantId, status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true }
    });
    
    let averageCompletionTime = 0;
    if (completedInstances.length > 0) {
      const totalTime = completedInstances.reduce((sum, inst) => {
        const start = new Date(inst.startedAt!).getTime();
        const end = new Date(inst.completedAt!).getTime();
        return sum + (end - start);
      }, 0);
      averageCompletionTime = Math.round(totalTime / completedInstances.length / 60000); // minutes
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        totalCompleted: completed,
        totalPending: pending,
        totalInProgress: inProgress,
        averageCompletionTime,
        completionRate: total > 0 ? (completed / total) * 100 : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
