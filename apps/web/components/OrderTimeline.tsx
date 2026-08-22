import { OrderStatus } from "@motorcycle-system/shared-types";
import clsx from "clsx";
import { useTranslations } from "next-intl";

interface TimelineEvent {
  status: string;
  changedAt: string;
  changedBy: {
    id: string;
    name: string;
  };
  reason?: string;
}

interface OrderTimelineProps {
  statusHistory: TimelineEvent[];
  currentStatus: OrderStatus | string;
}

export function OrderTimeline({ statusHistory, currentStatus }: OrderTimelineProps) {
  const t = useTranslations("order");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return "✓";
      case "processing":
        return "⚙";
      case "awaiting_delivery":
        return "📦";
      case "completed":
        return "✓";
      case "cancelled":
        return "✗";
      case "refunded":
        return "↩";
      default:
        return "•";
    }
  };

  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (status === "cancelled" || status === "refunded") {
      return "border-red-500 bg-red-100 text-red-800";
    }
    if (isCurrent) {
      return "border-blue-500 bg-blue-100 text-blue-800";
    }
    return "border-green-500 bg-green-100 text-green-800";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {statusHistory.map((event, eventIdx) => {
          const isCurrent = event.status === currentStatus;
          const isLast = eventIdx === statusHistory.length - 1;

          return (
            <li key={eventIdx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={clsx(
                        "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white border-2",
                        getStatusColor(event.status, isCurrent)
                      )}
                    >
                      <span className="text-sm font-semibold">
                        {getStatusIcon(event.status)}
                      </span>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {event.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                      {event.reason && (
                        <p className="mt-0.5 text-xs text-gray-500">{event.reason}</p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      <time dateTime={event.changedAt}>{formatDate(event.changedAt)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
