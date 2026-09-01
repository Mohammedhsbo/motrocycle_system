"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { ArrowUpRight, PackageOpen, RefreshCw, ShoppingBag } from "lucide-react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { OrderStatus } from "@motorcycle-system/shared-types";

interface OrderListItem { id: string; orderNumber: string; branch: { nameAr: string; nameEn: string }; status: OrderStatus; itemCount: number; totalAmount: number; discount: number; netAmount: number; createdAt: string; }

export default function OrdersPage() {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => { if (!user?.id) return; try { setIsLoading(true); setError(null); setOrders(await apiClient.get<OrderListItem[]>(`/customers/${user.id}/orders?sort=createdAt&order=desc`) || []); } catch (err) { setError(err instanceof ApiError ? err.message : t("loadError")); } finally { setIsLoading(false); } };
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login?redirect=/account/orders"); else if (user && isAuthenticated) void fetchOrders(); }, [user, isAuthenticated, authLoading, router]);

  const formatDate = (value: string) => new Intl.DateTimeFormat("en-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  const formatCurrency = (value: number) => new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
  const completed = orders.filter(order => order.status === "completed").length;
  const active = orders.length - completed;
  const total = orders.reduce((sum, order) => sum + order.netAmount, 0);

  if (authLoading || isLoading) return <div className="flex min-h-[420px] items-center justify-center"><p className="text-sm text-slate-500">{tCommon("loading")}</p></div>;

  return <div className="space-y-7" dir="auto">
    <header className="relative overflow-hidden rounded-[2rem] bg-blue-700 px-6 py-8 text-white shadow-xl shadow-blue-900/15 sm:px-9 sm:py-10"><div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full border-[28px] border-white/10" /><div className="relative"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-100"><ShoppingBag size={15} /> {t("eyebrow")}</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">{t("description")}</p></div></header>
  {error && <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => void fetchOrders()} className="inline-flex shrink-0 items-center gap-2 font-bold text-red-700"><RefreshCw size={15} /> {t("retry")}</button></div>}
  <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-700">{t("orderCount", { count: orders.length })}</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-700">{t("completedCount", { count: completed })}</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-700">{t("activeCount", { count: active })}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-bold text-blue-700">{t("totalSpent")}</p><p className="mt-1 text-lg font-black text-blue-900">{formatCurrency(total)}</p></div></div>
  {orders.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"><PackageOpen className="mx-auto mb-4 text-slate-300" size={44} /><h2 className="text-lg font-bold text-slate-800">{t("noOrdersTitle")}</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t("noOrdersDescription")}</p><button onClick={() => router.push("/motorcycles")} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800">{t("browseMotorcycles")}</button></div> : <div className="grid gap-4">{orders.map(order => <article key={order.id} onClick={() => router.push(`/account/orders/${order.id}`)} className="group cursor-pointer rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t("orderNumber")}</p><h2 className="mt-2 text-xl font-black text-slate-900">{order.orderNumber}</h2><p className="mt-1 text-sm text-slate-500">{t("orderedOn")} {formatDate(order.createdAt)}</p></div><OrderStatusBadge status={order.status} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("items")}</p><p className="mt-1 font-bold text-slate-900">{order.itemCount} {order.itemCount === 1 ? t("item") : t("items")}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("branch")}</p><p className="mt-1 font-bold text-slate-900">{order.branch.nameAr}</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-700">{t("totalSpent")}</p><p className="mt-1 font-black text-blue-800">{formatCurrency(order.netAmount)}</p></div></div><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition group-hover:gap-3">{t("viewOrder")} <ArrowUpRight size={16} /></span></article>)}</div>}
  </div>;
}
