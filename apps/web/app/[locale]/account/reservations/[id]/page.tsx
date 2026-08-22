"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { ExpirationCountdown } from "@/components/ExpirationCountdown";

type ReservationStatus = "active" | "converted" | "expired" | "cancelled";

interface ReservationDetail {
  id: string;
  reservationNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  motorcycle: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    currentStatus: string;
    brand: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
  };
  branch: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  status: ReservationStatus;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  notes?: string;
  convertedOrder?: {
    id: string;
    orderNumber: string;
    status: string;
  };
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy: {
      id: string;
      name: string;
    };
    reason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function ReservationDetailPage() {
  const t = useTranslations("reservations");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reservationId = params.id as string;

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/account/reservations/${reservationId}`);
      return;
    }

    if (isAuthenticated) {
      fetchReservation();
    }
  }, [isAuthenticated, authLoading, reservationId, router]);

  const fetchReservation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiClient.get<ReservationDetail>(
        `/reservations/${reservationId}`
      );
      setReservation(data);
    } catch (err) {
      console.error("Error fetching reservation:", err);
      setError(
        err instanceof ApiError ? err.message : t("errors.loadFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;

    try {
      setIsCancelling(true);
      setError(null);

      await apiClient.post(`/reservations/${reservation.id}/cancel`, {
        reason: cancelReason.trim() || undefined,
      });

      // Refresh reservation data
      await fetchReservation();
      setShowCancelConfirm(false);
      setCancelReason("");
    } catch (err) {
      console.error("Error cancelling reservation:", err);
      setError(
        err instanceof ApiError ? err.message : t("errors.cancelFailed")
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{tCommon("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">{tCommon("error")}</p>
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push("/account/reservations")}>
              {tCommon("back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/account/reservations")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t("backToReservations")}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {t("reservationDetails")}
              </h1>
              <p className="text-gray-600 mt-1">
                {reservation.reservationNumber}
              </p>
            </div>
            <ReservationStatusBadge status={reservation.status} />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Expiration Countdown */}
        {reservation.expiresAt && (
          <div className="mb-6">
            <ExpirationCountdown
              expiresAt={reservation.expiresAt}
              status={reservation.status}
            />
          </div>
        )}

        {/* Motorcycle Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("motorcycleDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {reservation.motorcycle.brand.nameEn}{" "}
                  {reservation.motorcycle.model}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t("year")}:</dt>
                    <dd className="font-medium">{reservation.motorcycle.year}</dd>
                  </div>
                  {reservation.motorcycle.color && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">{t("color")}:</dt>
                      <dd className="font-medium">
                        {reservation.motorcycle.color}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-600">VIN:</dt>
                    <dd className="font-medium font-mono text-xs">
                      {reservation.motorcycle.vin}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t("currentStatus")}:</dt>
                    <dd className="font-medium">
                      {reservation.motorcycle.currentStatus}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">{t("pricingDetails")}</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t("totalPrice")}:</dt>
                    <dd className="font-semibold">
                      {reservation.totalPrice.toLocaleString()} {t("currency")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t("paidAmount")}:</dt>
                    <dd className="font-semibold text-green-600">
                      {reservation.paidAmount.toLocaleString()} {t("currency")}
                    </dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <dt className="text-gray-900 font-semibold">
                      {t("remainingAmount")}:
                    </dt>
                    <dd className="font-bold text-lg">
                      {reservation.remainingAmount.toLocaleString()}{" "}
                      {t("currency")}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {reservation.notes && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                  {t("notes")}:
                </h4>
                <p className="text-gray-600">{reservation.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Converted Order Info */}
        {reservation.convertedOrder && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">
                    {t("convertedToOrder")}
                  </p>
                  <p className="text-sm text-blue-800">
                    {t("orderNumber")}: {reservation.convertedOrder.orderNumber}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/account/orders/${reservation.convertedOrder!.id}`)
                  }
                >
                  {t("viewOrder")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {reservation.status === "active" && (
          <Card className="mb-6">
            <CardContent className="p-4">
              {!showCancelConfirm ? (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    {t("cancelReservation")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-yellow-900 font-semibold mb-2">
                      {t("cancelConfirmTitle")}
                    </p>
                    <p className="text-sm text-yellow-800">
                      {t("cancelConfirmMessage")}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("cancelReason")} ({tCommon("optional")})
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={t("cancelReasonPlaceholder")}
                      maxLength={500}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setCancelReason("");
                      }}
                      disabled={isCancelling}
                    >
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isCancelling ? t("cancelling") : t("confirmCancel")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dates */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("dates")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-600 mb-1">{t("createdDate")}:</dt>
                <dd className="font-medium">{formatDate(reservation.createdAt)}</dd>
              </div>
              {reservation.expiresAt && (
                <div>
                  <dt className="text-gray-600 mb-1">{t("expiresDate")}:</dt>
                  <dd className="font-medium">
                    {formatDate(reservation.expiresAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-600 mb-1">{t("lastUpdated")}:</dt>
                <dd className="font-medium">{formatDate(reservation.updatedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Status History */}
        {reservation.statusHistory && reservation.statusHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("statusHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reservation.statusHistory.map((history, index) => (
                  <div
                    key={index}
                    className="flex gap-4 pb-4 border-b last:border-b-0"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t(`status.${history.status}`)}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(history.changedAt)}
                      </p>
                      {history.reason && (
                        <p className="text-sm text-gray-700 mt-1">
                          {t("reason")}: {history.reason}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {t("by")}: {history.changedBy.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
