import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import PurchaseForm from './pages/PurchaseForm';
import PurchaseDetail from './pages/PurchaseDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import FinancingContracts from './pages/FinancingContracts';
import FinancingContractDetail from './pages/FinancingContractDetail';
import Letters from './pages/Letters';
import LetterDetail from './pages/LetterDetail';
import Reports from './pages/Reports';
import Configuration from './pages/Configuration';
import FeatureFlags from './pages/FeatureFlags';
import Branches from './pages/Branches';
import ConfigurationAudit from './pages/ConfigurationAudit';
import Integrations from './pages/Integrations';
import APIKeys from './pages/APIKeys';
import Login from './pages/Login';
import { clearToken, getToken, auth } from './api';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Dashboard({ lang }: { lang: 'en' | 'ar' }) {
  const isRtl = lang === 'ar';
  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {isRtl ? 'لوحة التحكم' : 'Dashboard'}
      </h1>
      <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>
        {isRtl ? 'مرحباً بك في لوحة إدارة الدراجات النارية' : 'Welcome to the Motorcycle Management Admin Panel'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: isRtl ? 'الموردون' : 'Suppliers', path: '/suppliers', icon: '📦', color: '#3b82f6' },
          { label: isRtl ? 'المشتريات' : 'Purchases', path: '/purchases', icon: '🛒', color: '#8b5cf6' },
          { label: isRtl ? 'العملاء' : 'Customers', path: '/customers', icon: '👥', color: '#10b981' },
          { label: isRtl ? 'الطلبات' : 'Orders', path: '/orders', icon: '🛍️', color: '#f59e0b' },
          { label: isRtl ? 'التحويلات' : 'Transfers', path: '/transfers', icon: '🔄', color: '#ef4444' },
        ].map(card => (
          <a href={card.path} key={card.path} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer', borderLeft: `3px solid ${card.color}` }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{card.label}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [authenticated, setAuthenticated] = useState(() => Boolean(getToken()));

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  const handleLogout = async () => {
    try {
      await auth.logout();
    } finally {
      clearToken();
      setAuthenticated(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-container">
          <Sidebar lang={lang} onToggleLang={() => setLang(l => l === 'en' ? 'ar' : 'en')} onLogout={handleLogout} />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard lang={lang} />} />
              <Route path="/suppliers" element={<Suppliers lang={lang} />} />
              <Route path="/purchases" element={<Purchases lang={lang} />} />
              <Route path="/purchases/new" element={<PurchaseForm lang={lang} />} />
              <Route path="/purchases/:id" element={<PurchaseDetail lang={lang} />} />
              <Route path="/customers" element={<Customers lang={lang} />} />
              <Route path="/customers/:id" element={<CustomerDetail lang={lang} />} />
              <Route path="/customers/:id/edit" element={<CustomerForm lang={lang} />} />
              <Route path="/orders" element={<Orders lang={lang} />} />
              <Route path="/orders/:id" element={<OrderDetail lang={lang} />} />
              <Route path="/financing" element={<FinancingContracts lang={lang} />} />
              <Route path="/financing/:id" element={<FinancingContractDetail lang={lang} />} />
              <Route path="/letters" element={<Letters lang={lang} />} />
              <Route path="/letters/:id" element={<LetterDetail lang={lang} />} />
              <Route path="/reports" element={<Reports lang={lang} />} />
              <Route path="/configuration" element={<Configuration />} />
              <Route path="/feature-flags" element={<FeatureFlags />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/configuration-audit" element={<ConfigurationAudit />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/api-keys" element={<APIKeys />} />
              <Route path="/transfers" element={
                <div className="page-container" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                  <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {lang === 'ar' ? 'التحويلات' : 'Transfers'}
                  </h1>
                  <p className="text-muted">{lang === 'ar' ? 'سيتم تطبيق TASK-011 قريباً.' : 'Coming in TASK-011.'}</p>
                </div>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
