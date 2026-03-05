export enum ServiceCategory {
  DAYCARE = 'DAYCARE',
  BOARDING = 'BOARDING',
  GROOMING = 'GROOMING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER'
}

export interface AddOnService {
  id?: string;
  name: string;
  description?: string;
  price: number;
  taxable?: boolean;
  duration?: number;
  serviceId?: string;
}

export enum DepositType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  serviceCategory: ServiceCategory;
  price: number;
  duration: number;
  taxable?: boolean;
  color?: string;
  requiresStaff: boolean;
  notes?: string;
  isActive: boolean;
  depositRequired?: boolean;
  depositType?: DepositType;
  depositAmount?: number;
  externalId?: string; // Gingr ID for imported services
  createdAt?: string;
  updatedAt?: string;
  availableAddOns?: AddOnService[];
}
