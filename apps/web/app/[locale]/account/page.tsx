"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { UserRound, ShoppingBag, CreditCard, CalendarDays, ArrowUpRight } from "lucide-react";

export default function AccountPage() {
  const t = useTranslations("account");
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login?redirect=/account");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="section-shell py-16 min-h-screen flex items-center justify-center"><p className="text-center text-zinc-500">{t("loading")}</p></div>;
  }

  const destinations = [
    { href: "/account/profile", label: t("profile"), description: t("profileDescription"), icon: UserRound },
    { href: "/account/orders", label: t("orders"), description: t("ordersDescription"), icon: ShoppingBag },
    { href: "/account/financing", label: t("financing"), description: t("financingDescription"), icon: CreditCard },
    { href: "/account/reservations", label: t("reservations"), description: t("reservationsDescription"), icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col" dir="auto">
      <section className="bg-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/pattern.svg')] bg-repeat"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-800 to-transparent mix-blend-multiply pointer-events-none"></div>
        <div className="section-shell py-16 sm:py-24 relative z-10 flex flex-col items-center text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">{t("eyebrow")}</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl drop-shadow-sm">{t("title")}</h1>
          <p className="mt-5 text-xl font-medium text-blue-100 max-w-2xl">{user?.name ?? t("customer")}</p>
        </div>
      </section>
      
      <section className="section-shell flex-1 py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
          {destinations.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="group flex min-h-40 items-center justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5">
              <div className="flex items-center gap-5">
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100"><Icon size={26} strokeWidth={2.5} /></span>
                <span>
                  <strong className="block text-xl font-bold text-zinc-900 transition-colors group-hover:text-blue-900">{label}</strong>
                  <span className="mt-1.5 block text-sm text-zinc-500 font-medium">{description}</span>
                </span>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-50 transition-colors group-hover:bg-blue-50">
                <ArrowUpRight className="shrink-0 text-zinc-400 transition-all duration-300 group-hover:text-blue-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={20} strokeWidth={2.5} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
