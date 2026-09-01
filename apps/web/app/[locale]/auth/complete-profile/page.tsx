"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

const completeProfileSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
  });

  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      await apiClient.post("/auth/google/complete-profile", data);

      await refreshUser();
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.toLowerCase().includes("missing or expired")) {
          router.push("/login?error=oauth_failed");
        } else {
          setError(err.message);
        }
      } else {
        setError("An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <p className="text-gray-600 mt-2 text-sm">
            Please provide a phone number to complete your registration.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              {...register("phone")}
              label="Phone Number"
              type="tel"
              error={errors.phone?.message}
              required
              autoComplete="tel"
              placeholder="+20 1XX XXX XXXX"
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
