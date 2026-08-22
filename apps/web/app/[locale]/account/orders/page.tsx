"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { OrderStatus } from "@motorcycle-system/shared-types";

interface OrderListItem {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  branch: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  status: OrderStatus;
  itemCount: number;
  totalAmount: number;
  discount: number;
  netAmount: number;
  createdAt: string;
}

export default function OrdersPage() {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/account/orders");
      return;
    }

    if (user && isAuthenticated) {
      fetchOrders();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const customerId = user?.id;
      if (!customerId) return;

      const response = await apiClient.get<{ data: OrderListItem[]; meta: any }>(
        `/customers/${customerId}/orders?sort=createdAt&order=desc`
      );

      setOrders(response.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load orders");
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

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                <Button onClick={() => router.push("/motorcycles")}>
                  Browse Motorcycles
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => router.push(`/account/orders/${order.id}`)}
                className="cursor-pointer"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {order.orderNumber}
                          </h3>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                          </p>
                          <p>Ordered on {formatDate(order.createdAt)}</p>
                          <p>Branch: {order.branch.nameEn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.netAmount)}
                        </p>
                        {order.discount > 0 && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatCurrency(order.totalAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
