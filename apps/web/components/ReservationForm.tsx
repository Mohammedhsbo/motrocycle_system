"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";

interface Motorcycle {
  id: string;
  vin: string;
  model: string;
  year: number;
  price: number;
  reservationDepositAmount?: number | null;
  reservationDepositPercentage?: number | null;
  brand: {
    nameAr: string;
    nameEn: string;
  };
  images?: string[];
}

interface ReservationFormProps {
  motorcycle: Motorcycle;
  customerId: string;
  onSubmit: (data: { paidAmount: number; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
  defaultDepositAmount?: number | null;
  defaultDepositPercentage?: number | null;
}

export function ReservationForm({
  motorcycle,
  customerId,
  onSubmit,
  isSubmitting,
  defaultDepositAmount,
  defaultDepositPercentage,
}: ReservationFormProps) {
  const t = useTranslations("reservations");
  const tCommon = useTranslations("common");

  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Calculate minimum deposit using motorcycle-specific config or Settings fallback
  const depositAmount = motorcycle.reservationDepositAmount ?? defaultDepositAmount;
  const depositPercentage = motorcycle.reservationDepositPercentage ?? defaultDepositPercentage;

  let minDeposit = 0;
  let hasConfiguredDeposit = false;

  if (depositAmount) {
    minDeposit = depositAmount;
    hasConfiguredDeposit = true;
  } else if (depositPercentage) {
    minDeposit = (motorcycle.price * depositPercentage) / 100;
    hasConfiguredDeposit = true;
  }
  // If neither amount nor percentage is configured, minDeposit stays 0 and user enters manually

  const remainingAmount = paidAmount
    ? motorcycle.price - parseFloat(paidAmount)
    : motorcycle.price;

  const validateDeposit = (amount: string): string | null => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return t("errors.depositMustBePositive");
    }

    if (hasConfiguredDeposit && numAmount < minDeposit) {
      return t("errors.depositTooLow", {
        amount: minDeposit.toLocaleString(),
      });
    }

    if (numAmount > motorcycle.price) {
      return t("errors.depositTooHigh");
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateDeposit(paidAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!agreedToTerms) {
      setError(t("errors.mustAgreeToTerms"));
      return;
    }

    try {
      await onSubmit({
        paidAmount: parseFloat(paidAmount),
        notes: notes.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || t("errors.createFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Motorcycle Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("motorcycleDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {motorcycle.images && motorcycle.images[0] && (
              <img
                src={motorcycle.images[0]}
                alt={motorcycle.model}
                className="w-32 h-32 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {motorcycle.brand.nameEn} {motorcycle.model}
              </h3>
              <p className="text-gray-600">{t("year")}: {motorcycle.year}</p>
              <p className="text-gray-600">VIN: {motorcycle.vin}</p>
              <p className="text-2xl font-bold text-primary mt-2">
                {motorcycle.price.toLocaleString()} {t("currency")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Amount */}
      <Card>
        <CardHeader>
          <CardTitle>{t("depositAmount")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("depositLabel")} <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min={minDeposit}
              max={motorcycle.price}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder={t("depositPlaceholder")}
              required
            />
            {hasConfiguredDeposit ? (
              <p className="text-sm text-gray-600 mt-2">
                {t("minimumDeposit", {
                  amount: minDeposit.toLocaleString(),
                })}
              </p>
            ) : (
              <p className="text-sm text-amber-600 mt-2">
                لم يتم تحديد حد أدنى للحجز — الرجاء إدخال مبلغ الحجز المطلوب (يجب أن يكون أقل من السعر الإجمالي).
              </p>
            )}
          </div>

          {paidAmount && !validateDeposit(paidAmount) && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("totalPrice")}:</span>
                <span className="font-medium">
                  {motorcycle.price.toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("depositAmount")}:</span>
                <span className="font-medium text-green-600">
                  {parseFloat(paidAmount).toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600 font-medium">
                  {t("remainingAmount")}:
                </span>
                <span className="font-bold">
                  {remainingAmount.toLocaleString()} {t("currency")}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("notesLabel")} ({tCommon("optional")})
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t("notesPlaceholder")}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms and Expiration Notice */}
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    {t("importantNotice")}
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>{t("notice.expires7Days")}</li>
                    <li>{t("notice.mustCompletePayment")}</li>
                    <li>{t("notice.motorcycleReserved")}</li>
                    <li>إلغاء الحجز يخصم 300 جنيه مصري من المبلغ المدفوع.</li>
                    <li>{t("notice.depositNonRefundable")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                {t("agreeToTerms")}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || !agreedToTerms}
          className="flex-1"
        >
          {isSubmitting ? t("creating") : t("confirmReservation")}
        </Button>
      </div>
    </form>
  );
}
