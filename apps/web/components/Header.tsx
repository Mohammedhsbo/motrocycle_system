"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./Button";

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    window.location.href = `/${newLocale}`;
  };

  return (
    <header suppressHydrationWarning className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-xl font-black tracking-tight text-zinc-950">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-zinc-950 text-white">M</span>
            <span>MotorCycle</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">Home</Link>
            <Link href="/motorcycles" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{t("nav.motorcycles")}</Link>
            <Link href="/motorcycles?sort=price&order=asc" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">Financing</Link>
            {isAuthenticated && (
              <Link href="/account" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{t("nav.account")}</Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/motorcycles" aria-label="Search inventory" className="hidden rounded-full border border-zinc-200 p-2 text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950 sm:block">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </Link>
            <button onClick={toggleLocale} className="text-sm font-semibold text-zinc-700 transition hover:text-red-700">
              {locale === "ar" ? "EN" : "العربية"}
            </button>

            {isAuthenticated ? (
              <div className="hidden items-center gap-3 sm:flex">
                <Link href="/account" className="hidden items-center gap-2 text-sm font-medium text-zinc-700 md:flex">
                  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {user?.name}
                </Link>
                <Button onClick={() => logout()} variant="outline" size="sm">{t("nav.logout")}</Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login"><Button variant="outline" size="sm">{t("nav.login")}</Button></Link>
                <Link href="/register"><Button size="sm">{t("nav.register")}</Button></Link>
              </div>
            )}

            <button className="rounded-md border border-zinc-200 p-2 md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
              {open ? (
                <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4 grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg md:hidden">
            <Link onClick={() => setOpen(false)} href="/" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">Home</Link>
            <Link onClick={() => setOpen(false)} href="/motorcycles" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{t("nav.motorcycles")}</Link>
            <Link onClick={() => setOpen(false)} href="/motorcycles?sort=price&order=asc" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">Financing</Link>
            {isAuthenticated ? (
              <Link onClick={() => setOpen(false)} href="/account" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{t("nav.account")}</Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/login"><Button variant="outline" size="sm" className="w-full">{t("nav.login")}</Button></Link>
                <Link href="/register"><Button size="sm" className="w-full">{t("nav.register")}</Button></Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
