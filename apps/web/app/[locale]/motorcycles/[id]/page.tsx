import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ProductGallery } from "@/components/ProductGallery";
import { displayName, formatCurrency, getMotorcycle, normalizeImages, publicVin } from "@/lib/catalog-api";
import { Calendar, Gauge, MapPin, Palette, ShieldCheck } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  try {
    const motorcycle = await getMotorcycle(id);
    const title = `${displayName(motorcycle.brand, locale)} ${motorcycle.model} ${motorcycle.year}`;
    const description = motorcycle.descriptionEn ?? `${title} available at ${displayName(motorcycle.branch, locale)}.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
      },
    };
  } catch {
    return { title: "Motorcycle" };
  }
}

export default async function MotorcycleDetailsPage({ params }: PageProps) {
  const t = await getTranslations("motorcycleDetails");
  const { locale, id } = await params;
  let motorcycle;
  try {
    motorcycle = await getMotorcycle(id);
  } catch {
    notFound();
  }

  const title = `${displayName(motorcycle.brand, locale)} ${motorcycle.model}`;
  const images = normalizeImages(motorcycle.images);
  const description = locale === "ar" ? motorcycle.descriptionAr || motorcycle.descriptionEn : motorcycle.descriptionEn || motorcycle.descriptionAr;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${title} ${motorcycle.year}`,
    brand: displayName(motorcycle.brand, locale),
    model: motorcycle.model,
    color: motorcycle.color,
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: motorcycle.price,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-zinc-950 py-10 text-white">
        <div className="section-shell">
          <Link href="/motorcycles" className="text-sm font-bold text-zinc-300 hover:text-white">{t("backToInventory")}</Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">{displayName(motorcycle.brand, locale)}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">{motorcycle.model}</h1>
              <p className="mt-3 text-zinc-300">{motorcycle.year} · {motorcycle.engineSize ?? t("engineAvailable")} · {displayName(motorcycle.category, locale)}</p>
            </div>
            <div className="rounded-lg bg-white p-5 text-zinc-950 shadow-xl">
              <p className="text-sm text-zinc-500">{t("price")}</p>
              <p className="text-3xl font-black">{formatCurrency(motorcycle.price)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <ProductGallery images={images} title={title} />

        <aside className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={20} />
              <span className="text-sm font-bold">{t("inStock")}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Spec icon={<Gauge size={18} />} label={t("engine")} value={motorcycle.engineSize ?? t("availableOnRequest")} />
              <Spec icon={<Calendar size={18} />} label={t("year")} value={String(motorcycle.year)} />
              <Spec icon={<Palette size={18} />} label={t("color")} value={motorcycle.color ?? t("availableOnRequest")} />
              <Spec icon={<MapPin size={18} />} label={t("branch")} value={displayName(motorcycle.branch, locale)} />
            </div>
            <div className="mt-5 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
              {t("vinReference")} <span className="font-mono font-bold text-zinc-950">{publicVin(motorcycle.vin)}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href={`/reserve/${motorcycle.id}`} className="rounded-md bg-red-700 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-800">{t("reserveNow")}</Link>
              <AddToCartButton motorcycle={{
                id: motorcycle.id,
                vin: motorcycle.vin,
                model: motorcycle.model,
                year: motorcycle.year,
                price: motorcycle.price,
                brand: {
                  nameEn: motorcycle.brand.nameEn,
                  nameAr: motorcycle.brand.nameAr
                }
              }} />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
            <h2 className="text-xl font-black">{t("supportTitle")}</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              <li>{t("support1")}</li>
              <li>{t("support2")}</li>
              <li>{t("support3")}</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="section-shell pb-14">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">{t("overview")}</h2>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-700">
            {description || t("descriptionFallback")}
          </p>
        </div>
      </section>
    </div>
  );
}

function Spec({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-center gap-2 text-zinc-500">{icon}<span className="text-xs font-bold uppercase tracking-[0.14em]">{label}</span></div>
      <p className="mt-2 font-bold text-zinc-950">{value}</p>
    </div>
  );
}
