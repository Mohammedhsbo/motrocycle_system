import { apiClient } from "./api-client";
import type { 
  UpdateCustomerDto, 
  ChangeCustomerPasswordDto,
  CreateAddressDto,
  UpdateAddressDto,
} from "@motorcycle-system/shared-types";

// Note: Shared types doesn't export the full Customer model, we use generic any or define our own
export interface Address {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  status: string;
  addresses: Address[];
}

export const customerApi = {
  getProfile: (id: string) => 
    apiClient.get<CustomerProfile>(`/customers/${id}`),

  updateProfile: (id: string, data: UpdateCustomerDto) =>
    apiClient.patch<CustomerProfile>(`/customers/${id}`, data),

  changePassword: (id: string, data: ChangeCustomerPasswordDto) =>
    apiClient.post(`/customers/${id}/change-password`, data),

  getAddresses: (id: string) =>
    apiClient.get<Address[]>(`/customers/${id}/addresses`),

  createAddress: (id: string, data: CreateAddressDto) =>
    apiClient.post<Address>(`/customers/${id}/addresses`, data),

  updateAddress: (id: string, addressId: string, data: UpdateAddressDto) =>
    apiClient.patch<Address>(`/customers/${id}/addresses/${addressId}`, data),

  deleteAddress: (id: string, addressId: string) =>
    apiClient.delete(`/customers/${id}/addresses/${addressId}`),

  setDefaultAddress: (id: string, addressId: string) =>
    apiClient.post<Address>(`/customers/${id}/addresses/${addressId}/set-default`),
};
