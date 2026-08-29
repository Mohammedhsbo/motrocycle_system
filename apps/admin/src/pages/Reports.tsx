import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import ExecutiveTab from '../components/reports/ExecutiveTab';
import SalesTab from '../components/reports/SalesTab';
import FinancialsTab from '../components/reports/FinancialsTab';
import InventoryTab from '../components/reports/InventoryTab';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Reports & Analytics',
    subtitle: 'Business Intelligence Dashboard',
    tabs: {
      executive: 'Executive',
      sales: 'Sales',
      financials: 'Financials',
      inventory: 'Inventory',
    },
    filters: {
      preset: 'Preset',
      customRange: 'Custom Range',
      branch: 'Branch ID',
      startDate: 'Start Date',
      endDate: 'End Date',
    },
    presets: {
      today: 'Today',
      this_week: 'This Week',
      this_month: 'This Month',
      last_month: 'Last Month',
      this_year: 'This Year',
      all_time: 'All Time',
    }
  },
  ar: {
    title: 'التقارير والتحليلات',
    subtitle: 'لوحة معلومات ذكاء الأعمال',
    tabs: {
      executive: 'تنفيذي',
      sales: 'المبيعات',
      financials: 'المالية',
      inventory: 'المخزون',
    },
    filters: {
      preset: 'الفترة',
      customRange: 'تخصيص',
      branch: 'الفرع',
      startDate: 'من تاريخ',
      endDate: 'إلى تاريخ',
    },
    presets: {
      today: 'اليوم',
      this_week: 'هذا الأسبوع',
      this_month: 'هذا الشهر',
      last_month: 'الشهر الماضي',
      this_year: 'هذا العام',
      all_time: 'كل الوقت',
    }
  },
};

export default function Reports({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  
  const [activeTab, setActiveTab] = useState<'executive' | 'sales' | 'financials' | 'inventory'>('executive');
  const [preset, setPreset] = useState('this_month');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomDate(true);
      setPreset('');
    } else {
      setIsCustomDate(false);
      setPreset(val);
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
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
            {i18n.subtitle}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
          <select 
            value={isCustomDate ? 'custom' : preset} 
            onChange={handlePresetChange}
            className="input"
            style={{ minWidth: '150px' }}
          >
            <option value="today">{i18n.presets.today}</option>
            <option value="this_week">{i18n.presets.this_week}</option>
            <option value="this_month">{i18n.presets.this_month}</option>
            <option value="last_month">{i18n.presets.last_month}</option>
            <option value="this_year">{i18n.presets.this_year}</option>
            <option value="all_time">{i18n.presets.all_time}</option>
            <option value="custom">{i18n.filters.customRange}</option>
          </select>
        </div>

        {isCustomDate && (
          <>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
              placeholder={i18n.filters.startDate}
            />
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
              placeholder={i18n.filters.endDate}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        {(['executive', 'sales', 'financials', 'inventory'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {i18n.tabs[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeTab === 'executive' && (
          <ExecutiveTab preset={preset} startDate={startDate} endDate={endDate} lang={lang} />
        )}
        {activeTab === 'sales' && (
          <SalesTab preset={preset} startDate={startDate} endDate={endDate} lang={lang} />
        )}
        {activeTab === 'financials' && (
          <FinancialsTab preset={preset} startDate={startDate} endDate={endDate} lang={lang} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab preset={preset} startDate={startDate} endDate={endDate} lang={lang} />
        )}
      </div>
    </div>
  );
}
