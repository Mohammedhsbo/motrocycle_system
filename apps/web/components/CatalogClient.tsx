"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { apiClient, ApiError } from "@/lib/api-client";
import { displayName, type Brand, type Category, type Motorcycle, type PageMeta } from "@/lib/catalog-api";
import { MotorcycleCard } from "./MotorcycleCard";
import { Filter, RotateCcw, Search } from "lucide-react";

interface CatalogClientProps {
  initialItems: Motorcycle[];
  initialMeta: PageMeta;
  brands: Brand[];
  categories: Category[];
  locale: string;
  initialFilters: Record<string, string>;
}

const sortOptions = [
  { value: "createdAt-desc", label: "Newest" },
  { value: "price-asc", label: "Price: Low to high" },
  { value: "price-desc", label: "Price: High to low" },
  { value: "year-desc", label: "Year: Newest" },
  { value: "model-asc", label: "Model A-Z" },
];

export function CatalogClient({ initialItems, initialMeta, brands, categories, locale, initialFilters }: CatalogClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [meta, setMeta] = useState(initialMeta);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortValue = `${filters.sort ?? "createdAt"}-${filters.order ?? "desc"}`;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        setError(null);
        const response = await apiClient.getWithMeta<Motorcycle[]>(`/motorcycles?${queryString}`);
        if (!cancelled) {
          setItems(response.data ?? []);
          setMeta(response.meta ?? initialMeta);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Something went wrong while loading the motorcycles.");
        }
      }
    });

    router.replace(`/motorcycles${queryString ? `?${queryString}` : ""}`, { scroll: false });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const updateFilter = (key: string, value: string) => {
    setFilters((current) => ({ ...current, page: "1", [key]: value }));
  };

  const updateSort = (value: string) => {
    const [sort, order] = value.split("-");
    setFilters((current) => ({ ...current, page: "1", sort, order }));
  };

  const resetFilters = () => {
    setFilters({ page: "1", limit: filters.limit ?? "12", sort: "createdAt", order: "desc" });
  };

  const setPage = (page: number) => {
    setFilters((current) => ({ ...current, page: String(page) }));
  };

  return (
    <div className="section-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[290px_1fr]">
        <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black"><Filter size={18} /> Filters</h2>
            <button onClick={resetFilters} className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-red-700">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Search</span>
              <div className="mt-2 flex items-center rounded-md border border-zinc-300 bg-white px-3">
                <Search size={16} className="text-zinc-400" />
                <input value={filters.search ?? ""} onChange={(event) => updateFilter("search", event.target.value)} className="w-full border-0 bg-transparent px-2 py-2 text-sm outline-none" placeholder="Brand, model, VIN" />
              </div>
            </label>
            <Select label="Brand" value={filters.brandId ?? ""} onChange={(value) => updateFilter("brandId", value)} options={brands.map((brand) => ({ value: brand.id, label: displayName(brand, locale) }))} />
            <Select label="Category" value={filters.categoryId ?? ""} onChange={(value) => updateFilter("categoryId", value)} options={categories.map((category) => ({ value: category.id, label: displayName(category, locale) }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min price" value={filters.minPrice ?? ""} onChange={(value) => updateFilter("minPrice", value)} />
              <Input label="Max price" value={filters.maxPrice ?? ""} onChange={(value) => updateFilter("maxPrice", value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min year" value={filters.minYear ?? ""} onChange={(value) => updateFilter("minYear", value)} />
              <Input label="Max year" value={filters.maxYear ?? ""} onChange={(value) => updateFilter("maxYear", value)} />
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500">{meta.total} motorcycles found</p>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">Live Inventory</h1>
            </div>
            <select value={sortValue} onChange={(event) => updateSort(event.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 text-red-900">
              <p className="font-bold">Something went wrong while loading the motorcycles.</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {isPending && (
            <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-96 animate-pulse rounded-lg bg-zinc-200" />)}
            </div>
          )}

          {!isPending && items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
              <h2 className="text-xl font-black">No motorcycles found.</h2>
              <p className="mt-2 text-zinc-600">Adjust your filters or reset the search to browse current inventory.</p>
              <button onClick={resetFilters} className="mt-5 rounded-md bg-zinc-950 px-5 py-3 text-sm font-bold text-white">Reset filters</button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((motorcycle, index) => <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} locale={locale} priority={index < 3} />)}
            </div>
          )}

          {meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
              <span className="text-sm text-zinc-600">Page {meta.page} of {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm">
        <option value="">All</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" />
    </label>
  );
}
