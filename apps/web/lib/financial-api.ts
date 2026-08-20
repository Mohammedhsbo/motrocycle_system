import { apiClient } from './api-client';

// ─────────────────────────────────────────────────────────
// Financial Types
// ─────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overpaid' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId?: string;
  reservationId?: string;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  items: InvoiceItem[];
}

export interface Payment {
  id: string;
  paymentReference: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  confirmedAt?: string;
  createdAt: string;
  invoice?: {
    invoiceNumber: string;
    totalAmount: number;
  };
}

export interface FinancialSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalRefunded: number;
  outstandingBalance: number;
  invoiceCount: number;
  paymentCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────
// Financial API
// ─────────────────────────────────────────────────────────

export const financialApi = {
  // Get customer's invoices
  getInvoices: (params?: { status?: InvoiceStatus; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return apiClient.get<PaginatedResult<Invoice>>(`/customers/me/invoices${queryString ? `?${queryString}` : ''}`);
  },

  // Get specific invoice
  getInvoice: (id: string) => {
    return apiClient.get<Invoice>(`/invoices/${id}`);
  },

  // Get customer's payments
  getPayments: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return apiClient.get<PaginatedResult<Payment>>(`/customers/me/payments${queryString ? `?${queryString}` : ''}`);
  },

  // Get specific payment
  getPayment: (id: string) => {
    return apiClient.get<Payment>(`/payments/${id}`);
  },

  // Get financial summary
  getSummary: () => {
    return apiClient.get<FinancialSummary>('/customers/me/financial-summary');
  },
};
