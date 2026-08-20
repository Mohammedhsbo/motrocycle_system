"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { ExpirationCountdown } from "@/components/ExpirationCountdown";

type ReservationStatus = "active" | "converted" | "expired" | "cancelled";

interface ReservationListItem {
  id: string;
  reservationNumber: string;
  motorcycle: {
    id: string;
    vin: string;
    model: string;
    brand: {
      nameAr: string;
      nameEn: string;
    };
  };
  status: ReservationStatus;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  createdAt: string;
}

export default function ReservationsPage() {
  const t = useTranslations("reservations");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/account/reservations");
      return;
    }

    if (user && isAuthenticated) {
      fetchReservations();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const customerId = user?.id;
      if (!customerId) return;

      const response = await apiClient.get<{
        data: ReservationListItem[];
        meta: any;
      }>(`/customers/${customerId}/reservations?sort=createdAt&order=desc`);

      setReservations(response.data || []);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setError(
        err instanceof ApiError ? err.message : t("errors.loadFailed")
      );
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("myReservations")}</h1>
          <p className="text-gray-600 mt-2">{t("myReservationsSubtitle")}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {reservations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-gray-600 mb-4">{t("noReservations")}</p>
              <Button onClick={() => router.push("/motorcycles")}>
                {t("browseMotorcycles")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <Card
                key={reservation.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() =>
                  router.push(`/account/reservations/${reservation.id}`)
                }
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left section - Main info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {reservation.motorcycle.brand.nameEn}{" "}
                            {reservation.motorcycle.model}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {t("reservationNumber")}:{" "}
                            {reservation.reservationNumber}
                          </p>
                        </div>
                        <ReservationStatusBadge status={reservation.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-600">{t("totalPrice")}</p>
                          <p className="font-semibold">
                            {reservation.totalPrice.toLocaleString()}{" "}
                            {t("currency")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">{t("paidAmount")}</p>
                          <p className="font-semibold text-green-600">
                            {reservation.paidAmount.toLocaleString()}{" "}
                            {t("currency")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">{t("remaining")}</p>
                          <p className="font-semibold">
                            {reservation.remainingAmount.toLocaleString()}{" "}
                            {t("currency")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">{t("createdDate")}</p>
                          <p className="font-medium">
                            {formatDate(reservation.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right section - Expiration */}
                    {reservation.expiresAt && (
                      <div className="lg:w-64">
                        <ExpirationCountdown
                          expiresAt={reservation.expiresAt}
                          status={reservation.status}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/account/reservations/${reservation.id}`);
                      }}
                    >
                      {t("viewDetails")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
