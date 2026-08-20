const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

let authToken: string | null = localStorage.getItem('admin_token');

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem('admin_token', token);
}

export function getToken() {
  return authToken;
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem('admin_token');
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }

  const json = await response.json() as { data?: { accessToken?: string } };
  const token = json.data?.accessToken;
  if (!token) {
    throw new Error('Session refresh returned no access token');
  }

  setToken(token);
}

async function apiFetch<T>(path: string, options: RequestInit = {}, canRefresh = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const json = await res.json();

  if (res.status === 401 && canRefresh && path !== '/auth/login' && path !== '/auth/refresh') {
    try {
      await refreshAccessToken();
      return apiFetch<T>(path, options, false);
    } catch {
      clearToken();
    }
  }

  if (!res.ok) {
    const err = new Error(json.message ?? 'Request failed') as Error & { code?: string; status?: number };
    err.code = json.code;
    err.status = res.status;
    throw err;
  }

  return json.data;
}

// ─────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    apiFetch<null>('/auth/logout', { method: 'POST' }),
};

// ─────────────────────────────────────────────────────────
// Suppliers
// ─────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  branchId?: string;
  createdAt: string;
}

export interface SupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const suppliers = {
  list: (params?: { search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<Supplier>>(`/suppliers?${q}`);
  },
  get: (id: string) => apiFetch<Supplier>(`/suppliers/${id}`),
  create: (data: SupplierInput) =>
    apiFetch<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<SupplierInput>) =>
    apiFetch<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<null>(`/suppliers/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationalId?: string; // Masked in list views
  isActive: boolean;
  orderCount?: number;
  lastOrderDate?: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  notes?: string;
  addresses: Address[];
  stats?: CustomerStats;
}

export interface Address {
  id: string;
  label: string;
  addressLine: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  notes?: string;
  createdAt: string;
}

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  activeReservations: number;
  activeInstallmentPlans: number;
}

export interface CustomerSummary {
  customerId: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  totalPaid: number;
  outstandingBalance: number;
  activeReservations: number;
  expiredReservations: number;
  activeInstallmentPlans: number;
  overdueInstallments: number;
  lastOrderDate?: string;
  lastPaymentDate?: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  nationalId?: string;
  notes?: string;
}

export const customers = {
  list: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    hasEmail?: boolean;
    hasNationalId?: boolean;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    sort?: 'name' | 'createdAt';
    order?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.hasEmail !== undefined) q.set('hasEmail', String(params.hasEmail));
    if (params?.hasNationalId !== undefined) q.set('hasNationalId', String(params.hasNationalId));
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    return apiFetch<PaginatedResult<Customer>>(`/customers?${q}`);
  },
  search: (params: { q: string; limit?: number }) => {
    const q = new URLSearchParams();
    q.set('q', params.q);
    if (params.limit) q.set('limit', String(params.limit));
    return apiFetch<{ id: string; name: string; phone: string; email?: string; nationalId?: string; defaultAddress?: { id: string; addressLine: string; city?: string } }[]>(`/customers/search?${q}`);
  },
  get: (id: string) => apiFetch<CustomerDetail>(`/customers/${id}`),
  getSummary: (id: string) => apiFetch<CustomerSummary>(`/customers/${id}/summary`),
  create: (data: CustomerInput) =>
    apiFetch<CustomerDetail>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CustomerInput>) =>
    apiFetch<CustomerDetail>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string, reason: string) =>
    apiFetch<null>(`/customers/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivate: (id: string) =>
    apiFetch<null>(`/customers/${id}/reactivate`, { method: 'POST' }),
  getInvoices: (id: string, params?: { status?: InvoiceStatus; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<InvoiceListItem>>(`/customers/${id}/invoices?${q}`);
  },
  getPayments: (id: string, params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<PaymentListItem>>(`/customers/${id}/payments?${q}`);
  },
  getFinancialSummary: (id: string) =>
    apiFetch<CustomerFinancialSummary>(`/customers/${id}/financial-summary`),
};

// ─────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────
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

export interface OrderHistoryEntry {
  id: string;
  action: string;
  before?: { status?: OrderStatus };
  after: { status: OrderStatus };
  user: { id: string; name: string };
  reason?: string;
  createdAt: string;
}

export const orders = {
  list: (params?: {
    search?: string;
    status?: OrderStatus;
    branchId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'netAmount' | 'orderNumber';
    order?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    return apiFetch<PaginatedResult<OrderListItem>>(`/orders?${q}`);
  },
  get: (id: string) => apiFetch<OrderDetail>(`/orders/${id}`),
  getHistory: (id: string) => apiFetch<OrderHistoryEntry[]>(`/orders/${id}/history`),
  changeStatus: (id: string, status: OrderStatus, reason?: string) =>
    apiFetch<OrderDetail>(`/orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    }),
  cancel: (id: string, reason?: string) =>
    apiFetch<OrderDetail>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ─────────────────────────────────────────────────────────
// Purchases
// ─────────────────────────────────────────────────────────
export type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: string;
  model: string;
  vin?: string;
  quantity: number;
  unitCost: number;
  receivedAt?: string;
  motorcycleId?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier?: { name: string };
  branchId: string;
  status: PurchaseStatus;
  totalAmount: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
  items: PurchaseItem[];
}

export interface PurchaseCreateInput {
  supplierId: string;
  items: { model: string; quantity: number; unitCost: number; vin?: string }[];
  notes?: string;
}

export interface ReceiveItemInput {
  purchaseItemId: string;
  vin: string;
}

export const purchases = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<Purchase>>(`/purchases?${q}`);
  },
  get: (id: string) => apiFetch<Purchase>(`/purchases/${id}`),
  create: (data: PurchaseCreateInput) =>
    apiFetch<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PurchaseCreateInput>) =>
    apiFetch<Purchase>(`/purchases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  order: (id: string) =>
    apiFetch<Purchase>(`/purchases/${id}/order`, { method: 'POST' }),
  cancel: (id: string) =>
    apiFetch<Purchase>(`/purchases/${id}/cancel`, { method: 'POST' }),
  receive: (id: string, items: ReceiveItemInput[]) =>
    apiFetch<Purchase>(`/purchases/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

// ─────────────────────────────────────────────────────────
// Invoices & Payments
// ─────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overpaid' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque';
export type RefundStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface InvoiceItem {
  id: string;
  motorcycleId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  motorcycle?: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    brand: { nameEn: string; nameAr: string };
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId?: string;
  reservationId?: string;
  branchId: string;
  userId: string;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListItem extends Invoice {
  customer: { id: string; name: string; phone: string };
  branch: { id: string; nameEn: string; nameAr: string };
  user: { id: string; name: string };
  itemCount: number;
}

export interface InvoiceDetail extends Invoice {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  branch: { id: string; nameEn: string; nameAr: string };
  user: { id: string; name: string };
  items: InvoiceItem[];
  payments?: Payment[];
  order?: { id: string; orderNumber: string; status: string };
  reservation?: { id: string; reservationNumber: string; status: string };
}

export interface Payment {
  id: string;
  paymentReference: string;
  invoiceId: string;
  customerId: string;
  branchId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  externalTransactionId?: string;
  providerId?: string;
  idempotencyKey: string;
  cashAmountReceived?: number;
  cashChange?: number;
  confirmedAt?: string;
  failedAt?: string;
  failureReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListItem extends Payment {
  customer: { id: string; name: string; phone: string };
  branch: { id: string; nameEn: string; nameAr: string };
  user: { id: string; name: string };
  invoice: { id: string; invoiceNumber: string; totalAmount: number };
}

export interface PaymentDetail extends Payment {
  customer: { id: string; name: string; phone: string; email?: string };
  branch: { id: string; nameEn: string; nameAr: string };
  user: { id: string; name: string };
  invoice: InvoiceListItem;
  allocations?: PaymentAllocation[];
  refunds?: Refund[];
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  createdAt: string;
}

export interface Refund {
  id: string;
  refundReference: string;
  paymentId: string;
  amount: number;
  reason: string;
  method: PaymentMethod;
  status: string;
  processedBy: string;
  processedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundListItem extends Refund {
  payment: {
    id: string;
    paymentReference: string;
    amount: number;
    customer: { id: string; name: string; phone: string };
    invoice: { id: string; invoiceNumber: string };
  };
  processedByUser: { id: string; name: string };
}

export interface RefundDetail extends Refund {
  payment: PaymentDetail;
  processedByUser: { id: string; name: string };
}

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

export interface CreateRefundInput {
  paymentId: string;
  amount: number;
  reason: string;
  method: PaymentMethod;
  notes?: string;
}

export interface CustomerFinancialSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalRefunded: number;
  outstandingBalance: number;
  invoiceCount: number;
  paymentCount: number;
}

export const invoices = {
  list: (params?: {
    search?: string;
    status?: InvoiceStatus;
    customerId?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'totalAmount' | 'invoiceNumber';
    order?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    return apiFetch<PaginatedResult<InvoiceListItem>>(`/invoices?${q}`);
  },
  get: (id: string) => apiFetch<InvoiceDetail>(`/invoices/${id}`),
  issue: (id: string) =>
    apiFetch<InvoiceDetail>(`/invoices/${id}/issue`, { method: 'POST' }),
  cancel: (id: string, reason?: string) =>
    apiFetch<InvoiceDetail>(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const payments = {
  list: (params?: {
    search?: string;
    status?: PaymentStatus;
    method?: PaymentMethod;
    customerId?: string;
    invoiceId?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'amount' | 'paymentReference';
    order?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.method) q.set('method', params.method);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.invoiceId) q.set('invoiceId', params.invoiceId);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    return apiFetch<PaginatedResult<PaymentListItem>>(`/payments?${q}`);
  },
  get: (id: string) => apiFetch<PaymentDetail>(`/payments/${id}`),
  create: (data: CreatePaymentInput) =>
    apiFetch<PaymentDetail>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirm: (id: string, externalTransactionId?: string, notes?: string) =>
    apiFetch<PaymentDetail>(`/payments/${id}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify({ externalTransactionId, notes }),
    }),
  cancel: (id: string, reason: string) =>
    apiFetch<PaymentDetail>(`/payments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};

export const refunds = {
  list: (params?: {
    search?: string;
    paymentId?: string;
    customerId?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.paymentId) q.set('paymentId', params.paymentId);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<RefundListItem>>(`/refunds?${q}`);
  },
  get: (id: string) => apiFetch<RefundDetail>(`/refunds/${id}`),
  create: (data: CreateRefundInput) =>
    apiFetch<RefundDetail>('/refunds', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─────────────────────────────────────────────────────────
// Reservations
// ─────────────────────────────────────────────────────────
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
  statusHistory?: ReservationHistoryEntry[];
}

export interface ReservationHistoryEntry {
  id: string;
  action: string;
  before?: { status?: ReservationStatus; expiresAt?: string };
  after: { status?: ReservationStatus; expiresAt?: string };
  user: { id: string; name: string };
  reason?: string;
  createdAt: string;
}

export const reservations = {
  list: (params?: {
    search?: string;
    status?: ReservationStatus;
    branchId?: string;
    customerId?: string;
    expiringSoon?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'expiresAt' | 'reservationNumber';
    order?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.expiringSoon !== undefined) q.set('expiringSoon', String(params.expiringSoon));
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    return apiFetch<PaginatedResult<ReservationListItem>>(`/reservations?${q}`);
  },
  get: (id: string) => apiFetch<ReservationDetail>(`/reservations/${id}`),
  getHistory: (id: string) => apiFetch<ReservationHistoryEntry[]>(`/reservations/${id}/history`),
  extend: (id: string, expiresAt: string, reason?: string) =>
    apiFetch<ReservationDetail>(`/reservations/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ expiresAt, reason }),
    }),
  cancel: (id: string, reason: string) =>
    apiFetch<ReservationDetail>(`/reservations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  convert: (id: string, notes?: string) =>
    apiFetch<{ reservation: ReservationDetail; order: { id: string; orderNumber: string } }>(`/reservations/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
};

// ─────────────────────────────────────────────────────────
// Financing Contracts (TASK-012, TASK-013)
// ─────────────────────────────────────────────────────────
export type FinancingContractStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';
export type InstallmentStatus = 'upcoming' | 'due' | 'paid' | 'overdue';
export type InstallmentFrequency = 'monthly' | 'quarterly';

export interface FinancingContractListItem {
  id: string;
  contractNumber: string;
  customer: { id: string; name: string; phone: string };
  order: { id: string; orderNumber: string; status: string };
  branch: { id: string; nameEn: string; nameAr: string };
  totalAmount: number;
  downPayment: number;
  financingAmount: number;
  numberOfInstallments: number;
  interestRate: number;
  startDate: string;
  status: FinancingContractStatus;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

export interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
  paidAt?: string;
}

export interface FinancingContractDetail extends FinancingContractListItem {
  creator: { id: string; name: string };
  approver?: { id: string; name: string };
  installments: Installment[];
  notes?: string;
}

export interface CreateFinancingContractInput {
  orderId: string;
  customerId: string;
  totalAmount: number;
  downPayment: number;
  numberOfInstallments: number;
  interestRate?: number;
  startDate: string;
  installmentFrequency?: InstallmentFrequency;
}

export interface InstallmentPaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  idempotencyKey: string;
  notes?: string;
}

