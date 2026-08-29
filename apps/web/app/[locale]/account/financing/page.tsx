"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface InstallmentRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  motorcyclePrice: number;
  downPayment: number;
  monthlyInstallment: number;
  createdAt: string;
  rejectionReason?: string | null;
  financingCompany: {
    name: string;
  };
  duration: {
    months: number;
  };
  motorcycle: {
    model: string;
    brand: {
      name: string;
    };
  };
}

export default function FinancingPage() {
  const t = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<InstallmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/account/financing");
      return;
    }

    if (user && isAuthenticated) {
      fetchData();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // apiClient.get already unwraps { success, data } → returns data directly
      const data = await apiClient.get<InstallmentRequest[]>("/installment-requests/mine");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching financing requests:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount);
  };

  const statusConfig = {
    pending: { label: "Waiting Approval", icon: Clock, bg: "bg-amber-100", text: "text-amber-800" },
    approved: { label: "Approved", icon: CheckCircle, bg: "bg-green-100", text: "text-green-800" },
    rejected: { label: "Rejected", icon: XCircle, bg: "bg-red-100", text: "text-red-800" },
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <p className="text-zinc-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-zinc-900">My Installment Requests</h1>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-16 bg-zinc-50 rounded-2xl border border-zinc-100">
            <Clock className="mx-auto h-12 w-12 text-zinc-300 mb-3" />
            <p className="text-zinc-500 font-medium">You have no installment requests.</p>
          </div>
        ) : (
          requests.map((request) => {
            const cfg = statusConfig[request.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={request.id}
                className="border border-zinc-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all bg-white"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900">
                      {request.motorcycle?.brand?.name} {request.motorcycle?.model}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      Requested on {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                    <StatusIcon size={14} />
                    {cfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-lg">
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Financing Company</div>
                    <div className="font-semibold text-zinc-900 mt-0.5">{request.financingCompany?.name ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Down Payment</div>
                    <div className="font-semibold text-zinc-900 mt-0.5">
                      {request.downPayment != null ? formatCurrency(request.downPayment) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Monthly Installment</div>
                    <div className="font-semibold text-blue-700 mt-0.5">
                      {request.monthlyInstallment != null ? formatCurrency(request.monthlyInstallment) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Duration</div>
                    <div className="font-semibold text-zinc-900 mt-0.5">{request.duration?.months ?? '-'} Months</div>
                  </div>
                </div>

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <strong>Reason:</strong> {request.rejectionReason}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
