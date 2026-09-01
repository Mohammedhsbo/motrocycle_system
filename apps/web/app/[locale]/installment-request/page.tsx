"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Banknote, Building2, CheckCircle2, FileText, HandCoins, IdCard, ShieldCheck, UserRound } from "lucide-react";
import { calculateInstallment, listFinancingCompanies, listInstallmentDurations, submitInstallmentRequest, uploadInstallmentDocument, type FinancingCompany, type InstallmentDuration, type InstallmentCalculation } from "@/lib/financing-api";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/routing";

const buyerFields = [
  { key: "buyerName", type: "text", optional: false },
  { key: "buyerPhone", type: "tel", optional: false },
  { key: "buyerEmail", type: "email", optional: true },
  { key: "buyerAddress", type: "text", optional: true },
  { key: "buyerOccupation", type: "text", optional: true },
] as const;

const documentTypeOptions = [
  { value: "EMPLOYEE", labelKey: "documentTypeEmployee", descKey: "documentTypeEmployeeDesc" },
  { value: "PENSION", labelKey: "documentTypePension", descKey: "documentTypePensionDesc" },
  { value: "COMMERCIAL_REGISTRY", labelKey: "documentTypeCommercial", descKey: "documentTypeCommercialDesc" },
  { value: "NEITHER", labelKey: "documentTypeNeither", descKey: "documentTypeNeitherDesc" },
] as const;

type DocumentType = (typeof documentTypeOptions)[number]["value"];

