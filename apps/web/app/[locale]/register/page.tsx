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

      // Redirect to home page
      router.push("/");
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

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400 font-medium uppercase tracking-wider">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            {/* Google Sign-Up Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/auth/google`;
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("googleSignUp")}
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
