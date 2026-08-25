function normalizeApiBase(url: string) {
  const normalized = url.replace(/\/+$/, '');
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
}

import type {
  CreatePOSTransactionDto,
  CreatePOSTransactionResponse,
  POSCustomerSearchQuery,
  POSMotorcycleSearchQuery,
  POSActiveReservationsQuery,
  ValidatePOSTransactionDto,
  ValidatePOSTransactionResponse,
  QueueOfflineOperationDto,
} from '../../../packages/shared-types/src/pos';

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1');

let authToken: string | null = localStorage.getItem('pos_token');

export interface DesktopUser {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    permissions: Array<{ resource: string; action: string }>;
  };
  branchId?: string | null;
  branch?: { id: string; nameAr: string; nameEn: string } | null;
  lang: 'ar' | 'en';
}

export interface BranchSummary {
  id: string;
  nameAr: string;
  nameEn: string;
  isActive?: boolean;
}

export interface RoleSummary {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
  branch?: BranchSummary | null;
  isActive: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId: string;
  branchId?: string;
}

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem('pos_token', token);
}

export function getToken() { return authToken; }
export function clearToken() { authToken = null; localStorage.removeItem('pos_token'); }
export function setUser(user: DesktopUser) { localStorage.setItem('pos_user', JSON.stringify(user)); }
export function getUser(): DesktopUser | null {
  const stored = localStorage.getItem('pos_user');
  if (!stored) return null;
  try { return JSON.parse(stored) as DesktopUser; } catch { return null; }
}
export function clearUser() { localStorage.removeItem('pos_user'); }

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Session refresh failed');
  const json = await response.json();
  const token = json.data?.accessToken;
  if (!token) throw new Error('Session refresh returned no access token');
  setToken(token);
}

async function apiFetch<T>(path: string, options: RequestInit = {}, canRefresh = true): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const json = await res.json() as Record<string, any>;
  if (res.status === 401 && canRefresh && path !== '/auth/login' && path !== '/auth/refresh') {
    try {
      await refreshAccessToken();
      return apiFetch<T>(path, options, false);
    } catch {
      clearToken();
      window.dispatchEvent(new Event('pos-auth-expired'));
    }
  }
  if (!res.ok) {
    const errorBody = json.error && typeof json.error === 'object' ? json.error : json;
    const err = new Error(errorBody.message ?? 'Request failed') as Error & { code?: string; status?: number; details?: unknown };
    err.code = errorBody.code;
    err.status = res.status;
    err.details = errorBody.details;
    throw err;
  }
  if (Array.isArray(json.data) && json.meta) {
    return { items: json.data, ...json.meta } as T;
  }
  if (Array.isArray(json.items) && json.meta) {
    return { items: json.items, ...json.meta } as T;
  }
  return (Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json) as T;
}

// ─── Auth ────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: DesktopUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<DesktopUser>('/auth/me'),
  logout: () => apiFetch<null>('/auth/logout', { method: 'POST' }),
};

export const branches = {
  list: () => apiFetch<{ items: BranchSummary[]; total: number }>('/branches?isActive=true&limit=100'),
};

export const roles = {
  list: () => apiFetch<RoleSummary[]>('/roles'),
};

