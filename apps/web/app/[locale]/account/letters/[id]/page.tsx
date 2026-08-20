"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";

type LetterStatus = 'draft' | 'issued' | 'sent' | 'received' | 'not_received' | 'cancelled';
type LetterType = 'receipt_acknowledgment' | 'delivery_notice' | 'payment_reminder' | 'contract_expiry' | 'general';

interface LetterDocument {
  id: string;
  name: string;
  language: 'en' | 'ar';
  url: string;
  generatedAt: string;
}

interface LetterDetail {
  id: string;
  letterNumber: string;
  type: LetterType;
  status: LetterStatus;
  subject: string;
  content: string;
  issueDate?: string;
  sentDate?: string;
  receivedDate?: string;
  expiryDate?: string;
  createdAt: string;
  notes?: string;
  documents: LetterDocument[];
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
  creator: {
    id: string;
    name: string;
  };
  issuer?: {
    id: string;
    name: string;
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

export default function LetterDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const letterId = params.id as string;

  const [letter, setLetter] = useState<LetterDetail | null>(null);
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
      router.push(`/${locale}/login?redirect=/${locale}/account/letters/${letterId}`);
      return;
    }

    if (user && isAuthenticated && letterId) {
      fetchLetter();
    }
  }, [user, isAuthenticated, authLoading, router, locale, letterId]);

  const fetchLetter = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<LetterDetail>(`/customer/letters/${letterId}`);
      setLetter(response);
    } catch (err) {
      console.error("Error fetching letter:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load letter");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  if (error || !letter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-red-600">
                {error || (locale === 'ar' ? 'فشل تحميل الخطاب' : 'Failed to load letter')}
              </p>
              <div className="text-center mt-4">
                <Button onClick={() => router.push(`/${locale}/account/letters`)}>
                  {locale === 'ar' ? 'العودة إلى الخطابات' : 'Back to Letters'}
                </Button>
              </div>
            </CardContent>
          </Card>
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
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/account/letters`)}
            className="mb-4"
          >
            ← {locale === 'ar' ? 'العودة إلى الخطابات' : 'Back to Letters'}
          </Button>
          
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">
                {letter.letterNumber}
              </h1>
              <p className="text-gray-600">{typeLabels[letter.type][locale]}</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded ${getStatusColor(letter.status)}`}
            >
              {statusLabels[letter.status][locale]}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Content Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {letter.subject}
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-800 leading-relaxed">
                {letter.content}
              </div>
            </CardContent>
          </Card>

          {/* Documents Card */}
          {letter.documents && letter.documents.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {locale === 'ar' ? 'المستندات' : 'Documents'}
                </h3>
                <div className="space-y-3">
                  {letter.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(doc.generatedAt)} • {doc.language.toUpperCase()}
                        </p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        {locale === 'ar' ? 'تنزيل' : 'Download'} →
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Details Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {locale === 'ar' ? 'التفاصيل' : 'Details'}
              </h3>
              <div className="space-y-3 text-sm">
                {letter.order && (
                  <div>
                    <span className="text-gray-600">{locale === 'ar' ? 'الطلب' : 'Order'}:</span>{' '}
                    <span className="font-mono font-medium text-gray-900">
                      {letter.order.orderNumber}
                    </span>
                  </div>
                )}
                {letter.financingContract && (
                  <div>
                    <span className="text-gray-600">{locale === 'ar' ? 'العقد' : 'Contract'}:</span>{' '}
                    <span className="font-mono font-medium text-gray-900">
                      {letter.financingContract.contractNumber}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">
                    {locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}:
                  </span>{' '}
                  <span className="text-gray-900">{formatDate(letter.issueDate)}</span>
                </div>
                {letter.sentDate && (
                  <div>
                    <span className="text-gray-600">
                      {locale === 'ar' ? 'تاريخ الإرسال' : 'Sent Date'}:
                    </span>{' '}
                    <span className="text-gray-900">{formatDate(letter.sentDate)}</span>
                  </div>
                )}
                {letter.receivedDate && (
                  <div>
                    <span className="text-gray-600">
                      {locale === 'ar' ? 'تاريخ الاستلام' : 'Received Date'}:
                    </span>{' '}
                    <span className="text-gray-900">{formatDate(letter.receivedDate)}</span>
                  </div>
                )}
                {letter.expiryDate && (
                  <div>
                    <span className="text-gray-600">
                      {locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}:
                    </span>{' '}
                    <span className="font-medium text-orange-600">{formatDate(letter.expiryDate)}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">
                    {locale === 'ar' ? 'تم الإنشاء بواسطة' : 'Created By'}:
                  </span>{' '}
                  <span className="text-gray-900">{letter.creator.name}</span>
                </div>
                {letter.issuer && (
                  <div>
                    <span className="text-gray-600">
                      {locale === 'ar' ? 'تم الإصدار بواسطة' : 'Issued By'}:
                    </span>{' '}
                    <span className="text-gray-900">{letter.issuer.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {letter.notes && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {locale === 'ar' ? 'ملاحظات' : 'Notes'}
                </h3>
                <p className="text-sm text-gray-700">{letter.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