export default function InstallmentRequestPage() {
  const t = useTranslations("installmentRequest");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const motorcycleId = searchParams.get("motorcycleId") ?? "";
  const { user, isAuthenticated } = useAuth();
  const [companies, setCompanies] = useState<FinancingCompany[]>([]);
  const [durations, setDurations] = useState<InstallmentDuration[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [durationId, setDurationId] = useState("");
  const [downPayment, setDownPayment] = useState(0);
  const [calculation, setCalculation] = useState<InstallmentCalculation | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("EMPLOYEE");
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listFinancingCompanies(), listInstallmentDurations()])
      .then(([companiesData, durationsData]) => {
        const companiesArray = Array.isArray(companiesData) ? companiesData : (companiesData as any)?.items ?? [];
        const durationsArray = Array.isArray(durationsData) ? durationsData : (durationsData as any)?.items ?? [];

        setCompanies(companiesArray);
        setDurations(durationsArray);
        setCompanyId(companiesArray[0]?.id ?? "");
        setDurationId(durationsArray[0]?.id ?? "");
      })
      .catch(() => setMessage(t("loadError")));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    apiClient
      .get<{ name?: string; phone?: string; email?: string | null; address?: string | null }>(`/customers/${user.id}`)
      .then((customer: { name?: string; phone?: string; email?: string | null; address?: string | null }) => {
        setValues((prev) => ({
          ...prev,
          buyerName: customer.name ?? prev.buyerName ?? "",
          buyerPhone: customer.phone ?? prev.buyerPhone ?? "",
          buyerEmail: customer.email ?? prev.buyerEmail ?? "",
          buyerAddress: customer.address ?? prev.buyerAddress ?? "",
        }));
      })
      .catch(() => undefined);
  }, [isAuthenticated, user?.id]);

  async function calculate() {
    try {
      if (!motorcycleId || !durationId) {
        setMessage(t("errorSelectMotorcycle"));
        return;
      }

      const result = await calculateInstallment({ motorcycleId, installmentDurationId: durationId, downPayment });
      setCalculation(result);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("errorGeneric"));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!motorcycleId) {
      setMessage(t("errorSelectMotorcycle"));
      return;
    }

    if (!companyId) {
      setMessage(t("errorSelectCompany"));
      return;
    }

    if (!durationId) {
      setMessage(t("errorSelectDuration"));
      return;
    }

    if (!calculation) {
      setMessage(t("errorCalculateFirst"));
      return;
    }

    const requiredKeys = ["buyerName", "buyerPhone"];
    const missingKey = requiredKeys.find((key) => !values[key]?.trim());
    if (missingKey) {
      setMessage(t("errorRequiredFields"));
      return;
    }

    if ((documentType === "EMPLOYEE" || documentType === "PENSION" || documentType === "COMMERCIAL_REGISTRY") && (!values.buyerAddress?.trim() || !values.buyerOccupation?.trim())) {
      setMessage(t("errorAddressOccupation"));
      return;
    }

    if (documentType === "EMPLOYEE") {
      if (!files.salarySlipImage || !files.idCardFrontImage || !files.idCardBackImage) {
        setMessage(t("errorDocumentsEmployee"));
        return;
      }
    }

    if (documentType === "PENSION") {
      if (!files.pensionDocumentImage || !files.idCardFrontImage || !files.idCardBackImage) {
        setMessage(t("errorDocumentsPension"));
        return;
      }
    }

    if (documentType === "COMMERCIAL_REGISTRY") {
      if (!files.commercialRegistryImage || !files.idCardFrontImage || !files.idCardBackImage) {
        setMessage(t("errorDocumentsCommercial"));
        return;
      }
    }

    if (documentType === "NEITHER") {
      if (!files.buyerIdFrontImage || !files.buyerIdBackImage || !files.guarantor1IdFrontImage || !files.guarantor1IdBackImage || !files.guarantor2IdFrontImage || !files.guarantor2IdBackImage) {
        setMessage(t("errorDocumentsNeither"));
        return;
      }
    }

    try {
      setSubmitting(true);
      setMessage("");

      const uploadedEntries = await Promise.all(
        Object.entries(files).filter(([, file]) => !!file).map(async ([key, file]) => {
          const result = await uploadInstallmentDocument(file as File);
          return [key, result.url] as const;
        }),
      );

      const documentUrls = Object.fromEntries(uploadedEntries);

      await submitInstallmentRequest({
        ...values,
        motorcycleId,
        financingCompanyId: companyId,
        installmentDurationId: durationId,
        downPayment,
        monthlyInstallment: calculation.monthlyInstallment,
        buyerNationalIdImage: documentUrls.buyerIdFrontImage ?? documentUrls.idCardFrontImage ?? "",
        salarySlipImage: documentUrls.salarySlipImage ?? "",
        apartmentContractImage: documentUrls.apartmentContractImage ?? "",
        guarantorNationalIdImage: documentUrls.guarantorNationalIdImage ?? documentUrls.guarantor1IdFrontImage ?? "",
        ...documentUrls,
      });

      setMessage(t("successMessage"));
      setCalculation(null);
      setValues({});
      setFiles({});
      setDownPayment(0);
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const updateValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  if (!isAuthenticated) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-lg shadow-blue-900/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">{t("loginRequired")}</h1>
          <p className="mt-3 text-slate-600">{t("loginMessage")}</p>
          <Link className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40" href="/login">{t("loginButton")}</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell max-w-5xl py-12" dir="rtl">
      <div className="mb-10 text-center">
        <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">أولاد غانم</span>
        <h1 className="mt-4 text-4xl font-black text-slate-900 md:text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{t("description")}</p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-6 py-5 text-white md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">{t("step1Label")}</p>
              <h2 className="mt-1 text-2xl font-black">{t("step1Title")}</h2>
            </div>
            <UserRound className="h-8 w-8 text-blue-100" />
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
            {buyerFields.map((field) => (
              <label key={field.key} className="text-sm font-semibold text-slate-700">
                {t(field.key as any)} {!field.optional && <span className="text-red-500">*</span>}
                <input
                  required={!field.optional}
                  type={field.type}
                  value={values[field.key] ?? ""}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">{t("step2Label")}</p>
              <h2 className="mt-1 text-2xl font-black">{t("step2Title")}</h2>
            </div>
            <HandCoins className="h-8 w-8 text-emerald-100" />
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                {t("financingCompany")}
                <select
                  required
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">{t("selectCompany")}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                {t("duration")}
                <select
                  required
                  value={durationId}
                  onChange={(event) => setDurationId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">{t("selectDuration")}</option>
                  {durations.map((duration) => (
                    <option key={duration.id} value={duration.id}>{duration.months} {t("months")}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                {t("downPayment")}
                <input
                  required
                  min={0}
                  type="number"
                  value={downPayment}
                  onChange={(event) => setDownPayment(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl bg-emerald-50 p-5 md:flex-row">
              <button type="button" onClick={calculate} className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 md:w-auto">{t("calculateButton")}</button>

              {calculation ? (
                <div className="w-full rounded-2xl border border-emerald-200 bg-white p-5 text-emerald-900 md:w-auto md:min-w-[320px]">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">{t("monthlyInstallment")}</p>
                  <p className="mt-2 text-4xl font-black tracking-tight">{calculation.monthlyInstallment.toLocaleString("en-EG")} <span className="text-lg font-bold">EGP</span></p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                    <span>{calculation.months} {t("months")}</span>
                    <span>•</span>
                    <span>{t("financingAmount")}: {calculation.financingAmount.toLocaleString("en-EG")}</span>
                  </div>
                </div>
              ) : (
                <div className="w-full text-sm text-slate-500 md:w-auto">{t("installmentInfo")}</div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-100">{t("step3Label")}</p>
              <h2 className="mt-1 text-2xl font-black">{t("step3Title")}</h2>
            </div>
            <FileText className="h-8 w-8 text-violet-100" />
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
            {documentTypeOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${documentType === option.value ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-slate-50 hover:border-violet-200"}`}
              >
                <input
                  type="radio"
                  name="documentType"
                  checked={documentType === option.value}
                  onChange={() => setDocumentType(option.value)}
                  className="mt-1 h-4 w-4 accent-violet-600"
                />
                <div>
                  <div className="text-base font-bold text-slate-900">{t(option.labelKey as any)}</div>
                  <div className="mt-1 text-sm text-slate-500">{t(option.descKey as any)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-100">{t("step4Label")}</p>
              <h2 className="mt-1 text-2xl font-black">{t("step4Title")}</h2>
            </div>
            <IdCard className="h-8 w-8 text-orange-100" />
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
            {documentType === "EMPLOYEE" && (
              <>
                <FileUpload label={t("salarySlipImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, salarySlipImage: file }))} />
                <FileUpload label={t("idCardFrontImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, idCardFrontImage: file }))} />
                <FileUpload label={t("idCardBackImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, idCardBackImage: file }))} />
              </>
            )}

            {documentType === "PENSION" && (
              <>
                <FileUpload label={t("pensionDocumentImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, pensionDocumentImage: file }))} />
                <FileUpload label={t("idCardFrontImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, idCardFrontImage: file }))} />
                <FileUpload label={t("idCardBackImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, idCardBackImage: file }))} />
              </>
            )}

            {documentType === "COMMERCIAL_REGISTRY" && (
              <>
                <FileUpload label={t("commercialRegistryImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, commercialRegistryImage: file }))} />
                <FileUpload label={t("idCardFrontImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, idCardFrontImage: file }))} />
                <FileUpload label={t("idCardBackImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, idCardBackImage: file }))} />
              </>
            )}

            {documentType === "NEITHER" && (
              <>
                <FileUpload label={t("buyerIdFrontImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, buyerIdFrontImage: file }))} />
                <FileUpload label={t("buyerIdBackImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, buyerIdBackImage: file }))} />
                <FileUpload label={t("guarantor1IdFrontImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, guarantor1IdFrontImage: file }))} />
                <FileUpload label={t("guarantor1IdBackImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, guarantor1IdBackImage: file }))} />
                <FileUpload label={t("guarantor2IdFrontImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, guarantor2IdFrontImage: file }))} />
                <FileUpload label={t("guarantor2IdBackImage")} required onChange={(file) => setFiles((prev) => ({ ...prev, guarantor2IdBackImage: file }))} />
              </>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p><strong>{t("financingCompany")}:</strong> {companies.find((company) => company.id === companyId)?.name ?? "-"}</p>
            <p><strong>{t("duration")}:</strong> {durations.find((duration) => duration.id === durationId)?.months ?? "-"} {t("months")}</p>
            <p><strong>{t("downPayment")}:</strong> {downPayment.toLocaleString("en-EG")} EGP</p>
            {calculation && <p><strong>{t("monthlyInstallment")}:</strong> {calculation.monthlyInstallment.toLocaleString("en-EG")} EGP</p>}
          </div>
        </div>

        {message && (
          <div className={`rounded-2xl border p-5 font-semibold ${message.includes(t("successMessage")) ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[1.5rem] bg-blue-600 px-8 py-5 text-xl font-black text-white shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40 disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("submitButton")}
        </button>
      </form>
    </section>
  );
}

function FileUpload({
  label,
  required,
  onChange,
}: {
  label: string;
  required?: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label} {required && <span className="text-red-500">*</span>}
      <div className="mt-2 flex min-h-[82px] flex-col items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-4 text-center transition hover:border-blue-400 hover:bg-blue-100/60">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          className="w-full text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
        />
      </div>
    </label>
  );
}
