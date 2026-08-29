import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { conditionLabel, displayName, formatCurrency, normalizeImages, type Motorcycle } from "@/lib/catalog-api";
import { Gauge, MapPin, ShieldCheck } from "lucide-react";
import { MotorcycleVisual } from "./MotorcycleVisual";

interface MotorcycleCardProps {
  motorcycle: Motorcycle;
  locale: string;
  priority?: boolean;
}

export function MotorcycleCard({ motorcycle, locale, priority }: MotorcycleCardProps) {
  const t = useTranslations("home");
  const images = normalizeImages(motorcycle.images);
  const title = `${displayName(motorcycle.brand, locale)} ${motorcycle.model}`;

  return (
    <article className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/motorcycles/${motorcycle.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          <MotorcycleVisual src={images[0]} alt={title} priority={priority} className="transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 rounded-md bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow-sm">
            {conditionLabel(motorcycle.condition, locale)}
          </div>
        </div>
      </Link>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{displayName(motorcycle.brand, locale)}</p>
          <Link href={`/motorcycles/${motorcycle.id}`} className="mt-1 block text-xl font-semibold text-zinc-950 transition hover:text-blue-700">
            {motorcycle.model}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600">
          <span className="flex items-center gap-1"><Gauge size={14} />{motorcycle.engineSize ?? t("engine")}</span>
          <span>{motorcycle.year}</span>
          <span>{motorcycle.color ?? t("color")}</span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs text-zinc-500">{t("price")}</p>
            <p className="text-lg font-bold text-zinc-950">{formatCurrency(motorcycle.price)}</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p className="inline-flex items-center gap-1"><MapPin size={13} />{displayName(motorcycle.branch, locale)}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-blue-700"><ShieldCheck size={13} />{t("verified")}</p>
          </div>
        </div>
        <div>
          <Link href={`/motorcycles/${motorcycle.id}`} className="store-button w-full">
            {t("details")}
          </Link>
        </div>
      </div>
    </article>
  );
}
