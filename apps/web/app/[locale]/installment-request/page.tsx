"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { calculateInstallment, listFinancingCompanies, listInstallmentDurations, submitInstallmentRequest, uploadInstallmentDocument, type FinancingCompany, type InstallmentDuration, type InstallmentCalculation } from "@/lib/financing-api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/routing";

const buyerFields = [
  { key: "buyerName", label: "اسم المشتري", type: "text" },
  { key: "buyerPhone", label: "رقم الهاتف", type: "tel" },
  { key: "buyerEmail", label: "البريد الإلكتروني", type: "email", optional: true },
  { key: "buyerAddress", label: "العنوان", type: "text", optional: true },
  { key: "buyerOccupation", label: "الوظيفة", type: "text", optional: true },
] as const;

const guarantorFields = [
  { key: "guarantorName", label: "اسم الضامن", type: "text" },
  { key: "guarantorPhone", label: "هاتف الضامن", type: "tel" },
  { key: "guarantorAddress", label: "عنوان الضامن", type: "text", optional: true },
] as const;

const documentFields = [
  { key: "buyerNationalIdImage", label: "صورة بطاقة المشتري" },
  { key: "salarySlipImage", label: "صورة مرتب/معاش" },
  { key: "apartmentContractImage", label: "عقد الإقامة" },
  { key: "guarantorNationalIdImage", label: "صورة بطاقة الضامن" },
] as const;

