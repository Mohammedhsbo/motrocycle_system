'use client';

import { useState, useEffect } from 'react';
import { financialApi, type Invoice, type Payment, type FinancialSummary, type InvoiceStatus } from '../lib/financial-api';

interface Props {
  locale: string;
}

const translations = {
  en: {
    title: 'Financial History',
    summary: 'Summary',
    invoices: 'Invoices',
    payments: 'Payments',
    totalInvoiced: 'Total Invoiced',
    totalPaid: 'Total Paid',
    outstandingBalance: 'Outstanding Balance',
    invoiceCount: 'Invoices',
    paymentCount: 'Payments',
    invoiceNumber: 'Invoice',
    amount: 'Amount',
    paidAmount: 'Paid',
    remaining: 'Remaining',
    status: 'Status',
    date: 'Date',
    paymentRef: 'Payment Ref',
    method: 'Method',
    noInvoices: 'No invoices found',
    noPayments: 'No payments found',
    loading: 'Loading...',
    error: 'Failed to load',
    all: 'All',
    issued: 'Issued',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    overpaid: 'Overpaid',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    viewDetails: 'View Details',
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
  },
  ar: {
    title: 'السجل المالي',
    summary: 'الملخص',
    invoices: 'الفواتير',
    payments: 'الدفعات',
    totalInvoiced: 'إجمالي الفواتير',
    totalPaid: 'إجمالي المدفوع',
    outstandingBalance: 'الرصيد المستحق',
    invoiceCount: 'فواتير',
    paymentCount: 'دفعات',
    invoiceNumber: 'الفاتورة',
    amount: 'المبلغ',
    paidAmount: 'المدفوع',
    remaining: 'المتبقي',
    status: 'الحالة',
    date: 'التاريخ',
    paymentRef: 'رقم الدفعة',
    method: 'الطريقة',
    noInvoices: 'لا توجد فواتير',
    noPayments: 'لا توجد دفعات',
    loading: 'جاري التحميل...',
    error: 'فشل التحميل',
    all: 'الكل',
    issued: 'صادرة',
    partially_paid: 'مدفوعة جزئيًا',
    paid: 'مدفوعة',
    overpaid: 'مدفوعة زيادة',
    cancelled: 'ملغاة',
    refunded: 'مستردة',
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    viewDetails: 'عرض التفاصيل',
    completed: 'مكتملة',
    pending: 'معلقة',
    failed: 'فشلت',
  },
};

const INVOICE_STATUSES: InvoiceStatus[] = ['issued', 'partially_paid', 'paid', 'overpaid', 'cancelled', 'refunded'];

export default function FinancialHistory({ locale }: Props) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const isRtl = locale === 'ar';

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, invoicesData, paymentsData] = await Promise.all([
        financialApi.getSummary(),
        financialApi.getInvoices({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 50 }),
        financialApi.getPayments({ limit: 50 }),
      ]);
      setSummary(summaryData);
      setInvoices(invoicesData.items);
      setPayments(paymentsData.items);
    } catch (err) {
      console.error('Failed to load financial data:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      issued: '#3b82f6',
      partially_paid: '#f59e0b',
      paid: '#10b981',
      overpaid: '#8b5cf6',
      cancelled: '#6b7280',
      refunded: '#ef4444',
      completed: '#10b981',
      pending: '#f59e0b',
      failed: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>{t.title}</h1>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>{t.totalInvoiced}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatCurrency(summary.totalInvoiced)}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem' }}>{summary.invoiceCount} {t.invoiceCount}</div>
          </div>

          <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>{t.totalPaid}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatCurrency(summary.totalPaid)}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem' }}>{summary.paymentCount} {t.paymentCount}</div>
          </div>

          <div style={{ padding: '1.5rem', background: summary.outstandingBalance > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6b7280, #4b5563)', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>{t.outstandingBalance}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatCurrency(summary.outstandingBalance)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            color: activeTab === 'invoices' ? '#3b82f6' : '#6b7280',
            borderBottom: activeTab === 'invoices' ? '2px solid #3b82f6' : 'none',
            marginBottom: '-2px',
          }}
        >
          {t.invoices}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            color: activeTab === 'payments' ? '#3b82f6' : '#6b7280',
            borderBottom: activeTab === 'payments' ? '2px solid #3b82f6' : 'none',
            marginBottom: '-2px',
          }}
        >
          {t.payments}
        </button>
      </div>

      {/* Invoice Status Filters */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: statusFilter === 'all' ? '#3b82f6' : 'white',
              color: statusFilter === 'all' ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {t.all}
          </button>
          {INVOICE_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: statusFilter === status ? '#3b82f6' : 'white',
                color: statusFilter === status ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {t[status as keyof typeof t] as string}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          {t.loading}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{error}</div>
      ) : activeTab === 'invoices' ? (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>{t.noInvoices}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: isRtl ? 'right' : 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.invoiceNumber}</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.amount}</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.paidAmount}</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.remaining}</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.status}</th>
                    <th style={{ padding: '1rem', textAlign: isRtl ? 'left' : 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{invoice.invoiceNumber}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoice.totalAmount)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#10b981' }}>{formatCurrency(invoice.paidAmount)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: invoice.remainingAmount > 0 ? '#f59e0b' : '#6b7280' }}>{formatCurrency(invoice.remainingAmount)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: `${getStatusColor(invoice.status)}20`, color: getStatusColor(invoice.status) }}>
                          {t[invoice.status as keyof typeof t] as string}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: isRtl ? 'left' : 'right', fontSize: '0.875rem', color: '#6b7280' }}>{formatDate(invoice.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>{t.noPayments}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: isRtl ? 'right' : 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.paymentRef}</th>
                    <th style={{ padding: '1rem', textAlign: isRtl ? 'right' : 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.invoiceNumber}</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.amount}</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.method}</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.status}</th>
                    <th style={{ padding: '1rem', textAlign: isRtl ? 'left' : 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{payment.paymentReference}</td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem', color: '#6b7280' }}>{payment.invoice?.invoiceNumber || '—'}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatCurrency(payment.amount)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{t[payment.method as keyof typeof t] as string}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: `${getStatusColor(payment.status)}20`, color: getStatusColor(payment.status) }}>
                          {t[payment.status as keyof typeof t] as string}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: isRtl ? 'left' : 'right', fontSize: '0.875rem', color: '#6b7280' }}>{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
