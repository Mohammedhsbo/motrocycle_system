"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";

export default function ContactPage() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="container mx-auto px-4 py-8" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("title")}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("sendUsMessage")}</CardTitle>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md text-center py-8">
                  {t("successMessage")}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                    <input type="text" required className="w-full rounded-md border-gray-300 border p-2 focus:border-red-500 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
                    <input type="email" required className="w-full rounded-md border-gray-300 border p-2 focus:border-red-500 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("message")}</label>
                    <textarea required rows={4} className="w-full rounded-md border-gray-300 border p-2 focus:border-red-500 focus:ring-red-500"></textarea>
                  </div>
                  <Button type="submit" className="w-full">{t("submit")}</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("contactInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{t("addressLabel")}</h3>
                  <p className="text-gray-600">{t("addressValue")}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("phoneLabel")}</h3>
                  <p className="text-gray-600">{t("phoneValue")}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("emailLabel")}</h3>
                  <p className="text-gray-600">{t("emailValue")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
