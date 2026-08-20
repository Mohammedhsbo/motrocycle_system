import { useState, useEffect, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customers } from '../api';

interface Props {
  lang: 'en' | 'ar';
  onSelect: (customer: { id: string; name: string; phone: string }) => void;
  trigger?: ReactNode;
}

const t = {
  en: {
    search: 'Search customer by phone, name, email…',
    noResults: 'No customers found',
    searching: 'Searching…',
  },
  ar: {
    search: 'البحث عن عميل بالهاتف، الاسم، البريد…',
    noResults: 'لا يوجد عملاء',
    searching: 'جاري البحث…',
  },
};

export default function CustomerSearch({ lang, onSelect, trigger }: Props) {
  const i18n = t[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['customerSearch', debouncedQuery],
    queryFn: () => customers.search({ q: debouncedQuery, limit: 10 }),
    enabled: debouncedQuery.length >= 2,
  });

  const results = data ?? [];

  function handleSelect(customer: { id: string; name: string; phone: string }) {
    onSelect(customer);
    setIsOpen(false);
    setQuery('');
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <button className="btn btn-outline" onClick={() => setIsOpen(true)}>
          <Search size={16} /> {i18n.search}
        </button>
      )}

      {isOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '1.125rem' }}>{i18n.search}</h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '0.25rem',
                  borderRadius: 'var(--radius-sm)', transition: 'var(--transition)',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center gap-2" style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    autoFocus
                    className="input-field"
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}
                    placeholder={i18n.search}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {isLoading && query.length >= 2 && (
                <div className="center-content" style={{ padding: '2rem 0' }}>
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                  <span style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{i18n.searching}</span>
                </div>
              )}

              {!isLoading && query.length >= 2 && results.length === 0 && (
                <div className="center-content" style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {i18n.noResults}
                </div>
              )}

              {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {results.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelect(customer)}
                      className="card"
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{customer.name}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{customer.phone}</div>
                      {customer.email && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{customer.email}</div>
                      )}
                      {customer.defaultAddress && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {customer.defaultAddress.addressLine}
                          {customer.defaultAddress.city && `, ${customer.defaultAddress.city}`}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
