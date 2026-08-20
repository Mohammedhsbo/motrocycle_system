import { Link } from "@/i18n/routing";
import { MotorcycleCard } from "@/components/MotorcycleCard";
import { MotorcycleVisual } from "@/components/MotorcycleVisual";
import { displayName, formatCurrency, listBrands, listCategories, listMotorcycles, normalizeImages } from "@/lib/catalog-api";
import { ArrowRight, BadgeCheck, CreditCard, MapPin, ShieldCheck, Sparkles, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [{ items: featured }, { items: latest }, brands, categories] = await Promise.all([
    listMotorcycles({ limit: 6, sort: "price", order: "desc" }).catch(() => ({ items: [], meta: { total: 0, page: 1, limit: 6, totalPages: 0 } })),
    listMotorcycles({ limit: 4, sort: "createdAt", order: "desc" }).catch(() => ({ items: [], meta: { total: 0, page: 1, limit: 4, totalPages: 0 } })),
    listBrands().catch(() => []),
    listCategories().catch(() => []),
  ]);

  const heroBike = featured[0] ?? latest[0];
  const heroImages = normalizeImages(heroBike?.images ?? []);
  const inventoryUnavailable = featured.length === 0 && latest.length === 0 && brands.length === 0 && categories.length === 0;
  const brandCounts = new Map<string, number>();
  for (const bike of [...featured, ...latest]) brandCounts.set(bike.brand.id, (brandCounts.get(bike.brand.id) ?? 0) + 1);

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="section-shell grid min-h-[calc(100vh-72px)] items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
              Premium verified inventory
            </p>
            <h1 className="text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">Find Your Next Ride.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Explore branch-backed motorcycles with real availability, secure reservations, and a polished buying experience connected to the Motrocycle System backend.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/motorcycles" className="inline-flex items-center justify-center rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700">
                Explore Motorcycles <ArrowRight className="ml-2" size={18} />
              </Link>
              {heroBike && (
                <Link href={`/reserve/${heroBike.id}`} className="inline-flex items-center justify-center rounded-md border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-zinc-950">
                  Book a Reservation
                </Link>
              )}
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm text-zinc-300">
              <div><strong className="block text-2xl text-white">{featured.length + latest.length}+</strong>Featured bikes</div>
              <div><strong className="block text-2xl text-white">{brands.length}</strong>Brands</div>
              <div><strong className="block text-2xl text-white">{categories.length}</strong>Categories</div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="relative aspect-[16/11] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-2xl">
              <MotorcycleVisual src={heroImages[0]} alt={heroBike ? `${displayName(heroBike.brand, locale)} ${heroBike.model}` : "Premium motorcycle"} priority />
              {heroBike && (
                <div className="absolute inset-x-4 bottom-4 rounded-lg bg-white/92 p-4 text-zinc-950 shadow-xl backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">{displayName(heroBike.brand, locale)}</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black">{heroBike.model}</h2>
                      <p className="text-sm text-zinc-600">{heroBike.year} · {heroBike.engineSize ?? "Engine available"} · {displayName(heroBike.branch, locale)}</p>
                    </div>
                    <p className="text-xl font-black">{formatCurrency(heroBike.price)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-700">Featured motorcycles</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Ready for the road</h2>
          </div>
          <Link href="/motorcycles" className="hidden text-sm font-bold text-zinc-900 hover:text-red-700 sm:inline-flex">View all inventory</Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((motorcycle, index) => <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} locale={locale} priority={index < 2} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
            <h3 className="text-lg font-bold">{inventoryUnavailable ? "Inventory is temporarily unavailable." : "No motorcycles are available right now."}</h3>
            <p className="mt-2 text-zinc-600">{inventoryUnavailable ? "Please try again shortly while we reconnect to the inventory service." : "Check back after inventory is added through the admin dashboard."}</p>
          </div>
        )}
      </section>

      <section className="bg-zinc-100 py-16">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-700">Brands and categories</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Shop by the way you ride</h2>
            <p className="mt-4 text-zinc-600">The website reads the same brands, categories, and inventory that the admin team manages.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {brands.slice(0, 6).map((brand) => (
              <Link key={brand.id} href={`/motorcycles?brandId=${brand.id}`} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Brand</p>
                <h3 className="mt-2 text-xl font-black">{displayName(brand, locale)}</h3>
                <p className="mt-1 text-sm text-zinc-500">{brandCounts.get(brand.id) ?? 0} available in featured stock</p>
              </Link>
            ))}
            {categories.slice(0, 6).map((category) => (
              <Link key={category.id} href={`/motorcycles?categoryId=${category.id}`} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Category</p>
                <h3 className="mt-2 text-xl font-black">{displayName(category, locale)}</h3>
                <p className="mt-1 text-sm text-zinc-500">Browse matching motorcycles</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-16">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            [BadgeCheck, "Verified motorcycles"],
            [CreditCard, "Reservation deposits"],
            [Wrench, "Service-ready records"],
            [MapPin, "Branch availability"],
            [ShieldCheck, "Secure accounts"],
            [Sparkles, "Premium experience"],
          ].map(([Icon, label]) => (
            <div key={String(label)} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <Icon className="text-red-700" size={22} />
              <p className="mt-4 text-sm font-bold text-zinc-950">{String(label)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-950 py-16 text-white">
        <div className="section-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">Ride now. Pay your way.</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight">Flexible financing visibility from your account.</h2>
            <p className="mt-4 max-w-2xl text-zinc-300">Customers can track financing contracts and installment status through the connected account area where financing records exist.</p>
          </div>
          <Link href="/account/financing" className="inline-flex rounded-md bg-white px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-red-600 hover:text-white">
            View Financing
          </Link>
        </div>
      </section>

      <section className="section-shell py-16">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-700">Latest arrivals</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Fresh into inventory</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((motorcycle) => <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} locale={locale} />)}
        </div>
      </section>

      <section className="section-shell pb-16">
        <div className="rounded-lg bg-red-700 p-8 text-white md:p-12">
          <h2 className="text-4xl font-black tracking-tight">Your next motorcycle is waiting.</h2>
          <p className="mt-3 max-w-2xl text-red-50">Search live inventory, review details, and reserve through the real backend reservation flow.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/motorcycles" className="rounded-md bg-white px-5 py-3 text-center text-sm font-bold text-red-700">Explore Inventory</Link>
            <Link href="/register" className="rounded-md border border-white/50 px-5 py-3 text-center text-sm font-bold text-white">Create Account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
