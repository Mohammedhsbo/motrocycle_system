"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";

type FinancingContractStatus = "active" | "completed" | "defaulted" | "cancelled";

interface FinancingContract {
  id: string;
  contractNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
  branch: {
    id: string;
    nameEn: string;
    nameAr: string;
  };
  totalAmount: number;
  downPayment: number;
  financingAmount: number;
  numberOfInstallments: number;
  interestRate: number;
  startDate: string;
  status: FinancingContractStatus;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

interface FinancingSummary {
  activeContracts: number;
  totalFinanced: number;
  totalPaid: number;
  totalRemaining: number;
  nextInstallment: {
    id: string;
    dueDate: string;
    amount: number;
    contractId: string;
  } | null;
  overdueInstallments: number;
  overdueAmount: number;
}

export default function FinancingPage() {
  const t = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [contracts, setContracts] = useState<FinancingContract[]>([]);
  const [summary, setSummary] = useState<FinancingSummary | null>(null);
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

      const customerId = user?.id;
      if (!customerId) return;

      const [contractsResponse, summaryResponse] = await Promise.all([
        apiClient.get<{ data: FinancingContract[]; meta: any }>(
          `/customers/${customerId}/financing-contracts`
        ),
        apiClient.get<FinancingSummary>(`/customers/${customerId}/financing-summary`),
      ]);

      setContracts(contractsResponse.data || []);
      setSummary(summaryResponse);
    } catch (err) {
      console.error("Error fetching financing data:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load financing data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "SAR",
    }).format(amount);
  };

  const getStatusBadge = (status: FinancingContractStatus) => {
    const styles: Record<FinancingContractStatus, string> = {
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      defaulted: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };

    const labels: Record<FinancingContractStatus, string> = {
      active: t("statusActive"),
      completed: t("statusCompleted"),
      defaulted: t("statusDefaulted"),
      cancelled: t("statusCancelled"),
    };

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">{t("activeContracts")}</div>
                <div className="text-2xl font-bold">{summary.activeContracts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">{t("totalFinanced")}</div>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalFinanced)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">{t("totalPaid")}</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">{t("totalRemaining")}</div>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalRemaining)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {summary?.nextInstallment && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t("nextInstallment")}</h3>
                  <p className="text-gray-700">
                    {t("dueDate")}: {formatDate(summary.nextInstallment.dueDate)}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {formatCurrency(summary.nextInstallment.amount)}
                  </p>
                </div>
                <Link href={`/account/financing/${summary.nextInstallment.contractId}`}>
                  <Button variant="primary">{t("viewDetails")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && summary.overdueInstallments > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-red-800">{t("overdueTitle")}</h3>
                  <p className="text-red-700">
                    {t("overdueMessage", { count: summary.overdueInstallments })}
                  </p>
                  <p className="text-xl font-bold text-red-600 mt-2">
                    {formatCurrency(summary.overdueAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("myContracts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-center text-gray-600 py-8">{t("noContracts")}</p>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{contract.contractNumber}</h3>
                        <p className="text-sm text-gray-600">
                          {t("order")}: {contract.order.orderNumber}
                        </p>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-600">{t("totalAmount")}</div>
                        <div className="font-semibold">{formatCurrency(contract.totalAmount)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">{t("downPayment")}</div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(contract.downPayment)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">{t("financingAmount")}</div>
                        <div className="font-semibold text-blue-600">
                          {formatCurrency(contract.financingAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">{t("installments")}</div>
                        <div className="font-semibold">{contract.numberOfInstallments}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        {t("startDate")}: {formatDate(contract.startDate)}
                      </div>
                      <Link href={`/account/financing/${contract.id}`}>
                        <Button variant="outline" size="sm">
                          {t("viewDetails")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
