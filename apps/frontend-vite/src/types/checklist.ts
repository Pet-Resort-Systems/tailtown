/**
 * Area-Specific Checklists Types
 * 
 * Dynamic checklist system for:
 * - Kennel check-in/check-out
 * - Grooming services
 * - Training sessions
 * - Daily facility checks
 */

export type ChecklistArea = 
  | 'KENNEL_CHECKIN'
  | 'KENNEL_CHECKOUT'
  | 'GROOMING'
  | 'TRAINING'
  | 'DAILY_FACILITY'
  | 'CUSTOM';

export type ChecklistItemType = 
  | 'CHECKBOX'      // Simple yes/no
  | 'TEXT'          // Text input
  | 'NUMBER'        // Numeric input
  | 'PHOTO'         // Photo upload
  | 'SIGNATURE'     // Digital signature
  | 'RATING'        // 1-5 star rating
  | 'MULTI_SELECT'; // Multiple choice

export type ChecklistStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ChecklistTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  area: ChecklistArea;
  isActive: boolean;
  items: ChecklistTemplateItem[];
  requiredForCompletion: string[]; // IDs of required items
  estimatedMinutes: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChecklistTemplateItem {
  id: string;
  order: number;
  label: string;
  description?: string;
  type: ChecklistItemType;
  isRequired: boolean;
  options?: string[]; // For MULTI_SELECT
  minValue?: number;  // For NUMBER
  maxValue?: number;  // For NUMBER
  placeholder?: string;
}

export interface ChecklistInstance {
  id: string;
  tenantId: string;
  templateId: string;
  template?: ChecklistTemplate;
  
  // Context
  reservationId?: string;
  petId?: string;
  resourceId?: string;
  customerId?: string;
  
  // Assignment
  assignedToStaffId?: string;
  assignedToStaffName?: string;
  
  // Status
  status: ChecklistStatus;
  startedAt?: Date | string;
  completedAt?: Date | string;
  
  // Data
  items: ChecklistInstanceItem[];
  notes?: string;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChecklistInstanceItem {
  templateItemId: string;
  label: string;
  description?: string;
  type: ChecklistItemType;
  isRequired: boolean;
  
  // Completion
  isCompleted: boolean;
  completedAt?: Date | string;
  
  // Values based on type
  checkboxValue?: boolean;
  textValue?: string;
  numberValue?: number;
  photoUrls?: string[];
  signatureUrl?: string;
  ratingValue?: number; // 1-5
  multiSelectValues?: string[];
  
  notes?: string;
}

export interface CreateChecklistTemplateRequest {
  name: string;
  description: string;
  area: ChecklistArea;
  items: Omit<ChecklistTemplateItem, 'id'>[];
  estimatedMinutes: number;
}

export interface StartChecklistRequest {
  templateId: string;
  reservationId?: string;
  petId?: string;
  resourceId?: string;
  customerId?: string;
  assignedToStaffId?: string;
}

export interface UpdateChecklistItemRequest {
  templateItemId: string;
  checkboxValue?: boolean;
  textValue?: string;
  numberValue?: number;
  photoUrls?: string[];
  signatureUrl?: string;
  ratingValue?: number;
  multiSelectValues?: string[];
  notes?: string;
}

export interface ChecklistStats {
  totalCompleted: number;
  totalPending: number;
  totalInProgress: number;
  averageCompletionTime: number; // minutes
  completionRate: number; // percentage
  byArea: {
    [key in ChecklistArea]?: {
      completed: number;
      pending: number;
      averageTime: number;
    };
  };
}

// Default templates
export const DEFAULT_KENNEL_CHECKIN_ITEMS: Omit<ChecklistTemplateItem, 'id'>[] = [
  { order: 1, label: 'Verify pet identification', type: 'CHECKBOX', isRequired: true },
  { order: 2, label: 'Check vaccination records', type: 'CHECKBOX', isRequired: true },
  { order: 3, label: 'Inspect pet for injuries/health issues', type: 'CHECKBOX', isRequired: true },
  { order: 4, label: 'Take arrival photo', type: 'PHOTO', isRequired: true },
  { order: 5, label: 'Record pet weight (lbs)', type: 'NUMBER', isRequired: false, minValue: 0, maxValue: 300 },
  { order: 6, label: 'Note special instructions', type: 'TEXT', isRequired: false },
  { order: 7, label: 'Verify emergency contact', type: 'CHECKBOX', isRequired: true },
  { order: 8, label: 'Assign kennel/suite', type: 'TEXT', isRequired: true },
  { order: 9, label: 'Customer signature', type: 'SIGNATURE', isRequired: true }
];

export const DEFAULT_KENNEL_CHECKOUT_ITEMS: Omit<ChecklistTemplateItem, 'id'>[] = [
  { order: 1, label: 'Final health check', type: 'CHECKBOX', isRequired: true },
  { order: 2, label: 'Take departure photo', type: 'PHOTO', isRequired: true },
  { order: 3, label: 'Record pet weight (lbs)', type: 'NUMBER', isRequired: false, minValue: 0, maxValue: 300 },
  { order: 4, label: 'Clean and inspect kennel', type: 'CHECKBOX', isRequired: true },
  { order: 5, label: 'Return personal items', type: 'CHECKBOX', isRequired: true },
  { order: 6, label: 'Rate pet behavior (1-5)', type: 'RATING', isRequired: false },
  { order: 7, label: 'Staff notes for owner', type: 'TEXT', isRequired: false },
  { order: 8, label: 'Customer signature', type: 'SIGNATURE', isRequired: true }
];

export const DEFAULT_GROOMING_ITEMS: Omit<ChecklistTemplateItem, 'id'>[] = [
  { order: 1, label: 'Pre-groom health check', type: 'CHECKBOX', isRequired: true },
  { order: 2, label: 'Take before photo', type: 'PHOTO', isRequired: true },
  { order: 3, label: 'Bath completed', type: 'CHECKBOX', isRequired: true },
  { order: 4, label: 'Nail trim completed', type: 'CHECKBOX', isRequired: false },
  { order: 5, label: 'Ear cleaning completed', type: 'CHECKBOX', isRequired: false },
  { order: 6, label: 'Haircut/styling completed', type: 'CHECKBOX', isRequired: false },
  { order: 7, label: 'Teeth brushing completed', type: 'CHECKBOX', isRequired: false },
  { order: 8, label: 'Take after photo', type: 'PHOTO', isRequired: true },
  { order: 9, label: 'Note any issues found', type: 'TEXT', isRequired: false }
];

export const DEFAULT_DAILY_FACILITY_ITEMS: Omit<ChecklistTemplateItem, 'id'>[] = [
  { order: 1, label: 'Check all kennels for cleanliness', type: 'CHECKBOX', isRequired: true },
  { order: 2, label: 'Verify water bowls filled', type: 'CHECKBOX', isRequired: true },
  { order: 3, label: 'Check HVAC temperature', type: 'NUMBER', isRequired: true, minValue: 60, maxValue: 80 },
  { order: 4, label: 'Inspect play areas', type: 'CHECKBOX', isRequired: true },
  { order: 5, label: 'Check security cameras', type: 'CHECKBOX', isRequired: true },
  { order: 6, label: 'Verify emergency exits clear', type: 'CHECKBOX', isRequired: true },
  { order: 7, label: 'Restock supplies', type: 'MULTI_SELECT', isRequired: false, 
    options: ['Food', 'Treats', 'Cleaning supplies', 'Towels', 'Toys'] },
  { order: 8, label: 'Note any maintenance issues', type: 'TEXT', isRequired: false }
];
