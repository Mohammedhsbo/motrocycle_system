"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerCustomerSchema, type RegisterCustomerDto } from "@motorcycle-system/shared-types";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function RegisterPage() {
  const t = useTranslations("customer.register");
  const tAddressForm = useTranslations("customer.addressForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { login } = useAuth();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressToggleLabel = showAddressForm ? t("hideAddressForm") : t("showAddressForm");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterCustomerDto>({
    resolver: zodResolver(registerCustomerSchema),
  });

  const onSubmit = async (data: RegisterCustomerDto) => {
    try {
      setError(null);
      setIsLoading(true);

      // Register customer
      await apiClient.post("/customers/register", data);

      // Login with credentials
      await login({
        email: data.email,
        password: data.password,
      });

      // Redirect to account page
      router.push("/account/profile");
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

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-gray-600 mt-2">{t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              {...register("name")}
              label={t("name")}
              error={errors.name?.message}
              required
              autoComplete="name"
            />

            <Input
              {...register("phone")}
              label={t("phone")}
              type="tel"
              error={errors.phone?.message}
              required
              autoComplete="tel"
            />

            <Input
              {...register("email")}
              label={t("email")}
              type="email"
              error={errors.email?.message}
              required
              autoComplete="email"
            />

            <Input
              {...register("password")}
              label={t("password")}
              type="password"
              error={errors.password?.message}
              required
              autoComplete="new-password"
            />

            <Input
              {...register("nationalId")}
              label={t("nationalId")}
              error={errors.nationalId?.message}
            />

            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-primary hover:underline text-sm font-medium"
                aria-label={addressToggleLabel}
                title={addressToggleLabel}
              >
                <span aria-hidden="true">{showAddressForm ? "−" : "+"}</span>
                {" "}
                {t("addAddress")}
              </button>

              {showAddressForm && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <Input
                    {...register("address.label")}
                    label={tAddressForm("label")}
                    placeholder={tAddressForm("labelPlaceholder")}
                  />

                  <Input
                    {...register("address.addressLine")}
                    label={tAddressForm("addressLine")}
                    error={errors.address?.addressLine?.message}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      {...register("address.city")}
                      label={tAddressForm("city")}
                    />

                    <Input
                      {...register("address.region")}
                      label={tAddressForm("region")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      {...register("address.postalCode")}
                      label={tAddressForm("postalCode")}
                    />

                    <Input
                      {...register("address.country")}
                      label={tAddressForm("country")}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {t("submit")}
            </Button>

            <div className="text-center text-sm text-gray-600">
              {t("alreadyHaveAccount")}{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t("loginLink")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
