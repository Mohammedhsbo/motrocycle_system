import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className="mt-auto bg-blue-950 text-white relative">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-transparent mix-blend-multiply pointer-events-none"></div>
      
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1.2fr] lg:px-8 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt={t("brandName")} className="h-16 w-auto object-contain brightness-0 invert drop-shadow-sm" />
          </div>
          <p className="mt-6 max-w-sm text-sm leading-6 text-blue-100 font-medium">
            {t("tagline")}
          </p>
          <div className="mt-6 flex gap-4">
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 hover:text-blue-200" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 hover:text-blue-200" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 hover:text-blue-200" aria-label="Twitter">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </a>
          </div>
        </div>
        
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-blue-300">{t("explore")}</h2>
          <div className="mt-5 grid gap-3 text-sm text-blue-100 font-medium">
            <Link href="/motorcycles" className="transition-colors hover:text-white hover:translate-x-1 duration-200 block w-fit">{tNav("motorcycles")}</Link>
            <Link href="/branches" className="transition-colors hover:text-white hover:translate-x-1 duration-200 block w-fit">{tNav("branches")}</Link>
            <Link href="/account/reservations" className="transition-colors hover:text-white hover:translate-x-1 duration-200 block w-fit">{t("reservations")}</Link>
            <Link href="/account/orders" className="transition-colors hover:text-white hover:translate-x-1 duration-200 block w-fit">{t("orders")}</Link>
          </div>
        </div>
        
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-blue-300">{t("dealership") || "Contact & Support"}</h2>
          <div className="mt-5 grid gap-4 text-sm text-blue-100 font-medium">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{t("branchAvailability")}</span>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>{t("customerSupport")}</span>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>{t("flexibleReservations")}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-blue-800/50 relative z-10 bg-blue-950/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-blue-200 sm:flex-row sm:px-6 lg:px-8 font-medium">
          <div>{t("rights", { year: 2024 })}</div>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
