export type PriceRuleType = 'DAY_OF_WEEK' | 'MULTI_DAY' | 'MULTI_PET' | 'SEASONAL' | 'PROMOTIONAL' | 'CUSTOM';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PriceAdjustmentType = 'DISCOUNT' | 'SURCHARGE';

export interface PriceRuleServiceCategory {
  id: string;
  priceRuleId: string;
  serviceCategory: string;
}

export interface PriceRuleService {
  id: string;
  priceRuleId: string;
  serviceId: string;
  service?: {
    id: string;
    name: string;
  };
}

export interface PriceRule {
  id: string;
  name: string;
  description: string;
  ruleType: PriceRuleType;
  adjustmentType: PriceAdjustmentType;
  discountType: DiscountType;
  discountValue: number;
  startDate?: string | null;
  endDate?: string | null;
  daysOfWeek?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  isActive: boolean;
  priority: number;
  serviceCategories?: PriceRuleServiceCategory[];
  services?: PriceRuleService[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceCalculationRequest {
  serviceId: string;
  startDate: string;
  endDate: string;
  petCount: number;
}

export interface PriceCalculationResponse {
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  discountPercentage: number;
  appliedRules: PriceRule[];
}
