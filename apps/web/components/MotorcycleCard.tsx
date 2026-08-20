import { Link } from "@/i18n/routing";
import { displayName, formatCurrency, normalizeImages, type Motorcycle } from "@/lib/catalog-api";
import { Gauge, MapPin, ShieldCheck } from "lucide-react";
import { MotorcycleVisual } from "./MotorcycleVisual";

interface MotorcycleCardProps {
  motorcycle: Motorcycle;
  locale: string;
  priority?: boolean;
}

export function MotorcycleCard({ motorcycle, locale, priority }: MotorcycleCardProps) {
  const images = normalizeImages(motorcycle.images);
  const title = `${displayName(motorcycle.brand, locale)} ${motorcycle.model}`;

  return (
    <article className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/motorcycles/${motorcycle.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          <MotorcycleVisual src={images[0]} alt={title} priority={priority} className="transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm">
            In Stock
          </div>
        </div>
      </Link>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">{displayName(motorcycle.brand, locale)}</p>
          <Link href={`/motorcycles/${motorcycle.id}`} className="mt-1 block text-xl font-semibold text-zinc-950 transition hover:text-red-700">
            {motorcycle.model}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600">
          <span className="flex items-center gap-1"><Gauge size={14} />{motorcycle.engineSize ?? "Engine"}</span>
          <span>{motorcycle.year}</span>
          <span>{motorcycle.color ?? "Color"}</span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs text-zinc-500">Price</p>
            <p className="text-lg font-bold text-zinc-950">{formatCurrency(motorcycle.price)}</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p className="inline-flex items-center gap-1"><MapPin size={13} />{displayName(motorcycle.branch, locale)}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-emerald-700"><ShieldCheck size={13} />Verified</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/motorcycles/${motorcycle.id}`} className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-semibold text-zinc-900 transition hover:border-zinc-900">
            View Details
          </Link>
          <Link href={`/reserve/${motorcycle.id}`} className="rounded-md bg-zinc-950 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-red-700">
            Reserve Now
          </Link>
        </div>
      </div>
    </article>
  );
}
