"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface ExpirationCountdownProps {
  expiresAt: string;
  status: string;
}

export function ExpirationCountdown({ expiresAt, status }: ExpirationCountdownProps) {
  const t = useTranslations("reservations");
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining(t("expired"));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(t("expiresInDays", { days }));
      } else if (hours > 0) {
        setTimeRemaining(t("expiresInHours", { hours }));
      } else {
        setTimeRemaining(t("expiresInMinutes", { minutes }));
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt, status, t]);

  if (status !== "active") {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
        isExpired
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-yellow-50 border border-yellow-200 text-yellow-800"
      }`}
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
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-sm font-medium">{timeRemaining}</span>
    </div>
  );
}
