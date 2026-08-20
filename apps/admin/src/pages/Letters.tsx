import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Mail, RefreshCw, ChevronRight, Plus } from 'lucide-react';
import { letters, type LetterStatus, type LetterType } from '../api';
import Badge from '../components/Badge';

interface Props {
  lang: 'en' | 'ar';
}

interface SearchFilters {
  search?: string;
  type?: LetterType;
  status?: LetterStatus;
  customerId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
}

const t = {
  en: {
    title: 'Letters',
    subtitle: 'document management',
    letterNumber: 'Letter #',
    type: 'Type',
    customer: 'Customer',
    subject: 'Subject',
    status: 'Status',
    issueDate: 'Issue Date',
    sentDate: 'Sent Date',
    order: 'Order',
    contract: 'Contract',
    noData: 'No letters found.',
    loading: 'Loading…',
    error: 'Failed to load letters.',
    view: 'View',
    search: 'Search letters...',
    filterType: 'Filter by Type',
    filterStatus: 'Filter by Status',
    allTypes: 'All Types',
    allStatuses: 'All Statuses',
    createNew: 'Create Letter',
    types: {
      receipt_acknowledgment: 'Receipt Acknowledgment',
      delivery_notice: 'Delivery Notice',
      payment_reminder: 'Payment Reminder',
      contract_expiry: 'Contract Expiry',
      general: 'General',
    },
    statuses: {
      draft: 'Draft',
      issued: 'Issued',
      sent: 'Sent',
      received: 'Received',
      not_received: 'Not Received',
      cancelled: 'Cancelled',
    },
  },
  ar: {
    title: 'الخطابات',
    subtitle: 'إدارة المستندات',
    letterNumber: 'رقم الخطاب',
    type: 'النوع',
    customer: 'العميل',
    subject: 'الموضوع',
    status: 'الحالة',
    issueDate: 'تاريخ الإصدار',
    sentDate: 'تاريخ الإرسال',
    order: 'الطلب',
    contract: 'العقد',
    noData: 'لا يوجد خطابات.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
    view: 'عرض',
    search: 'البحث في الخطابات...',
    filterType: 'تصفية حسب النوع',
    filterStatus: 'تصفية حسب الحالة',
    allTypes: 'جميع الأنواع',
    allStatuses: 'جميع الحالات',
    createNew: 'إنشاء خطاب',
    types: {
      receipt_acknowledgment: 'إقرار الاستلام',
      delivery_notice: 'إشعار التسليم',
      payment_reminder: 'تذكير بالدفع',
      contract_expiry: 'انتهاء العقد',
      general: 'عام',
    },
    statuses: {
      draft: 'مسودة',
      issued: 'صادر',
      sent: 'مرسل',
      received: 'مستلم',
      not_received: 'غير مستلم',
      cancelled: 'ملغي',
    },
  },
};

export default function Letters({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['letters', filters, page],
    queryFn: () =>
      letters.list({
        ...filters,
        page,
        limit,
        sort: 'createdAt',
        order: 'desc',
      }),
  });

  const rows = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: LetterStatus): string => {
    switch (status) {
      case 'draft': return 'var(--text-muted)';
      case 'issued': return '#3b82f6';
      case 'sent': return '#f59e0b';
      case 'received': return '#10b981';
      case 'not_received': return '#ef4444';
      case 'cancelled': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{
              background: 'linear-gradient(135deg, #f8fafc, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {i18n.title}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {data?.total ?? 0} {i18n.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => refetch()} className="btn btn-outline" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <Link to="/letters/new" className="btn btn-primary">
            <Plus size={16} /> {i18n.createNew}
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={i18n.search}
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              flex: '1 1 300px',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          />
          <select
            value={filters.type ?? ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as LetterType || undefined })}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              minWidth: '150px',
            }}
          >
            <option value="">{i18n.allTypes}</option>
            <option value="receipt_acknowledgment">{i18n.types.receipt_acknowledgment}</option>
            <option value="delivery_notice">{i18n.types.delivery_notice}</option>
            <option value="payment_reminder">{i18n.types.payment_reminder}</option>
            <option value="contract_expiry">{i18n.types.contract_expiry}</option>
            <option value="general">{i18n.types.general}</option>
          </select>
          <select
            value={filters.status ?? ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as LetterStatus || undefined })}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              minWidth: '150px',
            }}
          >
            <option value="">{i18n.allStatuses}</option>
            <option value="draft">{i18n.statuses.draft}</option>
            <option value="issued">{i18n.statuses.issued}</option>
            <option value="sent">{i18n.statuses.sent}</option>
            <option value="received">{i18n.statuses.received}</option>
            <option value="not_received">{i18n.statuses.not_received}</option>
            <option value="cancelled">{i18n.statuses.cancelled}</option>
          </select>
        </form>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading && (
          <div className="center-content">
            <div className="spinner" />
            <span style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>{i18n.loading}</span>
          </div>
        )}
        {isError && (
          <div className="center-content" style={{ color: 'var(--error)' }}>
            <span>{i18n.error}</span>
            <button className="btn btn-outline mt-4" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="center-content">
            <Mail size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
          </div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>{i18n.letterNumber}</th>
                  <th>{i18n.type}</th>
                  <th>{i18n.customer}</th>
                  <th>{i18n.subject}</th>
                  <th>{i18n.status}</th>
                  <th>{i18n.issueDate}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((letter) => (
                  <tr key={letter.id}>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {letter.letterNumber}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {i18n.types[letter.type]}
                      </div>
                      {letter.order && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {i18n.order}: {letter.order.orderNumber}
                        </div>
                      )}
                      {letter.financingContract && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {i18n.contract}: {letter.financingContract.contractNumber}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {letter.customer.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {letter.customer.phone}
                      </div>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {letter.subject}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: `${getStatusColor(letter.status)}15`,
                          color: getStatusColor(letter.status),
                        }}
                      >
                        {i18n.statuses[letter.status]}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formatDate(letter.issueDate)}
                    </td>
                    <td>
                      <Link
                        to={`/letters/${letter.id}`}
                        className="btn btn-outline"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.8rem' }}
                      >
                        {i18n.view} <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1.5rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline"
                  style={{ fontSize: '0.875rem' }}
                >
                  {isRtl ? '→' : '←'}
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline"
                  style={{ fontSize: '0.875rem' }}
                >
                  {isRtl ? '←' : '→'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