export const users = {
  list: () => apiFetch<{ items: UserListItem[]; total: number }>('/users?limit=100'),
  create: (data: CreateUserInput) => apiFetch<UserListItem>('/users', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Types ───────────────────────────────────────────────
export type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: string;
  model: string;
  vin?: string;
  quantity: number;
  unitCost: number | string;
  receivedAt?: string;
  motorcycleId?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier?: { id: string; name: string; phone?: string };
  branchId: string;
  branch?: { nameEn: string; nameAr: string };
  status: PurchaseStatus;
  totalAmount: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
  items: PurchaseItem[];
}

export interface ReceiveItemInput { purchaseItemId: string; vin: string; }

// ─── Purchases API ───────────────────────────────────────
export const purchases = {
  listPending: () =>
    apiFetch<{ items: Purchase[]; total: number }>('/purchases?status=ordered&limit=50')
      .then(async (res) => {
        // Also fetch partially_received
        const partial = await apiFetch<{ items: Purchase[]; total: number }>('/purchases?status=partially_received&limit=50');
        return { items: [...res.items, ...partial.items], total: res.total + partial.total };
      }),
  get: (id: string) => apiFetch<Purchase>(`/purchases/${id}`),
  receive: (id: string, items: ReceiveItemInput[]) =>
    apiFetch<Purchase>(`/purchases/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

// ─── Customers API (POS) ─────────────────────────────────
export interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationalId?: string;
  defaultAddress?: {
    id: string;
    addressLine: string;
    city?: string;
  } | null;
  recentOrderCount?: number;
  activeReservationCount?: number;
  lastTransactionDate?: string;
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationalId?: string;
  notes?: string;
  isActive: boolean;
  addresses: Array<{
    id: string;
    label: string;
    addressLine: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country: string;
    isDefault: boolean;
  }>;
  createdAt: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  nationalId?: string;
  notes?: string;
}

export const customers = {
  search: (params: { q: string; limit?: number }) => {
    const q = new URLSearchParams();
    q.set('q', params.q);
    if (params.limit) q.set('limit', String(params.limit));
    return apiFetch<CustomerSearchResult[]>(`/customers/search?${q}`);
  },
  get: (id: string) => apiFetch<CustomerDetail>(`/customers/${id}`),
  create: (data: CustomerInput) =>
    apiFetch<CustomerDetail>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CustomerInput>) =>
    apiFetch<CustomerDetail>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Motorcycles API (POS) ───────────────────────────────
export interface MotorcycleSearchResult {
  id: string;
  vin: string;
  model: string;
  year: number;
  color?: string;
  price: number;
  status: string;
  brand: { id: string; nameEn: string; nameAr: string };
  branch: { id: string; nameEn: string; nameAr: string };
  images?: string[];
  category?: { nameEn: string; nameAr: string };
}

export const motorcycles = {
  search: (params: { search?: string; branchId?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.branchId) q.set('branchId', params.branchId);
    if (params.status) q.set('status', params.status);
    if (params.limit) q.set('limit', String(params.limit));
    return apiFetch<{ items: MotorcycleSearchResult[]; total: number }>(`/motorcycles?${q}`);
  },
};

// ─── Orders API (POS) ────────────────────────────────────
export type OrderStatus = 'draft' | 'confirmed' | 'processing' | 'awaiting_delivery' | 'completed' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  motorcycleId: string;
  unitPrice: number;
  discount: number;
  motorcycle: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    brand: { nameEn: string; nameAr: string };
    currentStatus: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  branchId: string;
  status: OrderStatus;
  totalAmount: number;
  discount: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string; phone: string };
  branch: { id: string; nameEn: string; nameAr: string };
  status: OrderStatus;
  itemCount: number;
  totalAmount: number;
  discount: number;
  netAmount: number;
  createdAt: string;
}

export interface OrderDetail extends Order {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    defaultAddress?: { addressLine: string; city?: string };
  };
  branch: { id: string; nameEn: string; nameAr: string };
  user: { id: string; name: string };
  items: OrderItem[];
}

export interface CreateOrderInput {
  customerId: string;
  motorcycleIds: string[];
  discount?: number;
  notes?: string;
  isDraft?: boolean;
}

export const orders = {
  list: (params?: { search?: string; customerId?: string; status?: OrderStatus; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.status) q.set('status', params.status);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ items: OrderListItem[]; total: number; page: number; limit: number; totalPages: number }>(`/orders?${q}`);
  },
  get: (id: string) => apiFetch<OrderDetail>(`/orders/${id}`),
  create: (data: CreateOrderInput) =>
    apiFetch<OrderDetail>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  confirm: (id: string) =>
    apiFetch<OrderDetail>(`/orders/${id}/confirm`, { method: 'POST' }),
  getCustomerOrders: (customerId: string, params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ items: OrderListItem[]; total: number }>(`/customers/${customerId}/orders?${q}`);
  },
};

// ─── Reservations API (POS) ──────────────────────────────
export type ReservationStatus = 'active' | 'expired' | 'cancelled' | 'converted';
export type ReservationSource = 'ecommerce' | 'pos';

export interface ReservationListItem {
  id: string;
  reservationNumber: string;
  customer: { id: string; name: string; phone: string };
  motorcycle: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    brand: { nameEn: string; nameAr: string };
  };
  branch: { id: string; nameEn: string; nameAr: string };
  status: ReservationStatus;
  source: ReservationSource;
  totalPrice: number;
  depositAmount: number;
  remainingAmount: number;
  expiresAt?: string;
  daysUntilExpiry?: number;
  createdAt: string;
}

export interface ReservationDetail extends Omit<ReservationListItem, 'customer'> {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    defaultAddress?: {
      addressLine: string;
      city?: string;
    };
  };
  user: { id: string; name: string };
  notes?: string;
  cancelReason?: string;
  convertedOrder?: { id: string; orderNumber: string; status: string };
  pricingSnapshot: {
    basePrice: number;
    vat: number;
    discount: number;
    totalPrice: number;
  };
}

export interface CreateReservationInput {
  customerId: string;
  motorcycleId: string;
  paidAmount: number;
  notes?: string;
}

export const reservations = {
  list: (params?: { search?: string; customerId?: string; status?: ReservationStatus; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ items: ReservationListItem[]; total: number; page: number; limit: number }>(`/reservations?${q}`);
  },
  get: (id: string) => apiFetch<ReservationDetail>(`/reservations/${id}`),
  create: (data: CreateReservationInput) =>
    apiFetch<ReservationDetail>('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  convert: (id: string, notes?: string, idempotencyKey?: string) =>
    apiFetch<{ reservation: ReservationDetail; order: { id: string; orderNumber: string } }>(`/reservations/${id}/convert`, {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify({ notes }),
    }),
  cancel: (id: string, reason: string) =>
    apiFetch<ReservationDetail>(`/reservations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getCustomerReservations: (customerId: string, params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ items: ReservationListItem[]; total: number }>(`/customers/${customerId}/reservations?${q}`);
  },
};

// ─── Payments API (POS) ──────────────────────────────────
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

export interface CreatePaymentInput {
  idempotencyKey: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  cashDetails?: {
    amountReceived: number;
    change: number;
  };
  notes?: string;
}

export interface PaymentResult {
  id: string;
  paymentReference: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  cashAmountReceived?: number;
  cashChange?: number;
  createdAt: string;
}

export const payments = {
  create: (data: CreatePaymentInput) =>
    apiFetch<PaymentResult>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  get: (id: string) => apiFetch<PaymentResult>(`/payments/${id}`),
};

// ─── Invoices API (POS) ──────────────────────────────────
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export interface CreateInvoiceInput {
  customerId: string;
  orderId?: string;
  reservationId?: string;
  branchId?: string;
  totalAmount: number;
  items: Array<{
    motorcycleId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  }>;
  notes?: string;
}

export const invoices = {
  create: (data: CreateInvoiceInput) => apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  issue: (id: string) => apiFetch<Invoice>(`/invoices/${id}/issue`, { method: 'POST' }),
  getByOrder: (orderId: string) => apiFetch<Invoice>(`/invoices?orderId=${orderId}`).then((res: any) => res.items?.[0]),
  get: (id: string) => apiFetch<Invoice>(`/invoices/${id}`),
};

// ─── POS API ─────────────────────────────────────────────

export interface POSDashboard {
  currentUser: {
    id: string;
    name: string;
    role: string;
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    } | null;
    permissions: {
      canApplyDiscount: boolean;
      maxDiscountPercent: number;
      maxDiscountAmount: number;
      canCreateCustomer: boolean;
      canSwitchBranch: boolean;
    };
  };
  todayStats: {
    ordersCreated: number;
    reservationsCreated: number;
    totalSales: number;
    availableMotorcycles: number;
  };
  recentTransactions: Array<{
    id: string;
    type: 'order' | 'reservation';
    number: string;
    customerName: string;
    motorcycleModel: string;
    amount: number;
    createdAt: string;
  }>;
}

