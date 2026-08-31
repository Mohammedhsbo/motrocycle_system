import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { MotorcycleCard } from "@/components/MotorcycleCard";
import { MotorcycleVisual } from "@/components/MotorcycleVisual";
import { displayName, formatCurrency, listBrands, listCategories, listMotorcycles, normalizeImages } from "@/lib/catalog-api";
import { getStoreSettings, listInstallmentDurations, calculateInstallment } from "@/lib/financing-api";
import { ArrowRight, BadgeCheck, CreditCard, MapPin, ShieldCheck, Sparkles, Truck, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations("home");
  const { locale } = await params;
  const [{ items: featured }, { items: latest }, brands, categories, settings, durations] = await Promise.all([
    listMotorcycles({ limit: 6, sort: "price", order: "desc" }).catch(() => ({ items: [], meta: { total: 0, page: 1, limit: 6, totalPages: 0 } })),
    listMotorcycles({ limit: 4, sort: "createdAt", order: "desc" }).catch(() => ({ items: [], meta: { total: 0, page: 1, limit: 4, totalPages: 0 } })),
    listBrands().catch(() => []),
    listCategories().catch(() => []),
    getStoreSettings().catch(() => null),
    listInstallmentDurations().catch(() => []),
  ]);

  const heroBike = featured[0] ?? latest[0];
  const heroImages = normalizeImages(heroBike?.images ?? []);
  const inventoryUnavailable = featured.length === 0 && latest.length === 0 && brands.length === 0 && categories.length === 0;
  const brandCounts = new Map<string, number>();
  for (const bike of [...featured, ...latest]) brandCounts.set(bike.brand.id, (brandCounts.get(bike.brand.id) ?? 0) + 1);
  const offerDuration = durations[durations.length - 1];
  const offerDownPayment = settings?.defaultDepositAmount ?? (heroBike && settings?.defaultDepositPercentage
    ? heroBike.price * settings.defaultDepositPercentage / 100
    : undefined);
  const offer = heroBike && offerDuration && offerDownPayment !== undefined && offerDownPayment < heroBike.price
    ? await calculateInstallment({ motorcycleId: heroBike.id, installmentDurationId: offerDuration.id, downPayment: offerDownPayment }).catch(() => null)
    : null;

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-[#0051b8] text-white min-h-[90vh] flex flex-col justify-end pt-24 pb-0">
        {/* Background Gradients & Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#002f7a] via-[#0051b8] to-[#0070e6]"></div>
          <img src="/hero.png" alt="Hero" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent"></div>
        </div>
        
        {/* Main Content Area */}
        <div className="section-shell relative z-20 mb-8 md:mb-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-4 relative">
            
            {/* DOM 1: RIGHT VISUAL SIDE (Secondary Headline) */}
            <div className="w-full lg:w-[30%] z-30 flex flex-col justify-center items-center lg:items-start text-center lg:text-start lg:order-1 order-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl text-white mb-4 drop-shadow-md leading-tight">
                {t("hero.rightHeadline")}
              </h2>
              <p className="text-lg text-white/95 font-medium max-w-sm">
                {t("hero.rightSubheadline")}
              </p>
              
              <div className="mt-8 lg:mt-32 flex items-center gap-2 text-white font-bold drop-shadow-md">
                <span className="text-base">{t("hero.yearsInstallment")}</span>
                <span className="text-5xl font-black mx-1">{t("hero.yearsValue")}</span>
                <span className="text-base">{t("hero.yearsLabel")}</span>
              </div>
            </div>

            {/* DOM 2: CENTER - Motorcycle Image */}
            <div className="w-full lg:w-[40%] z-40 relative flex justify-center lg:order-2 order-1">
              <div className="relative w-full max-w-xl mx-auto drop-shadow-[0_30px_50px_rgba(0,0,0,0.5)] lg:scale-125 lg:translate-y-8 animate-zoom-in" style={{ animationDelay: '100ms' }}>
                {heroBike ? (
                  <MotorcycleVisual src={heroImages[0]} alt={`${displayName(heroBike.brand, locale)} ${heroBike.model}`} className="w-full h-auto object-contain" priority />
                ) : (
                  <img src="/hero.png" alt="Hero" className="w-full h-auto object-contain" />
                )}
              </div>
            </div>

            {/* DOM 3: LEFT VISUAL SIDE (Big Headline) */}
            <div className="w-full lg:w-[30%] z-30 flex flex-col justify-center items-center lg:items-start text-center lg:text-start lg:order-3 order-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h1 className="text-5xl font-black leading-tight sm:text-6xl lg:text-7xl mb-4 text-white drop-shadow-lg">
                {t("hero.newHeadline").split(' ').slice(0, -1).join(' ')}{' '}
                <span className="relative inline-block pb-2">
                  {t("hero.newHeadline").split(' ').slice(-1)}
                  <span className="absolute bottom-0 left-0 right-0 h-1.5 bg-white rounded-full"></span>
                </span>
              </h1>
              
              <p className="mt-4 text-lg font-bold text-white/95 max-w-sm">
                {t("hero.newSubheadline")}
              </p>
              
              <div className="mt-8 flex gap-3 sm:gap-6 w-full justify-center lg:justify-start">
                {/* 30% Box */}
                <div className="flex-1 rounded-3xl border border-white/20 bg-white p-3 sm:p-5 text-[#003887] shadow-[0_0_20px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center min-w-[120px] sm:min-w-[140px]">
                  <div className="text-4xl sm:text-5xl font-black leading-none mb-2">{t("hero.discountValue")}</div>
                  <div className="text-xs sm:text-sm font-bold text-center leading-tight">{t("hero.discountLabel")}</div>
                </div>
                
                {/* 24 Month Box */}
                <div className="flex-1 rounded-3xl border border-white/20 bg-white p-3 sm:p-5 text-[#003887] shadow-[0_0_20px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center min-w-[120px] sm:min-w-[140px] relative">
                  <div className="absolute top-3 start-4 text-[10px] sm:text-xs font-bold">{t("hero.installmentLabel")}</div>
                  <div className="absolute top-3 end-4 text-[10px] sm:text-xs font-bold">{t("hero.installmentDownpayment")}</div>
                  <div className="text-5xl sm:text-6xl font-black leading-none my-2 text-[#0051b8]">{t("hero.installmentValue")}</div>
                  <div className="text-sm font-black">{t("hero.installmentMonths")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM STRIP (Trust Badges & Brands) ON WHITE BACKGROUND */}
        <div className="relative z-50 w-full bg-white text-[#003887] shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
          {/* Subtle curved top effect */}
          <div className="absolute -top-6 left-0 right-0 h-12 bg-white" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}></div>
          
          <div className="section-shell relative z-10 py-6 lg:py-8 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <div className="flex flex-col gap-6 lg:gap-8">
              
              {/* Trust Badges */}
              <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 w-full">
                <div className="font-bold text-lg hidden lg:block whitespace-nowrap">{t("hero.trustTitle")}</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-x sm:divide-x-reverse divide-blue-200 w-full text-sm font-bold">
                  <div className="flex items-center gap-3 justify-center lg:justify-start px-4">
                    <Truck size={28} strokeWidth={2.5} className="text-[#0051b8] shrink-0" />
                    <span className="leading-tight text-start">{t("hero.trust3")}</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center px-4">
                    <Wrench size={28} strokeWidth={2.5} className="text-[#0051b8] shrink-0" />
                    <span className="leading-tight text-start">{t("hero.trust2")}</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center lg:justify-end px-4">
                    <ShieldCheck size={28} strokeWidth={2.5} className="text-[#0051b8] shrink-0" />
                    <span className="leading-tight text-start">{t("hero.trust1")}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* BRANDS SECTION */}
      <section className="bg-white py-6 border-b border-zinc-100 relative z-20">
        <div className="section-shell">
          <div className="flex items-end gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            {/* Brand items */}
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/motorcycles?brandId=${brand.id}`}
                className="shrink-0 flex flex-col items-center gap-2 group min-w-[90px] max-w-[120px]"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={displayName(brand, locale)}
                      className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300 drop-shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center">
                      <span className="text-2xl font-black text-zinc-400 group-hover:text-zinc-700 transition-colors">
                        {displayName(brand, locale).charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors text-center leading-tight">
                  {displayName(brand, locale)}
                </span>
              </Link>
            ))}

            {/* "All" button at the end */}
            <Link
              href="/motorcycles"
              className="shrink-0 flex flex-col items-center gap-2 group min-w-[90px] max-w-[120px]"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-10 h-10 text-zinc-400 group-hover:text-zinc-700 transition-colors" fill="currentColor">
                  <rect x="2" y="2" width="16" height="16" rx="3"/>
                  <rect x="22" y="2" width="16" height="16" rx="3"/>
                  <rect x="2" y="22" width="16" height="16" rx="3"/>
                  <rect x="22" y="22" width="16" height="16" rx="3"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors text-center">
                {t("hero.brandsAll")}
              </span>
            </Link>

          </div>
        </div>
      </section>


      <section className="section-shell py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">{t("featuredLabel")}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">{t("featuredSubtitle")}</h2>
          </div>
          <Link href="/motorcycles" className="hidden text-sm font-bold text-zinc-900 hover:text-blue-700 sm:inline-flex">{t("viewAll")}</Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((motorcycle, index) => <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} locale={locale} priority={index < 2} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
            <h3 className="text-lg font-bold">{inventoryUnavailable ? t("emptyUnavailable") : t("emptyNoneAvailable")}</h3>
            <p className="mt-2 text-zinc-600">{inventoryUnavailable ? t("emptyUnavailableDescription") : t("emptyNoneAvailableDescription")}</p>
          </div>
        )}
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
              <Icon className="text-blue-700" size={22} />
              <p className="mt-4 text-sm font-bold text-zinc-950">{String(label)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blue-900 py-16 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/pattern.svg')] bg-repeat"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-800 to-transparent mix-blend-multiply pointer-events-none"></div>
        <div className="section-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-center relative z-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">{t("installmentOffer")}</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight">{t("title")}</h2>
            <p className="mt-4 max-w-2xl text-blue-100">{t("description")}</p>
          </div>
          <Link href="/account/financing" className="inline-flex rounded-md bg-white px-6 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-50 shadow-md">
            {t("installmentOffer")}
          </Link>
        </div>
      </section>

      <section className="section-shell py-16">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Latest arrivals</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Fresh into inventory</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((motorcycle) => <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} locale={locale} />)}
        </div>
      </section>

      <section className="section-shell pb-16">
        <div className="rounded-lg bg-blue-900 p-8 text-white md:p-12 relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-10 bg-[url('/pattern.svg')] bg-repeat"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-800 to-transparent mix-blend-multiply pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tight">Your next motorcycle is waiting.</h2>
            <p className="mt-3 max-w-2xl text-blue-100">Search live inventory, review details, and reserve through the real backend reservation flow.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/motorcycles" className="rounded-md bg-white px-5 py-3 text-center text-sm font-bold text-blue-900 shadow-md hover:bg-blue-50 transition">Explore Inventory</Link>
              <Link href="/register" className="rounded-md border border-white/50 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/10 transition">Create Account</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
