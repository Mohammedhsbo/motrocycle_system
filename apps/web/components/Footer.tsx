import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className="mt-auto bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3 text-xl font-black">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-zinc-950">M</span>
            {t("brandName")}
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
            {t("tagline")}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">{t("explore")}</h2>
          <div className="mt-4 grid gap-2 text-sm text-zinc-400">
            <Link href="/motorcycles" className="hover:text-white">{tNav("motorcycles")}</Link>
            <Link href="/account/reservations" className="hover:text-white">{t("reservations")}</Link>
            <Link href="/account/orders" className="hover:text-white">{t("orders")}</Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">{t("dealership")}</h2>
          <div className="mt-4 grid gap-2 text-sm text-zinc-400">
            <span>{t("flexibleReservations")}</span>
            <span>{t("branchAvailability")}</span>
            <span>{t("customerSupport")}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-sm text-zinc-500 sm:px-6 lg:px-8">
          {t("rights", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
