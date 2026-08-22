"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import type { CustomerDetailResponse, CreateOrderResponse } from "@motorcycle-system/shared-types";

interface CartItem {
  id: string;
  vin: string;
  model: string;
  year: number;
  price: number;
  brand: {
    nameEn: string;
    nameAr: string;
  };
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/checkout");
      return;
    }

    if (user && isAuthenticated) {
      loadCheckoutData();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const loadCheckoutData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load customer data
      const customerId = user?.id;
      if (!customerId) return;

      const customerData = await apiClient.get<CustomerDetailResponse>(`/customers/${customerId}`);
      setCustomer(customerData);

      // Load cart items from localStorage
      const cartData = localStorage.getItem("cart");
      if (cartData) {
        const cart = JSON.parse(cartData);
        setCartItems(cart);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error("Error loading checkout data:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load checkout data");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!customer || cartItems.length === 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const motorcycleIds = cartItems.map((item) => item.id);

      const order = await apiClient.post<CreateOrderResponse>("/orders", {
        customerId: customer.id,
        motorcycleIds,
        discount: 0,
        isDraft: false,
      });

      // Clear cart
      localStorage.removeItem("cart");

      // Redirect to order confirmation
      router.push(`/account/orders/${order.id}`);
    } catch (err) {
      console.error("Error creating order:", err);
      if (err instanceof ApiError) {
        if (err.code === "MOTORCYCLE_NOT_AVAILABLE") {
          setError("One or more motorcycles are no longer available. Please review your cart.");
          // Refresh cart to remove unavailable items
          await loadCheckoutData();
        } else if (err.code === "MOTORCYCLE_WRONG_BRANCH") {
          setError("Motorcycles must be from the same branch.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to place order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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

  if (!customer || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent>
              <p className="text-center text-gray-600 py-8">
                {cartItems.length === 0 ? "Your cart is empty" : "Unable to load customer data"}
              </p>
              <div className="text-center">
                <Button onClick={() => router.push("/motorcycles")}>
                  Browse Motorcycles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
  const defaultAddress = customer.addresses.find((addr) => addr.isDefault);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd>
                  </div>
                  {customer.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{customer.email}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {defaultAddress && (
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-900">{defaultAddress.addressLine}</p>
                  {defaultAddress.city && (
                    <p className="text-sm text-gray-600 mt-1">{defaultAddress.city}</p>
                  )}
                  {defaultAddress.postalCode && (
                    <p className="text-sm text-gray-600">{defaultAddress.postalCode}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-4 border-b border-gray-200 last:border-0"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.brand.nameEn} {item.model}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {item.year} • VIN: {item.vin}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat("en-EG", {
                          style: "currency",
                          currency: "EGP",
                        }).format(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Total */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {new Intl.NumberFormat("en-EG", {
                        style: "currency",
                        currency: "EGP",
                      }).format(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-gray-900">EGP 0.00</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-base font-bold text-gray-900">
                        {new Intl.NumberFormat("en-EG", {
                          style: "currency",
                          currency: "EGP",
                        }).format(totalAmount)}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full mt-6"
                  >
                    {isSubmitting ? "Placing Order..." : "Place Order"}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-4">
                    By placing this order, you agree to our terms and conditions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
