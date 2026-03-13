import { customerApi as api } from "./api";

export type TipType = "GROOMER" | "GENERAL";
export type TipCollectionMethod = "ONLINE" | "TERMINAL" | "CASH";

export interface Tip {
  id: string;
  tenantId: string;
  type: TipType;
  amount: number;
  percentage: number | null;
  collectionMethod: TipCollectionMethod;
  customerId: string;
  reservationId: string | null;
  invoiceId: string | null;
  groomerId: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  groomer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateTipData {
  type: TipType;
  amount: number;
  percentage?: number | null;
  collectionMethod: TipCollectionMethod;
  customerId: string;
  reservationId?: string | null;
  invoiceId?: string | null;
  groomerId?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
}

export interface TipsSummary {
  totalAmount: number;
  tipCount: number;
  averageTip: number;
  byCollectionMethod: Record<string, { count: number; total: number }>;
}

export interface GroomerTipsSummary {
  groomer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  summary: TipsSummary;
  tips: Tip[];
}

export interface GeneralTipPoolSummary {
  summary: TipsSummary & {
    byDay: Record<string, { count: number; total: number }>;
  };
  tips: Tip[];
}

export interface AllGroomersSummary {
  groomers: Array<{
    groomer: {
      id: string;
      firstName: string;
      lastName: string;
    };
    totalTips: number;
    tipCount: number;
  }>;
  totals: {
    grandTotal: number;
    totalTipCount: number;
    groomerCount: number;
  };
}

export const tipService = {
  /**
   * Create a new tip
   */
  createTip: async (data: CreateTipData): Promise<Tip> => {
    const response = await api.post("/api/tips", data);
    return response.data.data;
  },

  /**
   * Create multiple tips at once (e.g., groomer tip + general tip)
   */
  createTips: async (tips: CreateTipData[]): Promise<Tip[]> => {
    const results = await Promise.all(
      tips.map((tip) => tipService.createTip(tip))
    );
    return results;
  },

  /**
   * Get all tips with optional filters
   */
  getTips: async (params?: {
    type?: TipType;
    groomerId?: string;
    customerId?: string;
    reservationId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    tips: Tip[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const response = await api.get("/api/tips", { params });
    return {
      tips: response.data.data,
      total: response.data.total,
      page: response.data.page,
      totalPages: response.data.totalPages,
    };
  },

  /**
   * Get a single tip by ID
   */
  getTipById: async (id: string): Promise<Tip> => {
    const response = await api.get(`/api/tips/${id}`);
    return response.data.data;
  },

  /**
   * Update a tip
   */
  updateTip: async (
    id: string,
    data: Partial<Pick<Tip, "amount" | "percentage" | "notes">>
  ): Promise<Tip> => {
    const response = await api.patch(`/api/tips/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a tip
   */
  deleteTip: async (id: string): Promise<void> => {
    await api.delete(`/api/tips/${id}`);
  },

  /**
   * Get tips summary for a specific groomer
   */
  getGroomerTipsSummary: async (
    groomerId: string,
    params?: { startDate?: string; endDate?: string }
  ): Promise<GroomerTipsSummary> => {
    const response = await api.get(`/api/tips/reports/groomer/${groomerId}`, {
      params,
    });
    return response.data.data;
  },

  /**
   * Get general tip pool summary
   */
  getGeneralTipPoolSummary: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<GeneralTipPoolSummary> => {
    const response = await api.get("/api/tips/reports/pool", { params });
    return response.data.data;
  },

  /**
   * Get all groomers' tips summary
   */
  getAllGroomersTipsSummary: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AllGroomersSummary> => {
    const response = await api.get("/api/tips/reports/all-groomers", {
      params,
    });
    return response.data.data;
  },
};

export default tipService;
