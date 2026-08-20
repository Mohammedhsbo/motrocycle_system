import { useTranslations } from "next-intl";

interface ReservationStatusBadgeProps {
  status: "active" | "converted" | "expired" | "cancelled";
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const t = useTranslations("reservations");

  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border-green-300",
    converted: "bg-blue-100 text-blue-800 border-blue-300",
    expired: "bg-gray-100 text-gray-800 border-gray-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
        statusStyles[status] || statusStyles.active
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
