"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Check if we are on the home page (e.g., "/", "/ar", "/en")
  const isHome = pathname === "/" || pathname === `/${locale}`;

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

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  // Get user initials for the avatar
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header
      suppressHydrationWarning
      className={`z-50 w-full transition-colors duration-300 ${
        isHome
          ? "absolute top-0 left-0 right-0 border-b border-white/10 bg-transparent"
          : "sticky top-0 bg-blue-900 shadow-md"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          <Link href="/" className="flex items-center shrink-0 transition-transform hover:scale-105">
            <img src="/logo.png" alt={t("brandName")} className="h-10 sm:h-12 lg:h-14 w-auto object-contain brightness-0 invert drop-shadow-sm" />
          </Link>

          <nav className="hidden md:flex flex-1 justify-center">
            <ul className="flex items-center gap-6 lg:gap-10">
              <li><Link href="/" className="text-base font-bold text-white transition hover:text-white/80">{tCommon("home")}</Link></li>
              <li><Link href="/motorcycles" className="text-base font-bold text-white transition hover:text-white/80">{tNav("motorcycles")}</Link></li>
              <li><Link href="/motorcycles" className="text-base font-bold text-white transition hover:text-white/80">{tNav("brands")}</Link></li>
              <li><Link href="/articles" className="text-base font-bold text-white transition hover:text-white/80">{tNav("articles")}</Link></li>
              <li><Link href="/contact" className="text-base font-bold text-white transition hover:text-white/80">{tNav("contact")}</Link></li>
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm font-black">
              <button onClick={() => window.location.href = '/ar'} className={`transition tracking-widest ${locale === 'ar' ? 'text-white' : 'text-white/50 hover:text-white'}`}>AR</button>
              <span className="text-white/30">|</span>
              <button onClick={() => window.location.href = '/en'} className={`transition tracking-widest ${locale === 'en' ? 'text-white' : 'text-white/50 hover:text-white'}`}>EN</button>
            </div>

            {/* User Account Icon — Desktop */}
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                id="user-menu-button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label={tNav("account")}
                aria-expanded={userMenuOpen}
                className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40 overflow-hidden"
              >
                {isAuthenticated && user ? (
                  <span className="text-white text-xs font-bold leading-none">{userInitials}</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                )}
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div
                  className="absolute end-0 mt-2 w-52 rounded-xl border border-white/10 bg-blue-950/95 backdrop-blur-xl shadow-2xl shadow-black/40 py-1 z-50 animate-[fadeInDown_0.15s_ease-out]"
                  style={{ animation: "fadeInDown 0.15s ease-out" }}
                >
                  {isAuthenticated ? (
                    <>
                      {user?.name && (
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-xs text-white/50 font-medium">{tNav("account")}</p>
                          <p className="text-sm text-white font-semibold truncate">{user.name}</p>
                        </div>
                      )}
                      <Link
                        href="/account/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        {tNav("profile")}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        {tNav("logout")}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                          <polyline points="10 17 15 12 10 7" />
                          <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                        {tNav("login")}
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                        {tNav("register")}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button className="rounded-md border border-white/20 p-2 text-white md:hidden hover:bg-white/10 transition" onClick={() => setOpen((value) => !value)} aria-label={t("toggleMenu")}>
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
            <Link onClick={() => setOpen(false)} href="/branches" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{tNav("branches")}</Link>
            <Link onClick={() => setOpen(false)} href="/contact" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">{tNav("contact")}</Link>
            
            <div className="border-t pt-2 mt-1">
              {isAuthenticated ? (
                <>
                  <Link onClick={() => setOpen(false)} href="/account/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    {tNav("account")}
                  </Link>
                  <button
                    onClick={() => { setOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {tNav("logout")}
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login"><Button variant="outline" size="sm" className="w-full">{tNav("login")}</Button></Link>
                  <Link href="/register"><Button size="sm" className="w-full">{tNav("register")}</Button></Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
