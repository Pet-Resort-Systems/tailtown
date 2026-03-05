/**
 * Advanced Scheduling Types
 * Types for groomer appointments and training classes
 */

// ============================================
// GROOMER SCHEDULING TYPES
// ============================================

export interface GroomerAppointment {
  id: string;
  tenantId: string;
  reservationId: string;
  groomerId: string;
  serviceId: string;
  petId: string;
  customerId: string;
  scheduledDate: Date | string;
  scheduledTime: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  actualStartTime?: Date | string;
  actualEndTime?: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Relations (when included)
  groomer?: {
    id: string;
    firstName: string;
    lastName: string;
    specialties: string[];
  };
  service?: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  pet?: {
    id: string;
    name: string;
    type: string;
    breed?: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
  };
}

export interface GroomerPreference {
  id: string;
  tenantId: string;
  customerId: string;
  groomerId: string;
  petId?: string;
  priority: number; // 1=preferred, 2=acceptable, 3=avoid
  notes?: string;
  createdAt: Date | string;
}

export interface GroomerBreak {
  id: string;
  tenantId: string;
  groomerId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  type: 'LUNCH' | 'BREAK' | 'PERSONAL';
  notes?: string;
  createdAt: Date | string;
}

export interface AvailableGroomer {
  id: string;
  firstName: string;
  lastName: string;
  specialties: string[];
  groomingSkills?: any;
  maxAppointmentsPerDay?: number;
  averageServiceTime?: number;
}

// ============================================
// TRAINING CLASS TYPES
// ============================================

export interface TrainingClass {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  category: 'PUPPY' | 'OBEDIENCE' | 'AGILITY' | 'BEHAVIOR';
  instructorId: string;
  maxCapacity: number;
  currentEnrolled: number;
  
  // Schedule
  startDate: Date | string;
  endDate: Date | string;
  totalWeeks: number;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  startTime: string;
  endTime: string;
  duration: number;
  
  // Pricing
  pricePerSeries: number;
  pricePerSession?: number;
  depositRequired?: number;
  
  // Status
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isActive: boolean;
  
  // Requirements
  minAge?: number;
  maxAge?: number;
  prerequisites: string[];
  
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Relations (when included)
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
    specialties: string[];
  };
  sessions?: ClassSession[];
  enrollments?: ClassEnrollment[];
  waitlist?: ClassWaitlist[];
  _count?: {
    enrollments: number;
    sessions: number;
    waitlist: number;
  };
}

export interface ClassSession {
  id: string;
  tenantId: string;
  classId: string;
  sessionNumber: number;
  scheduledDate: Date | string;
  scheduledTime: string;
  duration: number;
  
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  actualStartTime?: Date | string;
  actualEndTime?: Date | string;
  
  topic?: string;
  objectives: string[];
  materials: string[];
  homework?: string;
  
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Relations
  class?: TrainingClass;
  attendance?: SessionAttendance[];
  _count?: {
    attendance: number;
  };
}

export interface ClassEnrollment {
  id: string;
  tenantId: string;
  classId: string;
  petId: string;
  customerId: string;
  
  enrollmentDate: Date | string;
  status: 'ENROLLED' | 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'WAITLIST';
  
  amountPaid: number;
  amountDue: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  
  sessionsAttended: number;
  totalSessions: number;
  completionRate: number;
  
  certificateIssued: boolean;
  certificateDate?: Date | string;
  
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Relations
  class?: TrainingClass;
  pet?: {
    id: string;
    name: string;
    type: string;
    breed?: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
  };
  attendance?: SessionAttendance[];
}

export interface SessionAttendance {
  id: string;
  tenantId: string;
  sessionId: string;
  enrollmentId: string;
  petId: string;
  
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  arrivalTime?: Date | string;
  departureTime?: Date | string;
  
  participationLevel?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  behaviorRating?: number; // 1-5
  progressNotes?: string;
  
  homeworkCompleted: boolean;
  homeworkNotes?: string;
  
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Relations
  session?: ClassSession;
  enrollment?: ClassEnrollment;
  pet?: {
    id: string;
    name: string;
  };
}

export interface ClassWaitlist {
  id: string;
  tenantId: string;
  classId: string;
  petId: string;
  customerId: string;
  position: number;
  addedDate: Date | string;
  notified: boolean;
  notifiedDate?: Date | string;
  status: 'WAITING' | 'ENROLLED' | 'EXPIRED';
  
  // Relations
  class?: TrainingClass;
  pet?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
  };
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateGroomerAppointmentRequest {
  reservationId?: string;
  groomerId: string;
  serviceId: string;
  petId: string;
  customerId: string;
  scheduledDate: Date | string;
  scheduledTime: string;
  duration?: number;
  notes?: string;
}

export interface UpdateGroomerAppointmentRequest {
  scheduledDate?: Date | string;
  scheduledTime?: string;
  duration?: number;
  status?: string;
  notes?: string;
}

export interface ReassignGroomerRequest {
  newGroomerId: string;
  reason?: string;
}

export interface CreateTrainingClassRequest {
  name: string;
  description?: string;
  level: string;
  category: string;
  instructorId: string;
  maxCapacity: number;
  startDate: Date | string;
  endDate?: Date | string;
  totalWeeks: number;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  duration?: number;
  pricePerSeries: number;
  pricePerSession?: number;
  depositRequired?: number;
  minAge?: number;
  maxAge?: number;
  prerequisites?: string[];
  notes?: string;
}

export interface EnrollInClassRequest {
  petId: string;
  customerId: string;
  amountPaid?: number;
}

export interface MarkAttendanceRequest {
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  arrivalTime?: Date | string;
  departureTime?: Date | string;
  participationLevel?: string;
  behaviorRating?: number;
  progressNotes?: string;
  homeworkCompleted?: boolean;
  homeworkNotes?: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface GroomerAppointmentFilters {
  groomerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface TrainingClassFilters {
  status?: string;
  category?: string;
  level?: string;
  instructorId?: string;
  isActive?: boolean;
}

export interface AvailableGroomersQuery {
  date: string;
  time: string;
  duration?: number;
  serviceId?: string;
}
