"use client";

import { useEffect, useState } from "react";
import { type Address, type CreateAddressDto, type UpdateAddressDto } from "@motorcycle-system/shared-types";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { AddressForm } from "@/components/AddressForm";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";

export default function AddressesPage() {
  const t = useTranslations("customer.addresses");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user && isAuthenticated) {
      fetchAddresses();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const customerId = user?.id;
      if (!customerId) return;

      const data = await apiClient.get<Address[]>(`/customers/${customerId}/addresses`);
      setAddresses(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(tCommon("error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async (data: CreateAddressDto) => {
    const customerId = user?.id;
    if (!customerId) return;

    try {
      setIsSubmitting(true);
      await apiClient.post(`/customers/${customerId}/addresses`, data);
      await fetchAddresses();
      setShowForm(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(tCommon("error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAddress = async (data: UpdateAddressDto) => {
    const customerId = user?.id;
    if (!customerId || !editingAddress) return;

    try {
      setIsSubmitting(true);
      await apiClient.patch(`/customers/${customerId}/addresses/${editingAddress.id}`, data);
      await fetchAddresses();
      setEditingAddress(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(tCommon("error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const customerId = user?.id;
    if (!customerId) return;

    if (!confirm(t("deleteConfirm"))) {
      return;
    }

    try {
      await apiClient.delete(`/customers/${customerId}/addresses/${addressId}`);
      await fetchAddresses();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("deleteError"));
      }
    }
  };

  const handleSetDefault = async (addressId: string) => {
    const customerId = user?.id;
    if (!customerId) return;

    try {
      await apiClient.patch(`/customers/${customerId}/addresses/${addressId}`, {
        isDefault: true,
      });
      await fetchAddresses();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(tCommon("error"));
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent>
            <p className="text-center py-8">{tCommon("loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {!showForm && !editingAddress && (
          <Button onClick={() => setShowForm(true)}>
            {t("addNew")}
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <AddressForm
              mode="create"
              onSubmit={handleAddAddress}
              onCancel={() => setShowForm(false)}
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {editingAddress && (
        <Card className="mb-6">
          <CardContent>
            <AddressForm
              mode="edit"
              initialData={{
                label: editingAddress.label,
                addressLine: editingAddress.addressLine,
                city: editingAddress.city || undefined,
                region: editingAddress.region || undefined,
                postalCode: editingAddress.postalCode || undefined,
                country: editingAddress.country,
                isDefault: editingAddress.isDefault,
                notes: editingAddress.notes || undefined,
              }}
              onSubmit={handleEditAddress}
              onCancel={() => setEditingAddress(null)}
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {addresses.length === 0 && !showForm ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">{t("noAddresses")}</p>
              <p className="text-gray-500 mb-6">{t("noAddressesDescription")}</p>
              <Button onClick={() => setShowForm(true)}>
                {t("addNew")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{address.label}</h3>
                      {address.isDefault && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                          {tCommon("default")}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700">{address.addressLine}</p>
                    {(address.city || address.region) && (
                      <p className="text-gray-600">
                        {[address.city, address.region].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {address.postalCode && (
                      <p className="text-gray-600">{address.postalCode}</p>
                    )}
                    <p className="text-gray-600">{address.country}</p>
                    {address.notes && (
                      <p className="text-gray-500 text-sm mt-2">{address.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ms-4">
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        {tCommon("setDefault")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAddress(address)}
                    >
                      {tCommon("edit")}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                    >
                      {tCommon("delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
