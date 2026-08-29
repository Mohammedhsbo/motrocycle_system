"use client";

import { useRouter, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";

interface Motorcycle {
  id: string;
  vin: string;
  model: string;
  year: number;
  price: number;
  brand: { nameEn: string; nameAr: string };
  image?: string;
}

interface Props {
  motorcycle: Motorcycle;
}

export function BuyNowButton({ motorcycle }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isAr = locale === "ar";
  const { isAuthenticated, isLoading } = useAuth();

  const addToCartAndGo = (type: "purchase" | "installment") => {
    // Guard: redirect guests to login
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}` as never);
      return;
    }

    if (type === "installment") {
      // Go directly to the dedicated installment request page
      router.push(`/installment-request?motorcycleId=${motorcycle.id}` as never);
      return;
    }

    const cartItem = {
      id: motorcycle.id,
      vin: motorcycle.vin,
      model: motorcycle.model,
      year: motorcycle.year,
      price: motorcycle.price,
      brand: motorcycle.brand,
      image: motorcycle.image,
    };
    localStorage.setItem("cart", JSON.stringify([cartItem]));
    router.push(`/checkout?type=${type}` as never);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => addToCartAndGo("installment")}
        className="flex items-center justify-center gap-2 rounded-full border-2 border-blue-600 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50 active:scale-95"
      >
        {/* CreditCard SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        {isAr ? "قسط الآن" : "Installment"}
      </button>
      <button
        onClick={() => addToCartAndGo("purchase")}
        className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 shadow-md active:scale-95"
      >
        {/* ShoppingBag SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        {isAr ? "اشتري الآن" : "Buy Now"}
      </button>
    </div>
  );
}
