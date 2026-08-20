"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateCustomerSchema, type UpdateCustomerDto, type CustomerDetailResponse } from "@motorcycle-system/shared-types";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";

export default function ProfilePage() {
  const t = useTranslations("customer.profile");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateCustomerDto>({
    resolver: zodResolver(updateCustomerSchema),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user && isAuthenticated) {
      fetchCustomer();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get customer ID from user metadata or make additional API call
      // For now, we'll use the user's ID to fetch customer data
      const customerId = user?.id;
      if (!customerId) return;

      const data = await apiClient.get<CustomerDetailResponse>(`/customers/${customerId}`);
      setCustomer(data);
      reset({
        name: data.name,
        phone: data.phone,
        email: data.email || "",
        nationalId: data.nationalId || "",
      });
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

  const onSubmit = async (data: UpdateCustomerDto) => {
    if (!customer) return;

    try {
      setError(null);
      setSuccess(false);
      setIsSaving(true);

      await apiClient.patch(`/customers/${customer.id}`, data);
      setSuccess(true);
      await fetchCustomer();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("error"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent>
            <p className="text-center py-8">{tCommon("loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {t("success")}
              </div>
            )}

            <Input
              {...register("name")}
              label={t("name")}
              error={errors.name?.message}
            />

            <Input
              {...register("phone")}
              label={t("phone")}
              type="tel"
              error={errors.phone?.message}
            />

            <Input
              {...register("email")}
              label={t("email")}
              type="email"
              error={errors.email?.message}
            />

            <Input
              {...register("nationalId")}
              label={t("nationalId")}
              error={errors.nationalId?.message}
            />

            <Button type="submit" isLoading={isSaving}>
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