export interface POSSyncStatus {
  isOnline: boolean;
  lastSyncAt?: string;
  queuedOperations: number;
  syncInProgress: boolean;
  conflicts: Array<{
    operationId: string;
    type: string;
    reason: string;
    resolution: string;
  }>;
}

export interface POSReservation {
  id: string;
  reservationNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  motorcycle: {
    id: string;
    vin: string;
    model: string;
    brand: string;
  };
  depositAmount: number;
  totalAmount: number;
  remainingAmount: number;
  expiresAt: string;
  expiresInDays: number;
  daysUntilExpiry?: number;
  isExpiringSoon: boolean;
  createdAt: string;
}

export const pos = {
  getDashboard: () => apiFetch<POSDashboard>('/pos/dashboard'),
  
  searchCustomers: (q: string, limit = 10) =>
    apiFetch<CustomerSearchResult[]>(`/pos/customers/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  
  searchMotorcycles: (q?: string, branchId?: string, limit = 20) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (branchId) params.append('branchId', branchId);
    params.append('limit', limit.toString());
    return apiFetch<MotorcycleSearchResult[]>(`/pos/motorcycles/search?${params}`);
  },
  
  validateTransaction: (data: ValidatePOSTransactionDto) =>
    apiFetch<ValidatePOSTransactionResponse>('/pos/validate-transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createTransaction: (data: CreatePOSTransactionDto) =>
    apiFetch<CreatePOSTransactionResponse>('/pos/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getActiveReservations: (branchId?: string, customerId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (customerId) params.append('customerId', customerId);
    return apiFetch<POSReservation[]>(`/pos/reservations/active?${params}`);
  },
  listActiveReservations: (params?: { branchId?: string; customerId?: string; expiringInDays?: number }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.expiringInDays !== undefined) query.set('expiringInDays', String(params.expiringInDays));
    return apiFetch<POSReservation[]>(`/pos/reservations/active?${query}`);
  },
  convertReservation: (id: string, notes?: string, idempotencyKey?: string) =>
    apiFetch<{ reservation: ReservationDetail; order: { id: string; orderNumber: string } }>(`/pos/reservations/${id}/convert`, {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify({ notes }),
    }),
  
  getSyncStatus: () => apiFetch<POSSyncStatus>('/pos/offline/sync-status'),
  
  queueOperation: (data: QueueOfflineOperationDto) =>
    apiFetch('/pos/offline/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getQueuedOperations: () => apiFetch<Array<{ id: string; type: string; data: unknown; status: string; createdAt: string; expiresAt: string }>>('/pos/offline/queue'),
};

// ─── Financing & Installments ────────────────────────────
export type FinancingStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';
export type InstallmentStatus = 'upcoming' | 'due' | 'paid' | 'overdue';
export type InstallmentFrequency = 'monthly' | 'quarterly';

export interface FinancingContractRecord {
  id: string;
  contractNumber: string;
  customerId: string;
  orderId: string;
  totalAmount: number;
  downPayment: number;
  financingAmount: number;
  numberOfInstallments: number;
  installmentFrequency: InstallmentFrequency;
  interestRate: number;
  startDate: string;
  status: FinancingStatus;
  customer?: { id: string; name: string; phone: string };
  order?: { id: string; orderNumber: string };
  installments?: InstallmentRecord[];
}

export interface InstallmentRecord {
  id: string;
  contractId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount?: number;
  status: InstallmentStatus;
  paidAt?: string | null;
  contract?: FinancingContractRecord;
  customer?: { id: string; name: string; phone: string };
  invoice?: { id: string; invoiceNumber: string };
}

export const financing = {
  list: (params?: { page?: number; limit?: number; status?: FinancingStatus; customerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.customerId) q.set('customerId', params.customerId);
    return apiFetch<{ items: FinancingContractRecord[]; total: number; page: number; limit: number; totalPages: number }>(`/financing-contracts?${q}`);
  },
  get: (id: string) => apiFetch<FinancingContractRecord>(`/financing-contracts/${id}`),
  approve: (id: string, notes?: string) => apiFetch<FinancingContractRecord>(`/financing-contracts/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
  updateStatus: (id: string, status: FinancingStatus, notes?: string) => apiFetch<FinancingContractRecord>(`/financing-contracts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
};

export const installments = {
  get: (id: string) => apiFetch<InstallmentRecord>(`/installments/${id}`),
  byContract: (contractId: string) => apiFetch<InstallmentRecord[]>(`/installments/contract/${contractId}`),
  pay: (id: string, data: { amount: number; method: PaymentMethod; reference?: string; idempotencyKey: string; notes?: string }) => apiFetch<PaymentResult>(`/installments/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateStatuses: () => apiFetch<{ updated: number }>('/installments/status-update', { method: 'POST' }),
};

// ─── Reports ─────────────────────────────────────────────
export type ReportPreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';
export interface ReportFilters { preset?: ReportPreset; startDate?: string; endDate?: string; branches?: string; }
const reportQuery = (filters?: ReportFilters) => {
  const q = new URLSearchParams();
  if (filters?.preset) q.set('preset', filters.preset);
  if (filters?.startDate) q.set('startDate', filters.startDate);
  if (filters?.endDate) q.set('endDate', filters.endDate);
  if (filters?.branches) q.set('branches', filters.branches);
  return q;
};

export const reports = {
  executive: (filters?: ReportFilters) => apiFetch<any>(`/reports/dashboard/executive?${reportQuery(filters)}`),
  operational: (filters?: ReportFilters) => apiFetch<any>(`/reports/dashboard/operational?${reportQuery(filters)}`),
  sales: (filters?: ReportFilters) => apiFetch<any>(`/reports/sales/summary?${reportQuery(filters)}`),
  inventory: (filters?: ReportFilters) => apiFetch<any>(`/reports/inventory/current-status?${reportQuery(filters)}`),
  installments: (filters?: ReportFilters) => apiFetch<any>(`/reports/installments/portfolio?${reportQuery(filters)}`),
  overdue: (filters?: ReportFilters) => apiFetch<any>(`/reports/installments/overdue?${reportQuery(filters)}`),
  suppliers: (filters?: ReportFilters) => apiFetch<any>(`/reports/suppliers/performance?${reportQuery(filters)}`),
};

// ─── Notifications ───────────────────────────────────────
export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  status: string;
  priority: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

export const notifications = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.unreadOnly) q.set('unreadOnly', 'true');
    return apiFetch<{ items: NotificationRecord[]; page: number; limit: number; total: number; totalPages: number }>(`/notifications?${q}`);
  },
  unreadCount: () => apiFetch<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => apiFetch<NotificationRecord>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiFetch<unknown>('/notifications/mark-all-read', { method: 'POST' }),
};

// ─── Suppliers ───────────────────────────────────────────
export interface SupplierRecord {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInput { name: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string; isActive?: boolean; }
export const suppliers = {
  list: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    return apiFetch<{ items: SupplierRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(`/suppliers?${q}`);
  },
  get: (id: string) => apiFetch<SupplierRecord>(`/suppliers/${id}`),
  create: (data: SupplierInput) => apiFetch<SupplierRecord>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<SupplierInput>) => apiFetch<SupplierRecord>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' }),
};


// ─── Configuration (SPEC-013 TASK-015) ───────────────────
export const configuration = {
  // Get resolved configuration for current user/branch
  getResolvedConfig: (keys?: string[]) => {
    const q = new URLSearchParams();
    if (keys) keys.forEach(k => q.append('keys', k));
    return apiFetch<Record<string, any>>(`/config/resolved?${q}`);
  },
  
  // Get specific configuration value
  getValue: (key: string) =>
    apiFetch<{
      value: any;
      source: 'system' | 'company' | 'branch';
      lastModified: string;
    }>(`/config/value/${key}`),
  
  // Check feature flag status
  checkFeature: (flagKey: string) =>
    apiFetch<{ flagKey: string; isEnabled: boolean }>(`/config/feature/${flagKey}/status`),
};
