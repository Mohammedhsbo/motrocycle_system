"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { CheckCircle2, Clock3, CreditCard, RefreshCw, XCircle } from "lucide-react";

interface InstallmentRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  motorcyclePrice: number;
  downPayment: number;
  monthlyInstallment: number;
  createdAt: string;
  rejectionReason?: string | null;
  financingCompany?: { name: string };
  duration?: { months: number };
  motorcycle?: { model: string; brand?: { name: string } };
}

export default function FinancingPage() {
  const t = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<InstallmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true); setError(null);
      const data = await apiClient.get<InstallmentRequest[]>("/installment-requests/mine");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) { setError(err instanceof ApiError ? err.message : t("loadError")); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login?redirect=/account/financing"); else if (user && isAuthenticated) void fetchData(); }, [user, isAuthenticated, authLoading, router]);

  const formatDate = (value: string) => new Intl.DateTimeFormat("en-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  const formatCurrency = (value: number) => new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
  const status = {
    pending: { label: t("statusPending"), icon: Clock3, tone: "text-amber-700 bg-amber-50 border-amber-200" },
    approved: { label: t("statusApproved"), icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    rejected: { label: t("statusRejected"), icon: XCircle, tone: "text-red-700 bg-red-50 border-red-200" },
  };
  const counts = { total: requests.length, approved: requests.filter(r => r.status === "approved").length, pending: requests.filter(r => r.status === "pending").length, rejected: requests.filter(r => r.status === "rejected").length };

  if (authLoading || isLoading) return <div className="flex min-h-[420px] items-center justify-center"><p className="text-sm text-slate-500">{tCommon("loading")}</p></div>;

  return <div className="space-y-7" dir="auto">
    <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-10"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-blue-500/20" /><div className="relative max-w-2xl"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"><CreditCard size={15} /> {t("pageEyebrow")}</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{t("pageDescription")}</p></div></header>
    {error && <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => void fetchData()} className="inline-flex shrink-0 items-center gap-2 font-bold text-red-700"><RefreshCw size={15} /> {t("retry")}</button></div>}
    <div className="grid gap-3 sm:grid-cols-4">{[[t("requestCount", { count: counts.total }), "bg-blue-50 text-blue-700"], [t("approvedCount", { count: counts.approved }), "bg-emerald-50 text-emerald-700"], [t("pendingCount", { count: counts.pending }), "bg-amber-50 text-amber-700"], [t("rejectedCount", { count: counts.rejected }), "bg-red-50 text-red-700"]].map(([label, tone]) => <div key={label} className={`rounded-2xl border border-slate-100 p-4 ${tone}`}><p className="text-sm font-bold">{label}</p></div>)}</div>
    {requests.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"><Clock3 className="mx-auto mb-4 text-slate-300" size={42} /><h2 className="text-lg font-bold text-slate-800">{t("noRequestsTitle")}</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t("noRequestsDescription")}</p><button onClick={() => router.push("/motorcycles")} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800">{t("browseMotorcycles")}</button></div> : <div className="grid gap-4">{requests.map(request => { const config = status[request.status]; const Icon = config.icon; return <article key={request.id} className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t("requestNumber")} · {request.id.slice(0, 8)}</p><h2 className="mt-2 text-xl font-black text-slate-900">{request.motorcycle?.brand?.name} {request.motorcycle?.model}</h2><p className="mt-1 text-sm text-slate-500">{t("requestedOn")} {formatDate(request.createdAt)}</p></div><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${config.tone}`}><Icon size={14} />{config.label}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("order")}</p><p className="mt-1 font-bold text-slate-900">{request.financingCompany?.name ?? "-"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("downPayment")}</p><p className="mt-1 font-bold text-slate-900">{formatCurrency(request.downPayment)}</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-700">{t("monthlyInstallment")}</p><p className="mt-1 font-black text-blue-800">{formatCurrency(request.monthlyInstallment)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("duration")}</p><p className="mt-1 font-bold text-slate-900">{request.duration?.months ?? "-"}</p></div></div>{request.status === "rejected" && request.rejectionReason && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><strong>{t("reason")}:</strong> {request.rejectionReason}</p>}</article>; })}</div>}
  </div>;
}
