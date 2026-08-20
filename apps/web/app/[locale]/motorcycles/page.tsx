import type { Metadata } from "next";
import { CatalogClient } from "@/components/CatalogClient";
import { listBrands, listCategories, listMotorcycles, type MotorcycleQuery } from "@/lib/catalog-api";

export const metadata: Metadata = {
  title: "Motorcycle Inventory",
  description: "Browse live motorcycle inventory with brand, category, price, year, and search filters.",
};

export const dynamic = "force-dynamic";

export default async function MotorcyclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const raw = await searchParams;
  const filters = normalizeFilters(raw);
  const [{ items, meta }, brands, categories] = await Promise.all([
    listMotorcycles(filters).catch(() => ({
      items: [],
      meta: { total: 0, page: Number(filters.page ?? 1), limit: Number(filters.limit ?? 12), totalPages: 0 },
    })),
    listBrands().catch(() => []),
    listCategories().catch(() => []),
  ]);

  return (
    <div className="bg-zinc-50">
      <section className="bg-zinc-950 py-12 text-white">
        <div className="section-shell">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Live dealership inventory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Motorcycles</h1>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Search real backend inventory by brand, category, price, year, and model. Availability is controlled by the Motrocycle System backend.
          </p>
        </div>
      </section>
      <CatalogClient initialItems={items} initialMeta={meta} brands={brands} categories={categories} locale={locale} initialFilters={toStringFilters(filters)} />
    </div>
  );
}

function normalizeFilters(raw: Record<string, string | string[] | undefined>): MotorcycleQuery {
  const value = (key: string) => {
    const item = raw[key];
    return Array.isArray(item) ? item[0] : item;
  };

  return {
    page: Number(value("page") ?? 1),
    limit: Number(value("limit") ?? 12),
    search: value("search"),
    brandId: value("brandId"),
    categoryId: value("categoryId"),
    minPrice: value("minPrice"),
    maxPrice: value("maxPrice"),
    minYear: value("minYear"),
    maxYear: value("maxYear"),
    sort: (value("sort") as MotorcycleQuery["sort"]) ?? "createdAt",
    order: (value("order") as MotorcycleQuery["order"]) ?? "desc",
  };
}

function toStringFilters(filters: MotorcycleQuery) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") result[key] = String(value);
  }
  return result;
}
