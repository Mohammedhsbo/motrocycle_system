"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { getStoreSettings } from "@/lib/financing-api";
import { ReservationForm } from "@/components/ReservationForm";
import { Button } from "@/components/Button";

interface Motorcycle {
  id: string;
  vin: string;
  model: string;
  year: number;
  color?: string;
  price: number;
  status: string;
  reservationDepositAmount?: number | null;
  reservationDepositPercentage?: number | null;
  brand: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  images?: string[];
}

export default function ReservePage() {
  const t = useTranslations("reservations");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const motorcycleId = params.motorcycleId as string;

  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [settings, setSettings] = useState<{ defaultDepositAmount?: number | null; defaultDepositPercentage?: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/reserve/${motorcycleId}`);
      return;
    }

    if (isAuthenticated) {
      fetchMotorcycle();
    }
  }, [isAuthenticated, authLoading, motorcycleId, router]);

  const fetchMotorcycle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [motoData, settingsData] = await Promise.all([
        apiClient.get<Motorcycle>(`/motorcycles/${motorcycleId}`),
        getStoreSettings().catch(() => null),
      ]);

      setMotorcycle(motoData);
      setSettings(settingsData);

      // Check if motorcycle is available
      if (motoData.status !== "available") {
        setError(t("errors.motorcycleNotAvailable"));
      }
    } catch (err) {
      console.error("Error fetching motorcycle:", err);
      setError(
        err instanceof ApiError ? err.message : t("errors.loadFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: { paidAmount: number; notes?: string }) => {
    if (!user?.id || !motorcycle) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const reservation = await apiClient.post("/reservations", {
        customerId: user.id,
        motorcycleId: motorcycle.id,
        paidAmount: data.paidAmount,
        notes: data.notes,
      });

      // Redirect to reservation detail page
      router.push(`/account/reservations/${(reservation as any).id}`);
    } catch (err) {
      console.error("Error creating reservation:", err);
      
      if (err instanceof ApiError) {
        if (err.code === "MOTORCYCLE_NOT_AVAILABLE") {
          setError(t("errors.motorcycleNotAvailable"));
        } else if (err.code === "MOTORCYCLE_ALREADY_RESERVED") {
          setError(t("errors.motorcycleAlreadyReserved"));
        } else if (err.code === "INVALID_DEPOSIT_AMOUNT") {
          setError(t("errors.invalidDeposit"));
        } else {
          setError(err.message);
        }
      } else {
        setError(t("errors.createFailed"));
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
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

  if (error && !motorcycle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">{tCommon("error")}</p>
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <Button onClick={() => router.back()}>{tCommon("back")}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!motorcycle) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
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
            {tCommon("back")}
          </button>
          <h1 className="text-3xl font-bold">{t("createReservation")}</h1>
          <p className="text-gray-600 mt-2">{t("createSubtitle")}</p>
        </div>

        {error && motorcycle.status === "available" && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {motorcycle.status !== "available" ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">{t("motorcycleUnavailable")}</p>
            <p>{t("motorcycleUnavailableMessage")}</p>
            <div className="mt-4">
              <Button onClick={() => router.push("/motorcycles")}>
                {t("browsMotorcycles")}
              </Button>
            </div>
          </div>
        ) : (
          <ReservationForm
            motorcycle={motorcycle}
            customerId={user!.id}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            defaultDepositAmount={settings?.defaultDepositAmount ?? null}
            defaultDepositPercentage={settings?.defaultDepositPercentage ?? null}
          />
        )}
      </div>
    </div>
  );
}
