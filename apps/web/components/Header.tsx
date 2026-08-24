"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./Button";

export function Header() {
  const t = useTranslations("header");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    window.location.href = `/${newLocale}`;
  };

  const localeToggleLabel = locale === "ar" ? t("switchToEnglish") : t("switchToArabic");

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <header suppressHydrationWarning className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-xl font-black tracking-tight text-zinc-950">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-zinc-950 text-white">M</span>
            <span>{t("brandName")}</span>
          </Link>

          <nav className="hidden md:flex">
            <ul className="flex items-center gap-7">
              <li><Link href="/" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{tCommon("home")}</Link></li>
              <li><Link href="/motorcycles" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{tNav("motorcycles")}</Link></li>
              <li><Link href="/account/financing" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{t("financing")}</Link></li>
              <li><Link href="/contact" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{tNav("contact")}</Link></li>
              {isAuthenticated && (
                <li><Link href="/account" className="text-sm font-medium text-zinc-700 transition hover:text-red-700">{tNav("account")}</Link></li>
              )}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/motorcycles" aria-label={t("searchInventory")} className="hidden rounded-full border border-zinc-200 p-2 text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950 sm:block">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </Link>

            <Link href="/cart" aria-label={t("viewCart")} className="hidden rounded-full border border-zinc-200 p-2 text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950 sm:block">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </Link>

            <button onClick={toggleLocale} className="text-sm font-semibold text-zinc-700 transition hover:text-red-700" aria-label={localeToggleLabel}>
              {localeToggleLabel}
            </button>

            {isAuthenticated ? (
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center rounded-full border border-zinc-200 p-2 text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
                  aria-label={t("userMenu")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      {tNav("account")}
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="block w-full px-4 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      {tNav("logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login"><Button variant="outline" size="sm">{tNav("login")}</Button></Link>
                <Link href="/register"><Button size="sm">{tNav("register")}</Button></Link>
              </div>
            )}

            <button className="rounded-md border border-zinc-200 p-2 md:hidden" onClick={() => setOpen((value) => !value)} aria-label={t("toggleMenu")}>
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
            <Link onClick={() => setOpen(false)} href="/" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{tCommon("home")}</Link>
            <Link onClick={() => setOpen(false)} href="/motorcycles" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{tNav("motorcycles")}</Link>
            <Link onClick={() => setOpen(false)} href="/account/financing" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{t("financing")}</Link>
            <Link onClick={() => setOpen(false)} href="/contact" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{tNav("contact")}</Link>
            {isAuthenticated ? (
              <Link onClick={() => setOpen(false)} href="/account" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{tNav("account")}</Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/login"><Button variant="outline" size="sm" className="w-full">{tNav("login")}</Button></Link>
                <Link href="/register"><Button size="sm" className="w-full">{tNav("register")}</Button></Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
