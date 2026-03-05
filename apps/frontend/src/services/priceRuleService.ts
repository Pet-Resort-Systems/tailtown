import api from './api';
import { PriceRule, DiscountType } from '../types/priceRule';

// Re-export the types from priceRule.ts
export type { PriceRule, PriceRuleType, DiscountType } from '../types/priceRule';

// Define additional server response types
export type PriceRuleResponse = PriceRule & {
  maxQuantity?: number;
  serviceCategories: Array<{
    id: string;
    serviceCategory: string;
    priceRuleId?: string;
  }>;
  services: Array<{
    id: string;
    serviceId: string;
    service?: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
};

export interface PriceCalculation {
  basePrice: number;
  finalPrice: number;
  discount: number;
  durationInDays: number;
  petCount: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
    discountType: DiscountType;
    discountValue: number;
  }>;
}

export interface PriceCalculationRequest {
  serviceId: string;
  startDate: string;
  endDate: string;
  petCount?: number;
}

const priceRuleService = {
  getAllPriceRules: async (params?: any) => {
    const response = await api.get('/api/price-rules', { params });
    return response.data;
  },

  getPriceRuleById: async (id: string) => {
    const response = await api.get(`/api/price-rules/${id}`);
    return response.data;
  },

  createPriceRule: async (priceRule: Partial<PriceRule>) => {
    const response = await api.post('/api/price-rules', priceRule);
    return response.data;
  },

  updatePriceRule: async (id: string, priceRule: Partial<PriceRule>) => {
    const response = await api.put(`/api/price-rules/${id}`, priceRule);
    return response.data;
  },

  deletePriceRule: async (id: string) => {
    const response = await api.delete(`/api/price-rules/${id}`);
    return response.data;
  },

  calculatePrice: async (request: PriceCalculationRequest) => {
    const response = await api.post('/api/price-rules/calculate', request);
    return response.data;
  }
};

export default priceRuleService;
