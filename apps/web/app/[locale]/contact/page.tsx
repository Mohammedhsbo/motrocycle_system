"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function ContactPage() {
  const t = useTranslations("contact");
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(to_bottom,_#eff6ff,_#dbeafe_35%,_#f8fbff)] px-4 py-10" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tight text-blue-950">{t("title")}</h1>
        </div>

        <Card className="overflow-hidden border border-blue-200 bg-white/80 shadow-[0_20px_60px_rgba(30,64,175,0.12)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_25px_70px_rgba(30,64,175,0.18)]">
          <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white">
            <CardTitle className="text-2xl font-bold text-white">{t("contactInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 bg-white p-0 text-gray-700">
            <div className="group border-b border-blue-100 p-6 transition-all duration-200 hover:bg-blue-50/80 hover:translate-x-1 hover:-translate-y-0.5">
              <h3 className="mb-2 text-lg font-bold text-blue-900">{t("phoneLabel")}</h3>
              <p className="whitespace-pre-line leading-7 text-blue-950/80 transition-colors group-hover:text-blue-900">{t("phoneValue")}</p>
            </div>

            <div className="group border-b border-blue-100 p-6 transition-all duration-200 hover:bg-blue-50/80 hover:translate-x-1 hover:-translate-y-0.5">
              <h3 className="mb-2 text-lg font-bold text-blue-900">{t("addressLabel")}</h3>
              <p className="whitespace-pre-line leading-7 text-blue-950/80 transition-colors group-hover:text-blue-900">{t("addressValue")}</p>
            </div>

            <div className="group p-6 transition-all duration-200 hover:bg-blue-50/80 hover:translate-x-1 hover:-translate-y-0.5">
              <h3 className="mb-2 text-lg font-bold text-blue-900">{t("emailLabel")}</h3>
              <p className="leading-7 text-blue-950/80 transition-colors group-hover:text-blue-900">{t("emailValue")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
