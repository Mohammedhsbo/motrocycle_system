"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { getStoreSettings } from "@/lib/financing-api";
import { CheckCircle, Copy, CreditCard, Truck, Phone, AlertCircle, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

interface CartItem {
  id: string;
  vin: string;
  model: string;
  year: number;
  price: number;
  brand: { nameEn: string; nameAr: string };
  image?: string;
}

type PaymentMethod = "instapay" | "cash";
type OrderType = "purchase" | "installment";

export default function CheckoutPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const orderType: OrderType = (searchParams.get("type") as OrderType) ?? "purchase";

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<{ contactPhone?: string | null; instagramUrl?: string | null; instaPayAccount?: string | null } | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string; email?: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("instapay");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"review" | "payment" | "confirmed">("review");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Name & phone for guest/quick checkout
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, isAuthenticated, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settings] = await Promise.all([
        getStoreSettings().catch(() => null),
      ]);
      setStoreSettings(settings);

      const cartData = localStorage.getItem("cart");
      if (cartData) setCartItems(JSON.parse(cartData));

      if (isAuthenticated && user?.id) {
        try {
          const cust = await apiClient.get<{ id: string; name: string; phone: string; email?: string }>(`/customers/${user.id}`);
          setCustomer(cust);
          setContactName(cust.name);
          setContactPhone(cust.phone);
        } catch { /* ignore */ }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmOrder = () => {
    startTransition(async () => {
      setError(null);
      try {
        let order: { id: string };
        order = await apiClient.post<{ id: string }>("/orders", {
          customerId: customer!.id,
          motorcycleIds: cartItems.map(i => i.id),
          discount: 0,
          isDraft: false,
          paymentMethod,
          orderType,
        });
        localStorage.removeItem("cart");
        setOrderId(order.id);
        setStep("confirmed");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (isAr ? "حدث خطأ أثناء تأكيد الطلب" : "Error confirming order"));
      }
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  // Guard: guests cannot access checkout
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.replace(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/checkout?type=${orderType}`)}`);
    }
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">{isAr ? "جاري التحويل..." : "Redirecting..."}</p>
        </div>
      </div>
    );
  }

  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4" dir={isAr ? "rtl" : "ltr"}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mb-2">{isAr ? "تم تأكيد طلبك!" : "Order Confirmed!"}</h1>
          <p className="text-zinc-500 text-sm mb-1">{isAr ? "رقم الطلب" : "Order ID"}</p>
          <p className="font-mono text-sm font-bold text-zinc-800 bg-zinc-100 rounded-lg px-4 py-2 mb-6 inline-block">{orderId}</p>

          {paymentMethod === "instapay" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-start">
              <p className="text-sm font-bold text-amber-800 mb-1">{isAr ? "📲 في انتظار تأكيد الدفع" : "📲 Awaiting Payment Confirmation"}</p>
              <p className="text-xs text-amber-700">{isAr ? "سيتواصل معك فريقنا بعد التحقق من الحوالة." : "Our team will contact you after verifying the transfer."}</p>
            </div>
          )}
          {paymentMethod === "cash" && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-6 text-start">
              <p className="text-sm font-bold text-blue-800 mb-1">{isAr ? "🚚 الدفع عند الاستلام" : "🚚 Cash on Delivery"}</p>
              <p className="text-xs text-blue-700">{isAr ? "سنتواصل معك لتحديد موعد التسليم." : "We'll contact you to schedule delivery."}</p>
            </div>
          )}

          <button
            onClick={() => router.push("/motorcycles")}
            className="w-full rounded-full bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 transition"
          >
            {isAr ? "العودة إلى المتجر" : "Back to Store"}
          </button>
        </div>
      </div>
    );
  }

  const instaPayNumber = storeSettings?.contactPhone ?? "01xxxxxxxxxx";

  return (
    <div className="min-h-screen bg-[#f7f7f7]" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="section-shell py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-900 transition">
              <ChevronRight size={20} className={isAr ? "" : "rotate-180"} />
            </button>
            <div>
              <h1 className="text-lg font-black text-zinc-900">
                {orderType === "installment" ? (isAr ? "طلب تقسيط" : "Installment Request") : (isAr ? "إتمام الشراء" : "Checkout")}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${step === "review" ? "bg-blue-100 text-blue-700" : "text-zinc-400"}`}>{isAr ? "١. المراجعة" : "1. Review"}</span>
                <span className="text-zinc-300">›</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${step === "payment" ? "bg-blue-100 text-blue-700" : "text-zinc-400"}`}>{isAr ? "٢. الدفع" : "2. Payment"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-shell py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* LEFT — Main content */}
          <div className="lg:col-span-2 space-y-4">

            {/* STEP 1: Review */}
            {step === "review" && (
              <>
                {/* Order items */}
                <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5">
                  <h2 className="text-base font-black text-zinc-900 mb-4">{isAr ? "الموتوسيكل المطلوب" : "Motorcycle(s)"}</h2>
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-400 text-sm">{isAr ? "السلة فارغة" : "Cart is empty"}</p>
                      <button onClick={() => router.push("/motorcycles")} className="mt-3 text-blue-600 text-sm font-bold hover:underline">
                        {isAr ? "تصفح الموتوسيكلات" : "Browse Motorcycles"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                          {item.image && (
                            <img src={item.image} alt={item.model} className="w-16 h-16 object-contain rounded-lg bg-white shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-zinc-900 text-sm">{isAr ? item.brand.nameAr : item.brand.nameEn} {item.model}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{item.year}</p>
                          </div>
                          <div className="text-end">
                            <p className="font-black text-zinc-900 text-sm">{item.price.toLocaleString("ar-EG")}</p>
                            <p className="text-xs text-zinc-400">{isAr ? "ج.م" : "EGP"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5">
                  <h2 className="text-base font-black text-zinc-900 mb-4">{isAr ? "بياناتك" : "Your Details"}</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">{isAr ? "الاسم الكامل" : "Full Name"}</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-400 transition"
                        placeholder={isAr ? "أدخل اسمك الكامل" : "Enter your full name"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-400 transition"
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <button
                  disabled={cartItems.length === 0 || !contactName || !contactPhone}
                  onClick={() => setStep("payment")}
                  className="w-full rounded-full bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
                >
                  {isAr ? "التالي — اختر طريقة الدفع" : "Next — Choose Payment"}
                </button>
              </>
            )}

            {/* STEP 2: Payment */}
            {step === "payment" && (
              <>
                {/* Payment method selection */}
                <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5">
                  <h2 className="text-base font-black text-zinc-900 mb-4">{isAr ? "طريقة الدفع" : "Payment Method"}</h2>
                  <div className="space-y-3">
                    
                    {/* InstaPay */}
                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === "instapay" ? "border-blue-600 bg-blue-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                      <input type="radio" name="payment" value="instapay" checked={paymentMethod === "instapay"} onChange={() => setPaymentMethod("instapay")} className="mt-1 accent-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard size={18} className="text-blue-600" />
                          <span className="font-black text-zinc-900 text-sm">{isAr ? "إنستاباي (تحويل فوري)" : "InstaPay (Instant Transfer)"}</span>
                        </div>
                        <p className="text-xs text-zinc-500">{isAr ? "حوّل المبلغ إلى حسابنا على إنستاباي وأرسل صورة الإيصال" : "Transfer the amount to our InstaPay account and send the receipt"}</p>
                      </div>
                    </label>

                    {/* Cash on Delivery */}
                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${paymentMethod === "cash" ? "border-blue-600 bg-blue-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                      <input type="radio" name="payment" value="cash" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} className="mt-1 accent-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck size={18} className="text-blue-600" />
                          <span className="font-black text-zinc-900 text-sm">{isAr ? "الدفع عند الاستلام" : "Cash on Delivery"}</span>
                        </div>
                        <p className="text-xs text-zinc-500">{isAr ? "ادفع نقداً عند استلام الموتوسيكل" : "Pay in cash when you receive your motorcycle"}</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* InstaPay Instructions */}
                {paymentMethod === "instapay" && (
                  <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5">
                    <h2 className="text-base font-black text-zinc-900 mb-4">{isAr ? "خطوات الدفع بإنستاباي" : "InstaPay Steps"}</h2>
                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">١</span>
                        <p className="text-sm text-zinc-700 pt-1">{isAr ? "افتح تطبيق إنستاباي على هاتفك" : "Open InstaPay app on your phone"}</p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">٢</span>
                        <div className="pt-1">
                          <p className="text-sm text-zinc-700">{isAr ? "حوّل المبلغ إلى الرقم:" : "Transfer the amount to:"}</p>
                          <div className="mt-2 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                            <span className="font-mono font-black text-zinc-900 text-sm flex-1" dir="ltr">{instaPayNumber}</span>
                            <button
                              onClick={() => handleCopy(instaPayNumber)}
                              className="text-blue-600 hover:text-blue-800 transition shrink-0"
                              title="Copy"
                            >
                              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">٣</span>
                        <p className="text-sm text-zinc-700 pt-1">{isAr ? "احفظ صورة الإيصال واضغط على تأكيد الطلب — سيتواصل معك فريقنا للتحقق." : "Save the receipt screenshot and confirm your order — our team will follow up."}</p>
                      </li>
                    </ol>
                    {storeSettings?.contactPhone && (
                      <a
                        href={`https://wa.me/${storeSettings.contactPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition"
                      >
                        <Phone size={16} />
                        {isAr ? "تواصل معنا على واتساب" : "Contact us on WhatsApp"}
                      </a>
                    )}
                  </div>
                )}

                {/* Cash Instructions */}
                {paymentMethod === "cash" && (
                  <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5">
                    <h2 className="text-base font-black text-zinc-900 mb-3">{isAr ? "تعليمات الدفع عند الاستلام" : "Cash on Delivery Info"}</h2>
                    <ul className="space-y-2 text-sm text-zinc-700">
                      <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">•</span> {isAr ? "سيتواصل معك فريقنا لتحديد موعد التسليم" : "Our team will contact you to schedule delivery"}</li>
                      <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">•</span> {isAr ? "يُرجى تجهيز المبلغ كاملاً عند الاستلام" : "Please prepare the full amount at the time of delivery"}</li>
                      <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">•</span> {isAr ? "التوصيل داخل الإسكندرية فقط" : "Delivery within Alexandria only"}</li>
                    </ul>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 rounded-full border-2 border-zinc-300 py-3.5 text-sm font-bold text-zinc-700 hover:border-zinc-500 transition"
                  >
                    {isAr ? "رجوع" : "Back"}
                  </button>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={isPending}
                    className="flex-1 rounded-full bg-blue-600 py-3.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-md flex items-center justify-center gap-2"
                  >
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {isPending ? (isAr ? "جاري التأكيد..." : "Confirming...") : (isAr ? "تأكيد الطلب" : "Confirm Order")}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — Order summary sticky */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5 sticky top-24">
              <h2 className="text-base font-black text-zinc-900 mb-4">{isAr ? "ملخص الطلب" : "Order Summary"}</h2>
              <div className="space-y-2 text-sm">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-zinc-700">
                    <span className="truncate max-w-[60%]">{isAr ? item.brand.nameAr : item.brand.nameEn} {item.model}</span>
                    <span className="font-bold">{item.price.toLocaleString("ar-EG")}</span>
                  </div>
                ))}
                {cartItems.length === 0 && <p className="text-zinc-400 text-center py-2">{isAr ? "لا توجد عناصر" : "No items"}</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-zinc-500">{isAr ? "الإجمالي" : "Total"}</span>
                  <div className="text-end">
                    <span className="text-2xl font-black text-zinc-900">{totalAmount.toLocaleString("ar-EG")}</span>
                    <span className="text-xs text-zinc-400 ms-1">{isAr ? "ج.م" : "EGP"}</span>
                  </div>
                </div>
              </div>
              {orderType === "installment" && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium">
                  {isAr ? "⚡ طلب تقسيط — سيتم مراجعة الطلب من قِبل الفريق" : "⚡ Installment request — will be reviewed by our team"}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                <ShieldCheck size={14} className="text-green-500" />
                {isAr ? "طلبك آمن ومحمي" : "Your order is secure"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
