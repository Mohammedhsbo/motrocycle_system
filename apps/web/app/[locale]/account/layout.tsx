"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "@/i18n/routing";
import { ReactNode } from "react";
import clsx from "clsx";

interface AccountLayoutProps {
  children: ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();
  // Bypass the grid layout for the root account page so it can be full-width
  if (pathname === "/account") {
    return <>{children}</>;
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
        <aside className="md:col-span-1">
          <AccountNav />
        </aside>
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// Inline SVG icons to avoid lucide-react hydration mismatches
const IconUser = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>
  </svg>
);

const IconShoppingBag = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconCreditCard = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
  </svg>
);

const IconCalendar = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
  </svg>
);

const IconChevronRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

function AccountNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navItems = [
    { href: "/account/profile", label: t("profile"), Icon: IconUser },
    { href: "/account/orders", label: t("orders"), Icon: IconShoppingBag },
    { href: "/account/financing", label: t("financing"), Icon: IconCreditCard },
    { href: "/account/reservations", label: t("reservations"), Icon: IconCalendar },
  ];

  return (
    <nav className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden">
      <div className="bg-blue-900 px-6 py-5">
        <h2 className="text-white font-bold text-lg tracking-wide">{t("profile") || "My Account"}</h2>
      </div>
      <ul className="p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                  isActive
                    ? "bg-blue-50 text-blue-800 shadow-sm border border-blue-100"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-blue-900 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.Icon
                    className={clsx(
                      "transition-colors duration-200",
                      isActive ? "text-blue-600" : "text-zinc-400 group-hover:text-blue-500"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <IconChevronRight className="text-blue-400 rtl:-scale-x-100" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
