import { apiClient } from "./api-client";

export type ReservationStatus = "active" | "converted" | "expired" | "cancelled";

export interface ReservationMotorcycle {
  id: string;
  vin: string;
  model: string;
  year: number;
  color?: string | null;
  price: number;
  brand: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  images?: string[] | null;
}

export interface Reservation {
  id: string;
  reservationNumber: string;
  motorcycle: ReservationMotorcycle;
  status: ReservationStatus;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const reservationsApi = {
  // Get reservations for a specific customer
  getByCustomer: (
    customerId: string,
    params?: { page?: number; limit?: number; status?: ReservationStatus }
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    query.set("sort", "createdAt");
    query.set("order", "desc");
    return apiClient.get<PaginatedResult<Reservation>>(
      `/customers/${customerId}/reservations?${query.toString()}`
    );
  },

  // Get a single reservation
  getOne: (id: string) => apiClient.get<Reservation>(`/reservations/${id}`),

  // Create a reservation
  create: (data: {
    customerId: string;
    motorcycleId: string;
    paidAmount: number;
    notes?: string;
  }) => apiClient.post<Reservation>("/reservations", data),

  // Cancel a reservation
  cancel: (id: string, data: { reason?: string }) =>
    apiClient.post(`/reservations/${id}/cancel`, data),
};
