import { apiClient, type ApiResponse } from "./api-client";

export interface Brand {
  id: string;
  nameAr: string;
  nameEn: string;
  logo?: string | null;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  parentId?: string | null;
  children?: Category[];
}

export interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Motorcycle {
  id: string;
  vin: string;
  model: string;
  year: number;
  color?: string | null;
  engineSize?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  status: string;
  images: string[] | string | null;
  brand: Brand;
  category: Category;
  branch: Branch;
  createdAt?: string;
}

export interface MotorcycleQuery {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  sort?: "price" | "year" | "createdAt" | "model";
  order?: "asc" | "desc";
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function normalizeImages(images: Motorcycle["images"]): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  } catch {
    return [];
  }
}

function buildQuery(query: MotorcycleQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export async function listMotorcycles(query: MotorcycleQuery = {}) {
  const qs = buildQuery({ page: 1, limit: 12, sort: "createdAt", order: "desc", ...query });
  const response: ApiResponse<Motorcycle[]> = await apiClient.getWithMeta<Motorcycle[]>(`/motorcycles?${qs}`, {
    next: { revalidate: 30 },
  } as RequestInit);

  return {
    items: response.data ?? [],
    meta: response.meta ?? { total: 0, page: Number(query.page ?? 1), limit: Number(query.limit ?? 12), totalPages: 0 },
  };
}

export async function getMotorcycle(id: string) {
  return apiClient.get<Motorcycle>(`/motorcycles/${id}`, {
    next: { revalidate: 30 },
  } as RequestInit);
}

export async function listBrands() {
  return apiClient.get<Brand[]>("/brands", {
    next: { revalidate: 300 },
  } as RequestInit);
}

export async function listCategories() {
  return apiClient.get<Category[]>("/categories?flat=true", {
    next: { revalidate: 300 },
  } as RequestInit);
}

export function displayName(item: { nameEn: string; nameAr: string }, locale: string) {
  return locale === "ar" ? item.nameAr : item.nameEn;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function publicVin(vin: string) {
  if (vin.length <= 6) return vin;
  return `${vin.slice(0, 3)}••••${vin.slice(-4)}`;
}
