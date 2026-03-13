import api from './api';

export interface DashboardStats {
  petsInFacility: number;
  tasksCompleted: number;
  totalTasks: number;
}

export interface TodaySchedule {
  id: string;
  time: string;
  title: string;
  location?: string;
  startTime: string;
  endTime: string;
  role?: string;
  status: string;
}

export interface PendingTask {
  id: string;
  title: string;
  completed: number;
  total: number;
  type: string;
  dueDate?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  todaySchedule: TodaySchedule[];
  pendingTasks: PendingTask[];
  unreadMessages: number;
}

/**
 * Mobile API Service
 * Provides mobile-optimized endpoints for staff mobile app
 */
class MobileService {
  /**
   * Get dashboard data for mobile app
   * Aggregates stats, schedule, and tasks in one call
   */
  async getDashboardData(): Promise<DashboardData> {
    // Try to fetch from dedicated mobile endpoint first
    try {
      const response = await api.get<DashboardData>('/api/staff/mobile/dashboard');
      console.log('Mobile dashboard endpoint returned data:', response.data);
      return response.data;
    } catch (mobileError: any) {
      // Expected 404 - fallback to aggregating from individual endpoints
      if (mobileError?.response?.status === 404) {
        console.log('Mobile dashboard endpoint not found (404), aggregating from individual endpoints...');
      } else {
        console.warn('Mobile dashboard endpoint error:', mobileError?.message);
      }
      
      try {
        const [stats, schedule, tasks, unreadCount] = await Promise.all([
          this.getQuickStats(),
          this.getTodaySchedule(),
          this.getPendingTasks(),
          this.getUnreadMessageCount()
        ]);
        
        console.log('Aggregated dashboard data:', { stats, schedule: schedule.length, tasks: tasks.length, unreadCount });
        
        return {
          stats,
          todaySchedule: schedule,
          pendingTasks: tasks,
          unreadMessages: unreadCount
        };
      } catch (aggregateError) {
        console.error('Error aggregating dashboard data:', aggregateError);
        // Final fallback: return mock data
        console.log('Using mock data as final fallback');
        return this.getMockDashboardData();
      }
    }
  }

  /**
   * Get today's schedule for current staff member
   */
  async getTodaySchedule(): Promise<TodaySchedule[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try multiple endpoint patterns
      try {
        const response = await api.get(`/api/schedules/my-schedule`, {
          params: { date: today }
        });
        
        if (response.data) {
          const schedules = Array.isArray(response.data) ? response.data : 
                          response.data.data ? response.data.data : [];
          
          return schedules.map((s: any) => ({
            id: s.id,
            time: s.startTime,
            title: s.role || 'Shift',
            location: s.location || s.startingLocation || 'Main Building',
            startTime: s.startTime,
            endTime: s.endTime,
            role: s.role,
            status: s.status
          }));
        }
      } catch (err) {
        console.log('My-schedule endpoint not available, trying fallback');
      }
      
      return this.getMockSchedule();
    } catch (error) {
      console.error('Error fetching today schedule:', error);
      return this.getMockSchedule();
    }
  }

  /**
   * Get pending tasks/checklists for current staff member
   */
  async getPendingTasks(): Promise<PendingTask[]> {
    try {
      const response = await api.get<PendingTask[]>('/api/staff/mobile/tasks/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return this.getMockTasks();
    }
  }

  /**
   * Get quick stats for dashboard
   */
  async getQuickStats(): Promise<DashboardStats> {
    try {
      // Try mobile stats endpoint
      try {
        const response = await api.get<DashboardStats>('/api/staff/mobile/stats');
        return response.data;
      } catch (err) {
        // Fallback: calculate from reservations
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get('/api/reservations', {
          params: {
            startDate: today,
            endDate: today,
            status: 'CONFIRMED,CHECKED_IN'
          }
        });
        
        const reservations = response.data.data || [];
        const petsInFacility = reservations.length;
        
        // Get checklists for task stats
        try {
          const checklistResponse = await api.get('/api/checklists');
          const checklists = checklistResponse.data.data || [];
          const totalTasks = checklists.reduce((sum: number, c: any) => sum + (c.items?.length || 0), 0);
          const completedTasks = checklists.reduce((sum: number, c: any) => 
            sum + (c.items?.filter((i: any) => i.completed).length || 0), 0);
          
          return {
            petsInFacility,
            tasksCompleted: completedTasks,
            totalTasks
          };
        } catch (checklistErr) {
          return {
            petsInFacility,
            tasksCompleted: 0,
            totalTasks: 0
          };
        }
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      return this.getMockStats();
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(): Promise<number> {
    try {
      const response = await api.get<{ unreadCount: number }>('/api/messaging/unread-count');
      return response.data.unreadCount;
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      return 0;
    }
  }

  // Mock data methods for development/fallback
  private getMockDashboardData(): DashboardData {
    return {
      stats: this.getMockStats(),
      todaySchedule: this.getMockSchedule(),
      pendingTasks: this.getMockTasks(),
      unreadMessages: 3,
    };
  }

  private getMockStats(): DashboardStats {
    return {
      petsInFacility: 24,
      tasksCompleted: 8,
      totalTasks: 12,
    };
  }

  private getMockSchedule(): TodaySchedule[] {
    return [
      {
        id: '1',
        time: '08:00 AM',
        title: 'Morning Shift',
        location: 'Main Building',
        startTime: '08:00',
        endTime: '12:00',
        role: 'Kennel Attendant',
        status: 'SCHEDULED',
      },
      {
        id: '2',
        time: '12:00 PM',
        title: 'Lunch Break',
        location: '',
        startTime: '12:00',
        endTime: '01:00',
        status: 'SCHEDULED',
      },
      {
        id: '3',
        time: '01:00 PM',
        title: 'Afternoon Shift',
        location: 'Main Building',
        startTime: '13:00',
        endTime: '17:00',
        role: 'Kennel Attendant',
        status: 'SCHEDULED',
      },
    ];
  }

  private getMockTasks(): PendingTask[] {
    return [
      {
        id: '1',
        title: 'Opening Checklist',
        completed: 8,
        total: 10,
        type: 'checklist',
        dueDate: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Medication Round',
        completed: 0,
        total: 5,
        type: 'medication',
        dueDate: new Date().toISOString(),
      },
      {
        id: '3',
        title: 'Feeding Schedule',
        completed: 12,
        total: 24,
        type: 'feeding',
        dueDate: new Date().toISOString(),
      },
    ];
  }
}

const mobileService = new MobileService();
export default mobileService;