export default function InstallmentRequestPage() {
  const searchParams = useSearchParams();
  const motorcycleId = searchParams.get("motorcycleId") ?? "";
  const { isAuthenticated } = useAuth();
  const [companies, setCompanies] = useState<FinancingCompany[]>([]);
  const [durations, setDurations] = useState<InstallmentDuration[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [durationId, setDurationId] = useState("");
  const [downPayment, setDownPayment] = useState(0);
  const [calculation, setCalculation] = useState<InstallmentCalculation | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listFinancingCompanies(), listInstallmentDurations()])
      .then(([companiesData, durationsData]) => {
        // Handle both paginated { items: [...] } and direct array responses
        const companiesArray = Array.isArray(companiesData) 
          ? companiesData 
          : (companiesData as any)?.items ?? [];
        const durationsArray = Array.isArray(durationsData) 
          ? durationsData 
          : (durationsData as any)?.items ?? [];
        
        setCompanies(companiesArray);
        setDurations(durationsArray);
        setCompanyId(companiesArray[0]?.id ?? "");
        setDurationId(durationsArray[0]?.id ?? "");
      })
      .catch(() => setMessage("تعذر تحميل خيارات التمويل."));
  }, []);

  async function calculate() {
    try {
      if (!motorcycleId || !durationId) {
        setMessage("يرجى اختيار السيارة والمدة أولاً.");
        return;
      }
      setCalculation(await calculateInstallment({ motorcycleId, installmentDurationId: durationId, downPayment }));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل في حساب القسط.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!calculation) return setMessage("يرجى حساب القسط قبل الإرسال.");

    const requiredKeys = ["buyerName", "buyerPhone", "guarantorName", "guarantorPhone"];
    const missingValue = requiredKeys.find((key) => !values[key]?.trim());
    if (missingValue) {
      setMessage("يرجى إكمال جميع بيانات المشتري والضامن الأساسية.");
      return;
    }

    const missingDocument = documentFields.find((field) => !files[field.key]);
    if (missingDocument) {
      setMessage(`يرجى رفع ${missingDocument.label} قبل الإرسال.`);
      return;
    }

    try {
      setSubmitting(true);
      const uploaded = await Promise.all(
        Object.entries(files).map(async ([key, file]) => [key, await uploadInstallmentDocument(file)] as const),
      );
      const documentUrls = Object.fromEntries(uploaded.map(([key, response]) => [key, response.url]));
      await submitInstallmentRequest({
        ...values,
        motorcycleId,
        financingCompanyId: companyId,
        installmentDurationId: durationId,
        downPayment,
        monthlyInstallment: calculation.monthlyInstallment,
        ...documentUrls,
      });
      setMessage("تم إرسال طلب التقسيط بنجاح وهو قيد المراجعة.");
      setValues({});
      setFiles({});
      setDownPayment(0);
      setCalculation(null);
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل في إرسال الطلب.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-lg shadow-blue-900/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900">تسجيل الدخول مطلوب</h1>
          <p className="mt-3 text-slate-600">سجل الدخول للاستمرار في طلب التقسيط.</p>
          <Link className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40" href="/login">تسجيل الدخول للمتابعة</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell max-w-5xl py-12" dir="rtl">
      <div className="mb-10 text-center">
        <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">أولاد غانم</span>
        <h1 className="mt-4 text-4xl font-black text-slate-900 md:text-5xl">طلب تقسيط دراجة نارية</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">احسب القسط الذي يناسبك، ثم أكمل بياناتك والمستندات المطلوبة بخطوات بسيطة وواضحة.</p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* Installment Calculator Widget */}
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-900/5">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white md:p-8">
            <h2 className="text-2xl font-black">1. حاسبة الأقساط</h2>
            <p className="mt-2 text-blue-100">حدد خطة التمويل والمقدم لمعرفة القسط الشهري التقريبي.</p>
          </div>
          
          <div className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                شركة التمويل
                <select required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                المدة
                <select required value={durationId} onChange={(e) => setDurationId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  {durations.map((duration) => <option key={duration.id} value={duration.id}>{duration.months} شهر</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                المقدم (EGP)
                <input required min={0} type="number" value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>
            </div>
            
            <div className="mt-8 flex flex-col items-center justify-between gap-6 rounded-2xl bg-slate-50 p-6 md:flex-row md:p-8">
              <button type="button" onClick={calculate} className="w-full shrink-0 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40 md:w-auto">احسب القسط</button>
              
              {calculation ? (
                <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900 md:w-auto md:min-w-[300px]">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">قسط تقريبي</p>
                  <p className="mt-2 text-4xl font-black tracking-tight">{calculation.monthlyInstallment.toLocaleString("en-EG")} <span className="text-xl font-bold">EGP</span></p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-700/80">
                    <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> {calculation.months} أشهر</span>
                    <span>·</span>
                    <span>المبلغ المقسط: {calculation.financingAmount.toLocaleString("en-EG")}</span>
                  </div>
                </div>
              ) : (
                <div className="hidden w-full text-center text-sm font-medium text-slate-400 md:block md:w-auto">
                  اضغط على الزر لحساب القسط المتوقع
                </div>
              )}
            </div>
          </div>
        </div>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <legend className="px-2 text-2xl font-black text-slate-900">2. بيانات المشتري</legend>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {buyerFields.map((field) => (
              <label key={field.key} className="text-sm font-semibold text-slate-700">
                {field.label} {!field.optional && <span className="text-red-500">*</span>}
                <input required={!field.optional} type={field.type} value={values[field.key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <legend className="px-2 text-2xl font-black text-slate-900">3. المستندات</legend>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {documentFields.map((field) => (
              <label key={field.key} className="text-sm font-semibold text-slate-700">
                {field.label} <span className="text-red-500">*</span>
                <div className="mt-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-100/50">
                  <input required type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFiles((prev) => ({ ...prev, [field.key]: file }));
                  }} className="w-full text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700" />
                  {files[field.key] && <p className="mt-2 text-xs text-blue-600">تم اختيار الملف: {files[field.key].name}</p>}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <legend className="px-2 text-2xl font-black text-slate-900">4. بيانات الضامن</legend>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {guarantorFields.map((field) => (
              <label key={field.key} className="text-sm font-semibold text-slate-700">
                {field.label} {!field.optional && <span className="text-red-500">*</span>}
                <input required={!field.optional} type={field.type} value={values[field.key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <legend className="px-2 text-2xl font-black text-slate-900">5. مراجعة وإرسال</legend>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-sm text-slate-700">
            <div className="grid gap-4 md:grid-cols-2">
              <p><strong>شركة التمويل:</strong> {companies.find((company) => company.id === companyId)?.name ?? "-"}</p>
              <p><strong>المدة:</strong> {durations.find((duration) => duration.id === durationId)?.months ?? "-"} أشهر</p>
              <p><strong>المقدم:</strong> {downPayment.toLocaleString("en-EG")} EGP</p>
              {calculation && <p><strong>القسط التقريبي:</strong> {calculation.monthlyInstallment.toLocaleString("en-EG")} EGP</p>}
            </div>
          </div>
        </fieldset>

        {message && (
          <div className={`rounded-xl p-5 font-semibold ${message.includes("بنجاح") ? "border border-green-200 bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-800"}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center rounded-2xl bg-blue-600 px-8 py-5 text-xl font-black text-white shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40 disabled:pointer-events-none disabled:opacity-60">
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              جاري الإرسال...
            </span>
          ) : "إرسال طلب التقسيط"}
        </button>
      </form>
    </section>
  );
}
