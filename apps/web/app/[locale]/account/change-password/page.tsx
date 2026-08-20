"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { changeCustomerPasswordSchema, type ChangeCustomerPasswordDto } from "@motorcycle-system/shared-types";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useEffect } from "react";

// Extended schema with confirmation
const changePasswordFormSchema = changeCustomerPasswordSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

export default function ChangePasswordPage() {
  const t = useTranslations("customer.changePassword");
  const tCommon = useTranslations("common");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const onSubmit = async (data: ChangePasswordFormData) => {
    if (!user) return;

    try {
      setError(null);
      setSuccess(false);
      setIsLoading(true);

      const payload: ChangeCustomerPasswordDto = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      };

      await apiClient.post(`/customers/${user.id}/change-password`, payload);
      setSuccess(true);
      reset();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
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
              {...register("currentPassword")}
              label={t("currentPassword")}
              type="password"
              error={errors.currentPassword?.message}
              required
              autoComplete="current-password"
            />

            <Input
              {...register("newPassword")}
              label={t("newPassword")}
              type="password"
              error={errors.newPassword?.message}
              required
              autoComplete="new-password"
              helpText={t("passwordMinLength")}
            />

            <Input
              {...register("confirmPassword")}
              label={t("confirmPassword")}
              type="password"
              error={errors.confirmPassword?.message}
              required
              autoComplete="new-password"
            />

            <Button type="submit" isLoading={isLoading}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
