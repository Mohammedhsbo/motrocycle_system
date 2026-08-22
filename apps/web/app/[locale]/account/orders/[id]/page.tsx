"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import type { OrderStatus } from "@motorcycle-system/shared-types";
import { io, Socket } from "socket.io-client";

interface OrderItemWithMotorcycle {
  id: string;
  motorcycle: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string | null;
    brand: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    currentStatus: string;
  };
  unitPrice: number;
  discount: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    defaultAddress?: {
      addressLine: string;
      city?: string;
    } | null;
  };
  branch: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  user: {
    id: string;
    name: string;
  };
  status: OrderStatus;
  items: OrderItemWithMotorcycle[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  notes?: string | null;
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

export default function OrderDetailPage() {
  const t = useTranslations("order");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/account/orders");
      return;
    }

    if (user && isAuthenticated && orderId) {
      fetchOrder();
      setupWebSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, isAuthenticated, authLoading, orderId, router]);

  const setupWebSocket = () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";
    const newSocket = io(wsUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
    });

    newSocket.on("order:status_changed", (data: any) => {
      console.log("Order status changed:", data);
      if (data.orderId === orderId) {
        // Refresh order data
        fetchOrder();
      }
    });

    newSocket.on("order:cancelled", (data: any) => {
      console.log("Order cancelled:", data);
      if (data.orderId === orderId) {
        fetchOrder();
      }
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    setSocket(newSocket);
  };

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const orderData = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
      setOrder(orderData);
    } catch (err) {
      console.error("Error fetching order:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setIsCancelling(true);
      setError(null);

      await apiClient.post(`/orders/${orderId}/cancel`, {
        reason: "Customer requested cancellation",
      });

      // Refresh order data
      await fetchOrder();
    } catch (err) {
      console.error("Error cancelling order:", err);
      if (err instanceof ApiError) {
        if (err.code === "ORDER_CANNOT_BE_CANCELLED") {
          setError("This order cannot be cancelled at its current status.");
        } else if (err.code === "FORBIDDEN") {
          setError("You can only cancel orders that are in 'confirmed' status.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to cancel order. Please try again.");
      }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount);
  };

  const canCancelOrder = (status: OrderStatus) => {
    return status === "confirmed";
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

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent>
              <p className="text-center text-gray-600 py-8">Order not found</p>
              <div className="text-center">
                <Button onClick={() => router.push("/account/orders")}>
                  Back to Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/account/orders")}
            className="mb-4 text-sm"
          >
            ← Back to Orders
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order {order.orderNumber}
              </h1>
              <p className="text-sm text-gray-600">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <OrderStatusBadge status={order.status} className="text-sm px-3 py-1" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 py-4 border-b border-gray-200 last:border-0"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.motorcycle.brand.nameEn} {item.motorcycle.model}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.motorcycle.year}
                          {item.motorcycle.color && ` • ${item.motorcycle.color}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          VIN: {item.motorcycle.vin}
                        </p>
                        <p className="text-xs text-gray-500">
                          Current Status: {item.motorcycle.currentStatus}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </p>
                        {item.discount > 0 && (
                          <p className="text-xs text-gray-500">
                            -{formatCurrency(item.discount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer & Delivery */}
            <Card>
              <CardHeader>
                <CardTitle>Customer & Delivery Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.customer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.customer.phone}</dd>
                  </div>
                  {order.customer.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order.customer.email}</dd>
                    </div>
                  )}
                  {order.customer.defaultAddress && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Delivery Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {order.customer.defaultAddress.addressLine}
                        {order.customer.defaultAddress.city && (
                          <span>, {order.customer.defaultAddress.city}</span>
                        )}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Branch</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.branch.nameEn}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline
                  statusHistory={order.statusHistory}
                  currentStatus={order.status}
                />
              </CardContent>
            </Card>

            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(order.discount)}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-base font-bold text-gray-900">
                        {formatCurrency(order.netAmount)}
                      </span>
                    </div>
                  </div>

                  {canCancelOrder(order.status) && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isCancelling ? "Cancelling..." : "Cancel Order"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        You can cancel this order before it's processed
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
