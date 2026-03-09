import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

// Define interfaces for raw SQL query results
interface CountResult {
  total: number;
}

interface StaffScheduleRow {
  id: string;
  staff_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  position: string;
}

interface StaffRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  position: string;
}

const prisma = new PrismaClient({
  // Add logging to debug Prisma operations
  log: ['query', 'error', 'warn']
});

// Get all schedules 
export const getAllSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, staffId } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    console.log('Fetching all staff schedules with params:', { startDate, endDate, staffId, page, limit });

    // Build the where condition for filtering
    const where: any = {};
    
    if (staffId) {
      where.staffId = staffId as string;
    }
    
    if (startDate) {
      where.date = {
        gte: new Date(startDate as string)
      };
    }
    
    if (endDate) {
      where.date = {
        ...(where.date || {}),
        lte: new Date(endDate as string)
      };
    }
    
    try {
      // First, get a small sample of data to check what we're dealing with
      const sampleSchedules = await prisma.$queryRaw`SELECT * FROM staff_schedules LIMIT 1`;
      console.log('Sample schedule data:', sampleSchedules);
      
      // Now query using direct SQL to avoid Prisma validation issues
      const countResult = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) as total FROM staff_schedules 
        WHERE 1=1
        ${staffId ? prisma.$queryRaw`AND staff_id = ${staffId}` : prisma.$queryRaw``}
        ${startDate ? prisma.$queryRaw`AND date >= ${new Date(startDate as string)}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND date <= ${new Date(endDate as string)}` : prisma.$queryRaw``}
      `;
      
      const total = Number(countResult[0]?.total) || 0;
      
      const schedulesData = await prisma.$queryRaw<StaffScheduleRow[]>`
        SELECT ss.*, 
               s.id as staff_id, s.first_name, s.last_name, s.email, 
               s.phone, s.role, s.department, s.position
        FROM staff_schedules ss
        JOIN staff s ON ss.staff_id = s.id
        WHERE 1=1
        ${staffId ? prisma.$queryRaw`AND ss.staff_id = ${staffId}` : prisma.$queryRaw``}
        ${startDate ? prisma.$queryRaw`AND ss.date >= ${new Date(startDate as string)}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND ss.date <= ${new Date(endDate as string)}` : prisma.$queryRaw``}
        ORDER BY ss.date ASC
        LIMIT ${limit} OFFSET ${skip}
      `;
      
      // Format the results to match the expected format
      const schedules = schedulesData.map(schedule => ({
        id: schedule.id,
        staffId: schedule.staff_id,
        date: schedule.date,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        status: schedule.status,
        notes: schedule.notes,
        location: schedule.location,
        role: schedule.role,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
        staff: {
          id: schedule.staff_id,
          firstName: schedule.first_name,
          lastName: schedule.last_name,
          email: schedule.email,
          phone: schedule.phone,
          role: schedule.role,
          department: schedule.department,
          position: schedule.position
        }
      }));
      
      console.log(`Found ${schedules.length} staff schedules`);
      
      return res.status(200).json({
        status: 'success',
        results: schedules.length,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: schedules
      });
    } catch (error) {
      console.error('Error fetching staff schedules:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve schedules'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get schedules for a specific staff member
export const getStaffSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log('Getting schedules for staff:', { staffId, startDate, endDate });
    
    try {
      // Query using direct SQL to avoid Prisma validation issues
      const schedulesData = await prisma.$queryRaw`
        SELECT ss.*, 
               s.id as staff_id, s.first_name, s.last_name, s.email, 
               s.phone, s.role, s.department, s.position
        FROM staff_schedules ss
        JOIN staff s ON ss.staff_id = s.id
        WHERE ss.staff_id = ${staffId}
        ${startDate ? prisma.$queryRaw`AND ss.date >= ${new Date(startDate as string)}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND ss.date <= ${new Date(endDate as string)}` : prisma.$queryRaw``}
        ORDER BY ss.date ASC
      `;
      
      // Format the results to match the expected format
      const schedules = (schedulesData as any[]).map(schedule => ({
        id: schedule.id,
        staffId: schedule.staff_id,
        date: schedule.date,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        status: schedule.status,
        notes: schedule.notes,
        location: schedule.location,
        role: schedule.role,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
        staff: {
          id: schedule.staff_id,
          firstName: schedule.first_name,
          lastName: schedule.last_name,
          email: schedule.email,
          phone: schedule.phone,
          role: schedule.role,
          department: schedule.department,
          position: schedule.position
        }
      }));
      
      console.log(`Found ${schedules.length} schedules for staff ${staffId}`);
      
      return res.status(200).json({
        status: 'success',
        results: schedules.length,
        data: schedules
      });
    } catch (error) {
      console.error(`Error fetching schedules for staff ${staffId}:`, error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve staff schedules'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Create new staff schedule
export const createStaffSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const scheduleData = req.body;
    
    console.log('Creating staff schedule:', { staffId, data: scheduleData });
    
    // Validate required fields
    if (!scheduleData.startTime || !scheduleData.endTime) {
      return res.status(400).json({
        status: 'error',
        message: 'Start time and end time are required'
      });
    }
    
    try {
      // Use raw SQL to avoid Prisma validation issues
      const date = new Date(scheduleData.startTime);
      const status = scheduleData.status || "SCHEDULED"; // Keep uppercase to match database
      const notes = scheduleData.notes || null;
      
      const result = await prisma.$executeRaw`
        INSERT INTO staff_schedules (
          id, staff_id, date, start_time, end_time, status, notes, created_at, updated_at
        ) VALUES (
          ${require('crypto').randomUUID()}, 
          ${staffId}, 
          ${date}, 
          ${scheduleData.startTime}, 
          ${scheduleData.endTime}, 
          ${status}, 
          ${notes}, 
          NOW(), 
          NOW()
        ) RETURNING id
      `;
      
      // Get the created schedule
      const createdSchedule = await prisma.$queryRaw<StaffScheduleRow[]>`
        SELECT ss.*, 
               s.first_name, s.last_name, s.email, 
               s.phone, s.role, s.department, s.position
        FROM staff_schedules ss
        JOIN staff s ON ss.staff_id = s.id
        WHERE ss.staff_id = ${staffId} 
        ORDER BY ss.created_at DESC 
        LIMIT 1
      `;
      
      const newSchedule = createdSchedule[0] ? {
        id: createdSchedule[0].id,
        staffId: createdSchedule[0].staff_id,
        date: createdSchedule[0].date,
        startTime: createdSchedule[0].start_time,
        endTime: createdSchedule[0].end_time,
        status: createdSchedule[0].status,
        notes: createdSchedule[0].notes,
        staff: {
          id: createdSchedule[0].staff_id,
          firstName: createdSchedule[0].first_name,
          lastName: createdSchedule[0].last_name,
          email: createdSchedule[0].email,
          phone: createdSchedule[0].phone,
          role: createdSchedule[0].role,
          department: createdSchedule[0].department,
          position: createdSchedule[0].position
        }
      } : null;
      
      console.log('Created staff schedule:', newSchedule);
      
      return res.status(201).json({
        status: 'success',
        data: newSchedule
      });
    } catch (error) {
      console.error('Error creating staff schedule:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create schedule'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Update staff schedule
export const updateStaffSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scheduleId } = req.params;
    const scheduleData = req.body;
    
    console.log('Updating staff schedule:', { scheduleId, data: scheduleData });
    
    try {
      // Check if schedule exists
      const existingSchedule = await prisma.$queryRaw<StaffScheduleRow[]>`
        SELECT * FROM staff_schedules WHERE id = ${scheduleId}
      `;
      
      if (!existingSchedule || existingSchedule.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Schedule with ID ${scheduleId} not found`
        });
      }
      
      // Prepare the update query parts
      let updateParts = [];
      let updateValues = [];
      
      if (scheduleData.startTime) {
        updateParts.push('start_time = ?');
        updateValues.push(scheduleData.startTime);
        
        // Also update date if startTime is provided
        updateParts.push('date = ?');
        updateValues.push(new Date(scheduleData.startTime));
      }
      
      if (scheduleData.endTime) {
        updateParts.push('end_time = ?');
        updateValues.push(scheduleData.endTime);
      }
      
      if (scheduleData.status) {
        updateParts.push('status = ?');
        // Keep uppercase to match what's in the database
        updateValues.push(scheduleData.status.toUpperCase());
      }
      
      if (scheduleData.notes !== undefined) {
        updateParts.push('notes = ?');
        updateValues.push(scheduleData.notes);
      }
      
      // Always update the updated_at timestamp
      updateParts.push('updated_at = NOW()');
      
      // If nothing to update, return the existing schedule
      if (updateParts.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: existingSchedule[0]
        });
      }
      
      // Execute the update
      const updateQuery = `
        UPDATE staff_schedules 
        SET ${updateParts.join(', ')} 
        WHERE id = ?
      `;
      
      await prisma.$executeRawUnsafe(updateQuery, ...updateValues, scheduleId);
      
      // Get the updated schedule with staff information
      const updatedScheduleData = await prisma.$queryRaw<StaffScheduleRow[]>`
        SELECT ss.*, 
               s.first_name, s.last_name, s.email, 
               s.phone, s.role, s.department, s.position
        FROM staff_schedules ss
        JOIN staff s ON ss.staff_id = s.id
        WHERE ss.id = ${scheduleId} 
        LIMIT 1
      `;
      
      if (!updatedScheduleData || updatedScheduleData.length === 0) {
        throw new Error(`Could not retrieve updated schedule ${scheduleId}`);
      }
      
      const updatedSchedule = {
        id: updatedScheduleData[0].id,
        staffId: updatedScheduleData[0].staff_id,
        date: updatedScheduleData[0].date,
        startTime: updatedScheduleData[0].start_time,
        endTime: updatedScheduleData[0].end_time,
        status: updatedScheduleData[0].status,
        notes: updatedScheduleData[0].notes,
        staff: {
          id: updatedScheduleData[0].staff_id,
          firstName: updatedScheduleData[0].first_name,
          lastName: updatedScheduleData[0].last_name,
          email: updatedScheduleData[0].email,
          phone: updatedScheduleData[0].phone,
          role: updatedScheduleData[0].role,
          department: updatedScheduleData[0].department,
          position: updatedScheduleData[0].position
        }
      };
      
      console.log('Updated staff schedule:', updatedSchedule);
      
      return res.status(200).json({
        status: 'success',
        data: updatedSchedule
      });
    } catch (error) {
      console.error(`Error updating staff schedule ${scheduleId}:`, error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update schedule'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Delete staff schedule
export const deleteStaffSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scheduleId } = req.params;
    
    console.log('Deleting staff schedule:', { scheduleId });
    
    try {
      // Check if schedule exists
      const existingSchedule = await prisma.$queryRaw<StaffScheduleRow[]>`
        SELECT * FROM staff_schedules WHERE id = ${scheduleId}
      `;
      
      if (!existingSchedule || existingSchedule.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Schedule with ID ${scheduleId} not found`
        });
      }
      
      // Delete the schedule
      await prisma.$executeRaw`
        DELETE FROM staff_schedules WHERE id = ${scheduleId}
      `;
      
      console.log(`Successfully deleted schedule ${scheduleId}`);
      
      return res.status(204).send();
    } catch (error) {
      console.error(`Error deleting staff schedule ${scheduleId}:`, error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete schedule'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Bulk create schedules
export const bulkCreateSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schedulesData = req.body;
    
    if (!Array.isArray(schedulesData) || schedulesData.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Request body must be a non-empty array of schedules'
      });
    }
    
    console.log(`Bulk creating ${schedulesData.length} staff schedules`);
    
    try {
      // Use transaction for atomicity
      const createdSchedules = await prisma.$transaction(async (tx) => {
        const schedules = [];
        
        for (const scheduleData of schedulesData) {
          // Validate required fields
          if (!scheduleData.staffId || !scheduleData.startTime || !scheduleData.endTime) {
            throw new Error('Staff ID, start time, and end time are required for all schedules');
          }
          
          // Generate UUID for the schedule
          const scheduleId = require('crypto').randomUUID();
          const date = new Date(scheduleData.startTime);
          const status = scheduleData.status || "SCHEDULED"; // Keep uppercase to match database
          const notes = scheduleData.notes || null;
          
          // Insert the schedule
          await tx.$executeRaw`
            INSERT INTO staff_schedules (
              id, staff_id, date, start_time, end_time, status, notes, created_at, updated_at
            ) VALUES (
              ${scheduleId}, 
              ${scheduleData.staffId}, 
              ${date}, 
              ${scheduleData.startTime}, 
              ${scheduleData.endTime}, 
              ${status}, 
              ${notes}, 
              NOW(), 
              NOW()
            )
          `;
          
          // Get staff information for the response
          const staffInfo = await tx.$queryRaw<StaffRow[]>`
            SELECT id, first_name, last_name, email, phone, role, department, position 
            FROM staff 
            WHERE id = ${scheduleData.staffId}
          `;
          
          if (staffInfo && staffInfo.length > 0) {
            const newSchedule = {
              id: scheduleId,
              staffId: scheduleData.staffId,
              date,
              startTime: scheduleData.startTime,
              endTime: scheduleData.endTime,
              status,
              notes,
              staff: {
                id: staffInfo[0].id,
                firstName: staffInfo[0].first_name,
                lastName: staffInfo[0].last_name,
                email: staffInfo[0].email,
                phone: staffInfo[0].phone,
                role: staffInfo[0].role,
                department: staffInfo[0].department,
                position: staffInfo[0].position
              }
            };
            
            schedules.push(newSchedule);
          }
        }
        
        return schedules;
      });
      
      console.log(`Successfully created staff schedules in bulk`);
      
      return res.status(201).json({
        status: 'success',
        message: `Successfully created ${schedulesData.length} schedules`
      });
    } catch (error: any) {
      console.error('Error in bulk creating staff schedules:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to bulk create schedules'
      });
    }
  } catch (error) {
    next(error);
  }
};