export interface FinancingSummary {
  activeContracts: number;
  totalFinanced: number;
  totalPaid: number;
  totalRemaining: number;
  nextInstallment: {
    id: string;
    dueDate: string;
    amount: number;
    contractId: string;
  } | null;
  overdueInstallments: number;
  overdueAmount: number;
}

export interface SettlementInput {
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export const financingContracts = {
  list: (params?: {
    search?: string;
    status?: FinancingContractStatus;
    customerId?: string;
    branchId?: string;
    contractNumber?: string;
    startDateFrom?: string;
    startDateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.contractNumber) q.set('contractNumber', params.contractNumber);
    if (params?.startDateFrom) q.set('startDateFrom', params.startDateFrom);
    if (params?.startDateTo) q.set('startDateTo', params.startDateTo);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: FinancingContractListItem[]; total: number; page: number; limit: number }>(`/financing-contracts?${q}`);
  },
  get: (id: string) => apiFetch<FinancingContractDetail>(`/financing-contracts/${id}`),
  create: (data: CreateFinancingContractInput) =>
    apiFetch<FinancingContractDetail>('/financing-contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approve: (id: string, notes?: string) =>
    apiFetch<FinancingContractDetail>(`/financing-contracts/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
  updateStatus: (id: string, status: FinancingContractStatus, notes?: string) =>
    apiFetch<FinancingContractDetail>(`/financing-contracts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
  settle: (id: string, data: SettlementInput) =>
    apiFetch<{
      contract: FinancingContractDetail;
      payment: { id: string; amount: number; method: string; reference?: string; receivedAt: string };
      settledAmount: number;
      settledInstallments: number;
    }>(`/financing-contracts/${id}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const installments = {
  get: (id: string) =>
    apiFetch<Installment & { contract: FinancingContractListItem }>(`/installments/${id}`),
  listByContract: (contractId: string) =>
    apiFetch<Installment[]>(`/financing-contracts/${contractId}/installments`),
  createPayment: (installmentId: string, data: InstallmentPaymentInput) =>
    apiFetch<Payment>(`/installments/${installmentId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatuses: () =>
    apiFetch<{ updated: number }>('/installments/status-update', {
      method: 'POST',
    }),
};

export const customerFinancing = {
  getSummary: (customerId: string) =>
    apiFetch<FinancingSummary>(`/customers/${customerId}/financing-summary`),
  getContracts: (customerId: string, params?: {
    status?: FinancingContractStatus;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<FinancingContractListItem>>(`/customers/${customerId}/financing-contracts?${q}`);
  },
  getInstallments: (customerId: string, params?: {
    status?: InstallmentStatus;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<PaginatedResult<Installment & { contract: { id: string; contractNumber: string } }>>(`/customers/${customerId}/installments?${q}`);
  },
};

// ─────────────────────────────────────────────────────────
// Letters (SPEC-010)
// ─────────────────────────────────────────────────────────
export type LetterStatus = 'draft' | 'issued' | 'sent' | 'received' | 'not_received' | 'cancelled';
export type LetterType = 'receipt_acknowledgment' | 'delivery_notice' | 'payment_reminder' | 'contract_expiry' | 'general';

export interface LetterListItem {
  id: string;
  letterNumber: string;
  type: LetterType;
  status: LetterStatus;
  customer: { id: string; name: string; phone: string };
  order?: { id: string; orderNumber: string; status: string };
  financingContract?: { id: string; contractNumber: string; status: string };
  branch: { id: string; nameEn: string; nameAr: string };
  subject: string;
  issueDate?: string;
  sentDate?: string;
  receivedDate?: string;
  expiryDate?: string;
  createdAt: string;
}

export interface LetterDetail extends LetterListItem {
  creator: { id: string; name: string };
  issuer?: { id: string; name: string };
  receiver?: { id: string; name: string };
  content: string;
  notes?: string;
  documents: LetterDocument[];
}

export interface LetterDocument {
  id: string;
  name: string;
  language: 'en' | 'ar';
  url: string;
  generatedAt: string;
}

export interface CreateLetterInput {
  type: LetterType;
  customerId: string;
  orderId?: string;
  financingContractId?: string;
  subject: string;
  content: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface LetterHistoryEntry {
  id: string;
  action: string;
  before?: { status?: LetterStatus };
  after: { status?: LetterStatus };
  user: { id: string; name: string };
  reason?: string;
  createdAt: string;
}

export const letters = {
  list: (params?: {
    search?: string;
    type?: LetterType;
    status?: LetterStatus;
    customerId?: string;
    orderId?: string;
    financingContractId?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'letterNumber' | 'issueDate';
    order?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.orderId) q.set('orderId', params.orderId);
    if (params?.financingContractId) q.set('financingContractId', params.financingContractId);
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    return apiFetch<PaginatedResult<LetterListItem>>(`/letters?${q}`);
  },
  get: (id: string) => apiFetch<LetterDetail>(`/letters/${id}`),
  create: (data: CreateLetterInput) =>
    apiFetch<LetterDetail>('/letters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CreateLetterInput>) =>
    apiFetch<LetterDetail>(`/letters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  issue: (id: string, notes?: string) =>
    apiFetch<LetterDetail>(`/letters/${id}/issue`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  send: (id: string, notes?: string) =>
    apiFetch<LetterDetail>(`/letters/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  confirmReceipt: (id: string, receivedBy?: string, notes?: string) =>
    apiFetch<LetterDetail>(`/letters/${id}/confirm-receipt`, {
      method: 'POST',
      body: JSON.stringify({ receivedBy, notes }),
    }),
  markNotReceived: (id: string, reason: string) =>
    apiFetch<LetterDetail>(`/letters/${id}/not-received`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  cancel: (id: string, reason: string) =>
    apiFetch<LetterDetail>(`/letters/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getHistory: (id: string) => apiFetch<LetterHistoryEntry[]>(`/letters/${id}/history`),
  generateDocument: (id: string, language: 'en' | 'ar') =>
    apiFetch<{ url: string }>(`/letters/${id}/documents/generate`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),
};

// ─────────────────────────────────────────────────────────
// Reports (SPEC-011)
// ─────────────────────────────────────────────────────────
export interface ExecutiveDashboard {
  sales: {
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    growth: number;
    topMotorcycles: Array<{ model: string; brand: string; count: number; revenue: number }>;
  };
  revenue: {
    grossRevenue: number;
    collectedAmount: number;
    outstandingAmount: number;
    refundAmount: number;
    netRevenue: number;
  };
  inventory: {
    totalMotorcycles: number;
    available: number;
    reserved: number;
    sold: number;
    inTransit: number;
    inventoryValue: number;
  };
  customers: {
    totalActive: number;
    newCustomers: number;
    withActiveOrders: number;
    withOutstandingBalance: number;
    retentionRate: number;
  };
  financing: {
    activeContracts: number;
    totalFinanced: number;
    collectedAmount: number;
    outstandingBalance: number;
    overdueCount: number;
    collectionRate: number;
  };
  period: { start: string; end: string };
  branches: string[];
}

export interface SalesSummary {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  cancelledCount: number;
  refundedCount: number;
  byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  byBranch: Array<{ branchId: string; branchName: string; amount: number; count: number }>;
  trends: Array<{ period: string; amount: number; count: number }>;
}

export interface AgingReport {
  total: number;
  buckets: Array<{
    label: string;
    days: string;
    amount: number;
    count: number;
    customers: Array<{
      customerId: string;
      customerName: string;
      amount: number;
      oldestInvoiceDate: string;
    }>;
  }>;
}

export interface InventoryStatus {
  total: number;
  byStatus: Array<{ status: string; count: number; value: number }>;
  byBrand: Array<{ brand: string; count: number; value: number }>;
  byBranch: Array<{ branchId: string; branchName: string; count: number; value: number }>;
  averageAge: number;
}

export const reports = {
  getExecutiveDashboard: (params?: { preset?: string; startDate?: string; endDate?: string; branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<ExecutiveDashboard>(`/reports/dashboard/executive?${q}`);
  },
  getSalesSummary: (params?: { preset?: string; startDate?: string; endDate?: string; branches?: string; groupBy?: string }) => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.branches) q.set('branches', params.branches);
    if (params?.groupBy) q.set('groupBy', params.groupBy);
    return apiFetch<SalesSummary>(`/reports/sales/summary?${q}`);
  },
  getSalesByDimension: (params: { dimension: string; preset?: string; startDate?: string; endDate?: string; branches?: string; limit?: number }) => {
    const q = new URLSearchParams();
    q.set('dimension', params.dimension);
    if (params?.preset) q.set('preset', params.preset);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.branches) q.set('branches', params.branches);
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<any[]>(`/reports/sales/by-dimension?${q}`);
  },
  getRevenueCollection: (params?: { preset?: string; startDate?: string; endDate?: string; branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<any>(`/reports/financial/revenue-collection?${q}`);
  },
  getAgingReport: (params?: { branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<AgingReport>(`/reports/financial/aging?${q}`);
  },
  getInventoryStatus: (params?: { branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<InventoryStatus>(`/reports/inventory/current-status?${q}`);
  },
  getInventoryMovement: (params?: { preset?: string; startDate?: string; endDate?: string; branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<any>(`/reports/inventory/movement?${q}`);
  },
  getInstallmentPortfolio: (params?: { branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<any>(`/reports/installments/portfolio?${q}`);
  },
  getCustomerAnalytics: (params?: { preset?: string; startDate?: string; endDate?: string; branches?: string }) => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.branches) q.set('branches', params.branches);
    return apiFetch<any>(`/reports/customers/analytics?${q}`);
  },
};


// ─────────────────────────────────────────────────────────
// Configuration Management (SPEC-013)
// ─────────────────────────────────────────────────────────
export interface SystemConfiguration {
  id: string;
  configKey: string;
  configValue: any;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'date';
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyConfiguration {
  id: string;
  configKey: string;
  configValue: any;
  dataType: string;
  category: string;
  description?: string;
  version: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; email: string };
}

export interface BranchConfiguration {
  id: string;
  branchId: string;
  configKey: string;
  configValue: any;
  dataType: string;
  category: string;
  description?: string;
  inheritsFromCompany: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string };
}

export interface FeatureFlag {
  id: string;
  flagKey: string;
  flagName: string;
  description?: string;
  scope: 'system' | 'branch' | 'user';
  isEnabled: boolean;
  rolloutPercentage: number;
  targetBranches?: string[];
  environment: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string; email: string };
}

export interface DocumentNumbering {
  id: string;
  documentType: string;
  branchId?: string;
  prefix: string;
  suffix: string;
  nextNumber: number;
  currentNumber: number;
  padding: number;
  resetPolicy: 'never' | 'yearly' | 'monthly';
  lastResetAt?: string;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; nameEn: string; nameAr: string };
}

export interface WorkingHours {
  id: string;
  branchId: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  scope: 'company' | 'branch';
  branchId?: string;
  isRecurring: boolean;
  createdAt: string;
  createdBy: string;
  creator: { id: string; name: string };
  branch?: { id: string; nameEn: string; nameAr: string };
}

export interface ConfigurationAuditEntry {
  id: string;
  configType: string;
  configKey: string;
  branchId?: string;
  previousValue?: any;
  newValue: any;
  changeReason?: string;
  changedBy: string;
  changeTimestamp: string;
  ipAddress?: string;
  userAgent?: string;
  changer: { id: string; name: string; email: string };
  branch?: { id: string; nameEn: string; nameAr: string };
}

export interface UpdateConfigurationInput {
  configurations: Array<{
    configKey: string;
    configValue: any;
    reason?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
  }>;
}

export interface FeatureFlagUpdate {
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetBranches?: string[];
  reason?: string;
}

export interface DocumentNumberingUpdate {
  prefix?: string;
  suffix?: string;
  padding?: number;
  resetPolicy?: 'never' | 'yearly' | 'monthly';
  reason?: string;
}

export interface ResetNumberingInput {
  newStartingNumber: number;
  confirmed: boolean;
  reason: string;
}

export interface WorkingHoursUpdate {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface CreateHolidayInput {
  name: string;
  date: string;
  scope: 'company' | 'branch';
  branchId?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

export const configuration = {
  // System Configuration
  getSystemConfig: (params?: { category?: string; keys?: string[]; include_inactive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.keys) params.keys.forEach(k => q.append('keys', k));
    if (params?.include_inactive) q.set('include_inactive', 'true');
    return apiFetch<SystemConfiguration[]>(`/admin/config/system?${q}`);
  },
  updateSystemConfig: (data: UpdateConfigurationInput) =>
    apiFetch<{ updated: number; configurations: SystemConfiguration[] }>('/admin/config/system', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getSchema: () =>
    apiFetch<Array<{
      key: string;
      dataType: string;
      category: string;
      description?: string;
      isRequired: boolean;
      defaultValue?: any;
      validationRules?: any;
    }>>('/admin/config/schema'),

  // Company Configuration
  getCompanyConfig: (params?: { keys?: string[] }) => {
    const q = new URLSearchParams();
    if (params?.keys) params.keys.forEach(k => q.append('keys', k));
    return apiFetch<CompanyConfiguration[]>(`/admin/config/company?${q}`);
  },
  updateCompanyConfig: (data: UpdateConfigurationInput) =>
    apiFetch<{ updated: number; configurations: CompanyConfiguration[] }>('/admin/config/company', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Branch Configuration
  getBranchConfig: (branchId: string) =>
    apiFetch<BranchConfiguration[]>(`/admin/config/branches/${branchId}`),
  updateBranchConfig: (branchId: string, data: UpdateConfigurationInput) =>
    apiFetch<{ updated: number; configurations: BranchConfiguration[] }>(`/admin/config/branches/${branchId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listBranchConfigs: () =>
    apiFetch<Array<{
      id: string;
      nameEn: string;
      nameAr: string;
      configurations: Array<{
        configKey: string;
        configValue: any;
        inheritsFromCompany: boolean;
        updatedAt: string;
      }>;
    }>>('/admin/config/branches'),

  // Feature Flags
  listFeatureFlags: (params?: { scope?: string; enabled_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.scope) q.set('scope', params.scope);
    if (params?.enabled_only) q.set('enabled_only', 'true');
    return apiFetch<FeatureFlag[]>(`/admin/feature-flags?${q}`);
  },
  updateFeatureFlag: (flagKey: string, data: FeatureFlagUpdate) =>
    apiFetch<void>(`/admin/feature-flags/${flagKey}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createFeatureFlag: (data: {
    flagKey: string;
    flagName: string;
    description?: string;
    scope: string;
    isEnabled?: boolean;
    rolloutPercentage?: number;
    targetBranches?: string[];
  }) =>
    apiFetch<FeatureFlag>('/admin/feature-flags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkFeatureFlagStatus: (flagKey: string) =>
    apiFetch<{ flagKey: string; isEnabled: boolean }>(`/config/feature/${flagKey}/status`),

  // Document Numbering
  getNumbering: (params?: { document_type?: string; branch?: string }) => {
    const q = new URLSearchParams();
    if (params?.document_type) q.set('document_type', params.document_type);
    if (params?.branch) q.set('branch', params.branch);
    return apiFetch<DocumentNumbering[]>(`/admin/config/numbering?${q}`);
  },
  updateNumbering: (documentType: string, data: DocumentNumberingUpdate) =>
    apiFetch<DocumentNumbering>(`/admin/config/numbering/${documentType}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  resetSequence: (documentType: string, data: ResetNumberingInput) =>
    apiFetch<DocumentNumbering>(`/admin/config/numbering/${documentType}/reset`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Working Hours
  getWorkingHours: (branchId: string) =>
    apiFetch<WorkingHours[]>(`/admin/config/working-hours/${branchId}`),
  updateWorkingHours: (branchId: string, data: WorkingHoursUpdate[]) =>
    apiFetch<{ created: number; workingHours: WorkingHours[] }>(`/admin/config/working-hours/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Holidays
  listHolidays: (params?: { branch_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    return apiFetch<Holiday[]>(`/admin/config/holidays?${q}`);
  },
  createHoliday: (data: CreateHolidayInput) =>
    apiFetch<Holiday>('/admin/config/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteHoliday: (id: string) =>
    apiFetch<void>(`/admin/config/holidays/${id}`, {
      method: 'DELETE',
    }),

  // Configuration Audit
  getAudit: (params?: {
    config_type?: string;
    config_key?: string;
    branch_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.config_type) q.set('config_type', params.config_type);
    if (params?.config_key) q.set('config_key', params.config_key);
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    if (params?.from_date) q.set('from_date', params.from_date);
    if (params?.to_date) q.set('to_date', params.to_date);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{
      data: ConfigurationAuditEntry[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/config/audit?${q}`);
  },

  // Configuration Statistics (TASK-014)
  getStats: () =>
    apiFetch<{
      systemConfigurations: number;
      companyConfigurations: number;
      branchConfigurations: number;
      totalFeatureFlags: number;
      enabledFeatureFlags: number;
      recentChangesLast7Days: number;
    }>('/admin/config/stats'),

  // Resolved Configuration (for current user)
  getResolvedConfig: (params?: { keys?: string[]; branch_override?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.keys) params.keys.forEach(k => q.append('keys', k));
    if (params?.branch_override) q.set('branch_override', 'true');
    return apiFetch<Record<string, any>>(`/config/resolved?${q}`);
  },
  getConfigValue: (key: string) =>
    apiFetch<{
      value: any;
      source: 'system' | 'company' | 'branch';
      version?: number;
      lastModified: string;
      modifiedBy?: string;
    }>(`/config/value/${key}`),
};
