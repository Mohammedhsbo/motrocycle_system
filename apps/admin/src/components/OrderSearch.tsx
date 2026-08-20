import { useState } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import type { OrderStatus } from '../api';

interface OrderSearchProps {
  lang: 'en' | 'ar';
  onSearch: (filters: SearchFilters) => void;
  branches?: Array<{ id: string; nameEn: string; nameAr: string }>;
}

export interface SearchFilters {
  search?: string;
  status?: OrderStatus;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

const statusOptions: Array<{ value: OrderStatus | 'all'; label: { en: string; ar: string } }> = [
  { value: 'all', label: { en: 'All Status', ar: 'كل الحالات' } },
  { value: 'draft', label: { en: 'Draft', ar: 'مسودة' } },
  { value: 'confirmed', label: { en: 'Confirmed', ar: 'مؤكد' } },
  { value: 'processing', label: { en: 'Processing', ar: 'قيد المعالجة' } },
  { value: 'awaiting_delivery', label: { en: 'Awaiting Delivery', ar: 'في انتظار التسليم' } },
  { value: 'completed', label: { en: 'Completed', ar: 'مكتمل' } },
  { value: 'cancelled', label: { en: 'Cancelled', ar: 'ملغي' } },
  { value: 'refunded', label: { en: 'Refunded', ar: 'مسترد' } },
];

export default function OrderSearch({ lang, onSearch, branches = [] }: OrderSearchProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [branchId, setBranchId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = () => {
    const filters: SearchFilters = {};
    if (search.trim()) filters.search = search.trim();
    if (status !== 'all') filters.status = status;
    if (branchId !== 'all') filters.branchId = branchId;
    if (startDate) filters.startDate = new Date(startDate).toISOString();
    if (endDate) filters.endDate = new Date(endDate).toISOString();
    onSearch(filters);
  };

  const handleClear = () => {
    setSearch('');
    setStatus('all');
    setBranchId('all');
    setStartDate('');
    setEndDate('');
    onSearch({});
  };

  const hasFilters = search || status !== 'all' || branchId !== 'all' || startDate || endDate;
  const isRtl = lang === 'ar';

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        marginBottom: '1.5rem',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Search input */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '0.375rem',
            }}
          >
            {isRtl ? 'بحث' : 'Search'}
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                top: '50%',
                [isRtl ? 'right' : 'left']: '0.75rem',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={isRtl ? 'رقم الطلب، العميل، VIN...' : 'Order #, Customer, VIN...'}
              className="input"
              style={{
                [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Status filter */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '0.375rem',
            }}
          >
            {isRtl ? 'الحالة' : 'Status'}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}
            className="input"
            style={{ width: '100%' }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label[lang]}
              </option>
            ))}
          </select>
        </div>

        {/* Branch filter */}
        {branches.length > 0 && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.375rem',
              }}
            >
              {isRtl ? 'الفرع' : 'Branch'}
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="all">{isRtl ? 'كل الفروع' : 'All Branches'}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {lang === 'ar' ? branch.nameAr : branch.nameEn}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start date */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '0.375rem',
            }}
          >
            {isRtl ? 'من تاريخ' : 'From Date'}
          </label>
          <div style={{ position: 'relative' }}>
            <Calendar
              size={16}
              style={{
                position: 'absolute',
                top: '50%',
                [isRtl ? 'right' : 'left']: '0.75rem',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
              style={{
                [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* End date */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '0.375rem',
            }}
          >
            {isRtl ? 'إلى تاريخ' : 'To Date'}
          </label>
          <div style={{ position: 'relative' }}>
            <Calendar
              size={16}
              style={{
                position: 'absolute',
                top: '50%',
                [isRtl ? 'right' : 'left']: '0.75rem',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
              style={{
                [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
        {hasFilters && (
          <button onClick={handleClear} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            <X size={14} />
            {isRtl ? 'مسح' : 'Clear'}
          </button>
        )}
        <button onClick={handleSearch} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
          <Search size={14} />
          {isRtl ? 'بحث' : 'Search'}
        </button>
      </div>
    </div>
  );
}
