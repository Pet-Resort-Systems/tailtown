import api from './api';
import { ENDPOINTS } from '../config/constants';

// Types
export interface InvoiceLineItem {
  id?: string;
  type?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
  serviceId?: string;
  productId?: string;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  customerId: string;
  reservationId?: string;
  issueDate?: Date;
  dueDate: Date;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  notes?: string;
  lineItems: InvoiceLineItem[];
  payments?: Payment[];
}

export interface Payment {
  id?: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'STORE_CREDIT' | 'GIFT_CARD';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  transactionId?: string;
  paymentDate?: Date;
  notes?: string;
}

export interface AccountBalance {
  totalInvoiced: number;
  totalPaid: number;
  accountBalance: number;
  storeCredit: number;
  netBalance: number;
}

// Service methods
export const invoiceService = {
  // Get all invoices for a customer
  getCustomerInvoices: async (customerId: string): Promise<Invoice[]> => {
    try {
      const response = await api.get(`${ENDPOINTS.INVOICES}/customer/${customerId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      throw error;
    }
  },

  // Get invoice by ID
  getInvoiceById: async (id: string): Promise<Invoice> => {
    try {
      const response = await api.get(`${ENDPOINTS.INVOICES}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  },

  // Create a new invoice
  createInvoice: async (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'issueDate'>): Promise<Invoice> => {
    try {
      const response = await api.post(ENDPOINTS.INVOICES, invoiceData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  // Update an invoice
  updateInvoice: async (id: string, invoiceData: Partial<Invoice>): Promise<Invoice> => {
    try {
      const response = await api.patch(`${ENDPOINTS.INVOICES}/${id}`, invoiceData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  // Get customer account balance
  getCustomerAccountBalance: async (customerId: string): Promise<AccountBalance> => {
    try {
      const response = await api.get(`${ENDPOINTS.INVOICES}/balance/${customerId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching customer account balance:', error);
      throw error;
    }
  }
};
