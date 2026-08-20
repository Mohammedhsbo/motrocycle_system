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
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <aside className="md:col-span-1">
        <AccountNav />
      </aside>
      <div className="md:col-span-3">
        {children}
      </div>
    </div>
  );
}

function AccountNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  
  const navItems = [
    { href: "/account/profile", label: t("profile") },
    { href: "/account/addresses", label: t("addresses") },
    { href: "/account/orders", label: "My Orders" },
    { href: "/account/letters", label: "My Letters" },
    { href: "/account/reservations", label: "My Reservations" },
    { href: "/account/financing", label: "My Financing" },
    { href: "/account/change-password", label: t("changePassword") },
  ];

  return (
    <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "block px-4 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-100"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
