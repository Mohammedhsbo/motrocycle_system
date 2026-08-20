"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ApiError } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("customer.login");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      await login(data);
      router.push("/account/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(tCommon("error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-gray-600 mt-2">{t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

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
              autoComplete="current-password"
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? tCommon("loading") : t("submit")}
            </Button>

            <div className="text-center mt-4 text-sm text-gray-600">
              {t("noAccount")}{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t("register")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
