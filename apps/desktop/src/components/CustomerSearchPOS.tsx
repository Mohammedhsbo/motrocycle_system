import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pos, type CustomerSearchResult } from '../api';
import CustomerCard from './CustomerCard';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

interface CustomerSearchPOSProps {
  lang: 'en' | 'ar';
  onSelect: (customer: CustomerSearchResult) => void;
  onCreateNew?: () => void;
  onClose?: () => void;
}

export default function CustomerSearchPOS({ lang, onSelect, onCreateNew, onClose }: CustomerSearchPOSProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isRtl = lang === 'ar';

  const { data: customers, isLoading, isError, refetch } = useQuery({
    queryKey: ['pos-customers', query],
    queryFn: () => pos.searchCustomers(query),
    enabled: query.length >= 2,
  });

  const results = customers || [];

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useKeyboardNav({
    onF1: onCreateNew,
    onEscape: () => onClose && onClose(),
    onEnter: () => {
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex]);
      }
    },
    onTab: () => {
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
  };



  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isRtl
            ? 'البحث عن عميل (الاسم، الهاتف، البريد الإلكتروني)'
            : 'Search Customer (Name, Phone, Email)'}
        </label>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRtl ? 'ابحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...'
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="mt-1 text-xs text-gray-500">
          {isRtl
            ? 'استخدم الأسهم للتنقل، Enter للاختيار، F1 لإنشاء عميل جديد'
            : 'Use arrows to navigate, Enter to select, F1 to create new customer'}
        </div>
      </div>

      {/* Create New Button */}
      <div>
        <button
          onClick={onCreateNew}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          {isRtl ? '+ إنشاء عميل جديد (F1)' : '+ Create New Customer (F1)'}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      )}

      {isError && (
        <div className="state-panel" role="alert">
          <p>{isRtl ? 'تعذر تحميل العملاء.' : 'Could not load customers.'}</p>
          <button className="secondary-action" onClick={() => refetch()}>{isRtl ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
      )}

      {/* Results */}
      {!isLoading && !isError && results.length > 0 && (
        <div className="space-y-3">
          {results.map((customer: any, index: number) => (
            <button
              key={customer.id}
              onClick={() => onSelect(customer)}
              className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                index === selectedIndex
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CustomerCard customer={customer} lang={lang} />
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && !isError && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            {isRtl ? 'لا توجد نتائج' : 'No results found'}
          </p>
          <button
            onClick={onCreateNew}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {isRtl ? 'إنشاء عميل جديد' : 'Create New Customer'}
          </button>
        </div>
      )}

      {/* Initial State */}
      {!isLoading && !isError && query.length < 2 && (
        <div className="text-center py-8 text-gray-500">
          {isRtl
            ? 'ابدأ بكتابة حرفين على الأقل للبحث'
            : 'Start typing at least 2 characters to search'}
        </div>
      )}
    </div>
  );
}
