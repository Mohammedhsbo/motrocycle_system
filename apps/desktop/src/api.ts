const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

let authToken: string | null = localStorage.getItem('pos_token');

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem('pos_token', token);
}

export function getToken() { return authToken; }
export function clearToken() { authToken = null; localStorage.removeItem('pos_token'); }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message ?? 'Request failed') as Error & { code?: string; status?: number };
    err.code = json.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

// ─── Auth ────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
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
  list: (params?: { customerId?: string; status?: OrderStatus; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ items: OrderListItem[]; total: number; page: number; limit: number }>(`/orders?${q}`);
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
  convert: (id: string, notes?: string) =>
    apiFetch<{ reservation: ReservationDetail; order: { id: string; orderNumber: string } }>(`/reservations/${id}/convert`, {
      method: 'POST',
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

export const invoices = {
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
    };
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
  
  validateTransaction: (data: any) =>
    apiFetch('/pos/validate-transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createTransaction: (data: any) =>
    apiFetch('/pos/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getActiveReservations: (branchId?: string, customerId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (customerId) params.append('customerId', customerId);
    return apiFetch<POSReservation[]>(`/pos/reservations/active?${params}`);
  },
  
  convertReservation: (id: string, notes?: string) =>
    apiFetch(`/pos/reservations/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  
  getSyncStatus: () => apiFetch<POSSyncStatus>('/pos/offline/sync-status'),
  
  queueOperation: (data: any) =>
    apiFetch('/pos/offline/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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
