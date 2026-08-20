"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/Card";

type LetterStatus = 'draft' | 'issued' | 'sent' | 'received' | 'not_received' | 'cancelled';
type LetterType = 'receipt_acknowledgment' | 'delivery_notice' | 'payment_reminder' | 'contract_expiry' | 'general';

interface LetterListItem {
  id: string;
  letterNumber: string;
  type: LetterType;
  status: LetterStatus;
  subject: string;
  issueDate?: string;
  sentDate?: string;
  receivedDate?: string;
  expiryDate?: string;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };
  financingContract?: {
    id: string;
    contractNumber: string;
    status: string;
  };
}

const statusLabels: Record<LetterStatus, { en: string; ar: string; color: string }> = {
  draft: { en: 'Draft', ar: 'مسودة', color: 'gray' },
  issued: { en: 'Issued', ar: 'صادر', color: 'blue' },
  sent: { en: 'Sent', ar: 'مرسل', color: 'yellow' },
  received: { en: 'Received', ar: 'مستلم', color: 'green' },
  not_received: { en: 'Not Received', ar: 'غير مستلم', color: 'red' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', color: 'red' },
};

const typeLabels: Record<LetterType, { en: string; ar: string }> = {
  receipt_acknowledgment: { en: 'Receipt Acknowledgment', ar: 'إقرار الاستلام' },
  delivery_notice: { en: 'Delivery Notice', ar: 'إشعار التسليم' },
  payment_reminder: { en: 'Payment Reminder', ar: 'تذكير بالدفع' },
  contract_expiry: { en: 'Contract Expiry', ar: 'انتهاء العقد' },
  general: { en: 'General', ar: 'عام' },
};

export default function LettersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [letters, setLetters] = useState<LetterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    // Detect locale from URL
    const path = window.location.pathname;
    if (path.startsWith('/ar')) {
      setLocale('ar');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/login?redirect=/${locale}/account/letters`);
      return;
    }

    if (user && isAuthenticated) {
      fetchLetters();
    }
  }, [user, isAuthenticated, authLoading, router, locale]);

  const fetchLetters = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const customerId = user?.id;
      if (!customerId) return;

      const response = await apiClient.get<{ items: LetterListItem[]; total: number }>(
        `/customers/${customerId}/letters?sort=createdAt&order=desc`
      );

      setLetters(response.items || []);
    } catch (err) {
      console.error("Error fetching letters:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load letters");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: LetterStatus) => {
    const colors = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
    };
    return colors[statusLabels[status].color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="container mx-auto px-4 py-8" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {locale === 'ar' ? 'خطاباتي' : 'My Letters'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {letters.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  {locale === 'ar' ? 'لا توجد خطابات حالياً.' : 'You have no letters at this time.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {letters.map((letter) => (
              <div
                key={letter.id}
                onClick={() => router.push(`/${locale}/account/letters/${letter.id}`)}
                className="cursor-pointer"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 font-mono">
                            {letter.letterNumber}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(letter.status)}`}
                          >
                            {statusLabels[letter.status][locale]}
                          </span>
                          <span className="text-sm text-gray-500">
                            {typeLabels[letter.type][locale]}
                          </span>
                        </div>
                        <p className="text-base font-medium text-gray-800 mb-2">
                          {letter.subject}
                        </p>
                        <div className="space-y-1 text-sm text-gray-600">
                          {letter.order && (
                            <p>
                              {locale === 'ar' ? 'الطلب' : 'Order'}: {letter.order.orderNumber}
                            </p>
                          )}
                          {letter.financingContract && (
                            <p>
                              {locale === 'ar' ? 'العقد' : 'Contract'}: {letter.financingContract.contractNumber}
                            </p>
                          )}
                          <p>
                            {locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}: {formatDate(letter.issueDate)}
                          </p>
                          {letter.sentDate && (
                            <p>
                              {locale === 'ar' ? 'تاريخ الإرسال' : 'Sent Date'}: {formatDate(letter.sentDate)}
                            </p>
                          )}
                          {letter.expiryDate && (
                            <p className="text-orange-600 font-medium">
                              {locale === 'ar' ? 'ينتهي في' : 'Expires'}: {formatDate(letter.expiryDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(letter.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
