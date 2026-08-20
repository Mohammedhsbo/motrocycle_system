"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";

type FinancingContractStatus = "active" | "completed" | "defaulted" | "cancelled";
type InstallmentStatus = "upcoming" | "due" | "paid" | "overdue";

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
  paidAt?: string;
}

interface FinancingContractDetail {
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
  creator: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
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
  installments: Installment[];
  notes?: string;
}

export default function FinancingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [contract, setContract] = useState<FinancingContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/account/financing");
      return;
    }

    if (user && isAuthenticated && id) {
      fetchContract();
    }
  }, [user, isAuthenticated, authLoading, id, router]);

  const fetchContract = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<FinancingContractDetail>(
        `/financing-contracts/${id}`
      );

      setContract(response);
    } catch (err) {
      console.error("Error fetching contract:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load contract");
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

  const getStatusBadge = (status: FinancingContractStatus | InstallmentStatus) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      defaulted: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      upcoming: "bg-gray-100 text-gray-800",
      due: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
    };

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-800"}`}>
        {t(`status${status.charAt(0).toUpperCase() + status.slice(1)}`) || status}
      </span>
    );
  };

  const remainingBalance = contract?.installments
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.remainingAmount, 0) ?? 0;

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-600">{error || "Contract not found"}</p>
              <Link href="/account/financing" className="mt-4 inline-block">
                <Button variant="outline">{t("backToList")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/account/financing" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToList")}
        </Link>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("contractDetails")}</h1>
            <p className="text-xl text-gray-600">{contract.contractNumber}</p>
          </div>
          {getStatusBadge(contract.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">{t("summary")}</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-600">{t("totalAmount")}</div>
                  <div className="text-xl font-bold">{formatCurrency(contract.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("downPayment")}</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(contract.downPayment)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("financingAmount")}</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(contract.financingAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("remainingBalance")}</div>
                  <div className={`text-xl font-bold ${remainingBalance > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {formatCurrency(remainingBalance)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">{t("terms")}</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-600">{t("numberOfInstallments")}</div>
                  <div className="text-xl font-bold">{contract.numberOfInstallments}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("interestRate")}</div>
                  <div className="text-lg font-semibold">{contract.interestRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("startDate")}</div>
                  <div className="text-lg font-semibold">{formatDate(contract.startDate)}</div>
                </div>
                {contract.completedAt && (
                  <div>
                    <div className="text-xs text-gray-600">{t("completedAt")}</div>
                    <div className="text-lg font-semibold">{formatDate(contract.completedAt)}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">{t("relatedInfo")}</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-600">{t("order")}</div>
                  <div className="text-lg font-semibold">{contract.order.orderNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("branch")}</div>
                  <div className="text-lg font-semibold">{contract.branch.nameEn}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{t("createdAt")}</div>
                  <div className="text-sm">{formatDate(contract.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("installmentSchedule")}</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.installments.length === 0 ? (
              <p className="text-center text-gray-600 py-8">{t("noInstallments")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">#</th>
                      <th className="text-left p-3 text-sm font-semibold">{t("dueDate")}</th>
                      <th className="text-right p-3 text-sm font-semibold">{t("amount")}</th>
                      <th className="text-right p-3 text-sm font-semibold">{t("paidAmount")}</th>
                      <th className="text-right p-3 text-sm font-semibold">{t("remainingAmount")}</th>
                      <th className="text-center p-3 text-sm font-semibold">{t("status")}</th>
                      <th className="text-left p-3 text-sm font-semibold">{t("paidAt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.installments.map((installment) => (
                      <tr key={installment.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold">
                            {installment.installmentNumber}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {formatDate(installment.dueDate)}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(installment.amount)}
                        </td>
                        <td className="p-3 text-right font-semibold text-green-600">
                          {formatCurrency(installment.paidAmount)}
                        </td>
                        <td className={`p-3 text-right font-semibold ${installment.remainingAmount > 0 ? "text-orange-600" : "text-green-600"}`}>
                          {formatCurrency(installment.remainingAmount)}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(installment.status)}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {installment.paidAt ? formatDate(installment.paidAt) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {contract.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{contract.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
