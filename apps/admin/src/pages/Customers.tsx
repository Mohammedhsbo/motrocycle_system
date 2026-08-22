import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, RefreshCw, Eye, Filter } from 'lucide-react';
import { customers, type Customer } from '../api';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    title: 'Customers', add: 'Add Customer', search: 'Search by name, phone, email…',
    name: 'Name', phone: 'Phone', email: 'Email', nationalId: 'National ID', status: 'Status',
    orders: 'Orders', lastOrder: 'Last Order', created: 'Created', actions: 'Actions',
    noData: 'No customers found.', loading: 'Loading…', error: 'Failed to load customers.',
    view: 'View', hasEmail: 'Has Email', hasNationalId: 'Has National ID', showActive: 'Active Only',
    showInactive: 'Include Inactive', clearFilters: 'Clear Filters', filters: 'Filters',
    page: 'Page', of: 'of', prev: 'Previous', next: 'Next', never: '—',
  },
  ar: {
    title: 'العملاء', add: 'إضافة عميل', search: 'البحث بالاسم، الهاتف، البريد…',
    name: 'الاسم', phone: 'الهاتف', email: 'البريد الإلكتروني', nationalId: 'رقم الهوية', status: 'الحالة',
    orders: 'الطلبات', lastOrder: 'آخر طلب', created: 'أنشئ في', actions: 'الإجراءات',
    noData: 'لا يوجد عملاء.', loading: 'جاري التحميل…', error: 'فشل تحميل العملاء.',
    view: 'عرض', hasEmail: 'لديه بريد', hasNationalId: 'لديه هوية', showActive: 'النشطون فقط',
    showInactive: 'تضمين غير النشطين', clearFilters: 'مسح الفلاتر', filters: 'الفلاتر',
    page: 'الصفحة', of: 'من', prev: 'السابق', next: 'التالي', never: '—',
  },
};

function maskNationalId(id?: string): string {
  if (!id) return '—';
  if (id.length <= 4) return id;
  return '******' + id.slice(-4);
}

export default function Customers({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasEmail, setHasEmail] = useState<boolean | undefined>(undefined);
  const [hasNationalId, setHasNationalId] = useState<boolean | undefined>(undefined);
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', debouncedSearch, page, hasEmail, hasNationalId, isActive],
    queryFn: () => customers.list({
      search: debouncedSearch || undefined,
      page,
      limit: 20,
      hasEmail,
      hasNationalId,
      isActive,
      sort: 'createdAt',
      order: 'desc',
    }),
  });

  const rows = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  function clearFilters() {
    setHasEmail(undefined);
    setHasNationalId(undefined);
    setIsActive(true);
  }

  const hasActiveFilters = hasEmail !== undefined || hasNationalId !== undefined || isActive !== true;

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {i18n.title}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {isRtl ? `${data?.total ?? 0} عميل` : `${data?.total ?? 0} customers`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>
          <Plus size={16} /> {i18n.add}
        </button>
      </div>

      {/* Search and filters bar */}
      <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            placeholder={i18n.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.375rem 0.75rem' }}
          >
            <Filter size={14} /> {i18n.filters}
          </button>
          <button onClick={() => refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasEmail === true}
                onChange={e => setHasEmail(e.target.checked ? true : undefined)}
              />
              <span style={{ fontSize: '0.875rem' }}>{i18n.hasEmail}</span>
            </label>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasNationalId === true}
                onChange={e => setHasNationalId(e.target.checked ? true : undefined)}
              />
              <span style={{ fontSize: '0.875rem' }}>{i18n.hasNationalId}</span>
            </label>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive === undefined}
                onChange={e => setIsActive(e.target.checked ? undefined : true)}
              />
              <span style={{ fontSize: '0.875rem' }}>{i18n.showInactive}</span>
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>
                {i18n.clearFilters}
              </button>
            )}
          </div>
        )}
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
            <button className="btn btn-outline mt-4" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="center-content">
            <Users size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/customers/new')}>
              <Plus size={16} /> {i18n.add}
            </button>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>{i18n.name}</th>
                  <th>{i18n.phone}</th>
                  <th>{i18n.email}</th>
                  <th>{i18n.nationalId}</th>
                  <th>{i18n.orders}</th>
                  <th>{i18n.status}</th>
                  <th>{i18n.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{c.phone}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{c.email || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.875rem' }}>{maskNationalId(c.nationalId)}</td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 600 }}>{c.orderCount ?? 0}</div>
                        {c.lastOrderDate && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(c.lastOrderDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><Badge status={c.isActive ? 'active' : 'inactive'} lang={lang} /></td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.875rem' }}
                        onClick={() => navigate(`/customers/${c.id}`)}
                        title={i18n.view}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between" style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {i18n.page} {page} {i18n.of} {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '0.375rem 0.75rem' }}
                  >
                    {i18n.prev}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '0.375rem 0.75rem' }}
                  >
                    {i18n.next}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
