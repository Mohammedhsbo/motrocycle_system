import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Activity, Banknote, Bike, Building2, CircleDollarSign, CreditCard, FileText, KeyRound, LayoutGrid, Package, Receipt, Settings, ShoppingBag, Store, Users, WalletCards, ArrowRightLeft, Plug } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Suppliers from './pages/Suppliers';
import Brands from './pages/Brands';
import Categories from './pages/Categories';
import Motorcycles from './pages/Motorcycles';
import MotorcycleForm from './pages/MotorcycleForm';
import Purchases from './pages/Purchases';
import PurchaseForm from './pages/PurchaseForm';
import PurchaseDetail from './pages/PurchaseDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Payments from './pages/Payments';
import PaymentForm from './pages/PaymentForm';
import PaymentDetail from './pages/PaymentDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import FinancingContracts from './pages/FinancingContracts';
import FinancingContractDetail from './pages/FinancingContractDetail';
import FinancingContractCreate from './pages/FinancingContractCreate';
import Transfers from './pages/Transfers';
import TransferCreate from './pages/TransferCreate';
import Letters from './pages/Letters';
import LetterDetail from './pages/LetterDetail';
import LetterCreate from './pages/LetterCreate';
import Reports from './pages/Reports';
import Configuration from './pages/Configuration';
import FeatureFlags from './pages/FeatureFlags';
import Branches from './pages/Branches';
import ConfigurationAudit from './pages/ConfigurationAudit';
import Integrations from './pages/Integrations';
import APIKeys from './pages/APIKeys';
import Login from './pages/Login';
import { clearToken, getToken, auth, reports } from './api';
import Badge from './components/Badge';
import { BranchGate, BranchProvider, useBranch } from './contexts/BranchContext';
import { ToastProvider } from './components/Toast';
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
  const { branchId, branches } = useBranch();
  const executive = useQuery({
    queryKey: ['dashboard-executive', branchId],
    queryFn: () => reports.getExecutiveDashboard({ preset: 'this_month', branches: branchId ?? undefined }),
    enabled: !!branchId,
  });
  const operational = useQuery({
    queryKey: ['dashboard-operational', branchId],
    queryFn: () => reports.getOperationalDashboard({ preset: 'this_month', branches: branchId ?? undefined }),
    enabled: !!branchId,
  });
  const stats = executive.data;
  const activity = [
    ...(operational.data?.recentOrders ?? []).map(item => ({ ...item, type: 'order' as const, label: item.orderNumber, detail: item.customerName, value: item.amount })),
    ...(operational.data?.recentPayments ?? []).map(item => ({ ...item, type: 'payment' as const, label: item.paymentReference, detail: item.customerName, value: item.amount })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const quickLinks = [
    { label: 'Suppliers', path: '/suppliers', icon: Package, tone: 'blue' },
    { label: 'Brands', path: '/brands', icon: Bike, tone: 'neutral' },
    { label: 'Purchases', path: '/purchases', icon: ShoppingBag, tone: 'warning' },
    { label: 'Customers', path: '/customers', icon: Users, tone: 'success' },
    { label: 'Orders', path: '/orders', icon: Store, tone: 'blue' },
    { label: 'Transfers', path: '/transfers', icon: ArrowRightLeft, tone: 'warning' },
    { label: 'Financing', path: '/financing', icon: CreditCard, tone: 'success' },
    { label: 'Invoices', path: '/invoices', icon: Receipt, tone: 'blue' },
    { label: 'Payments', path: '/payments', icon: WalletCards, tone: 'success' },
    { label: 'Branches', path: '/branches', icon: Building2, tone: 'blue' },
    { label: 'Letters', path: '/letters', icon: FileText, tone: 'warning' },
    { label: 'Configuration', path: '/configuration', icon: Settings, tone: 'neutral' },
    { label: 'Integrations', path: '/integrations', icon: Plug, tone: 'neutral' },
    { label: 'API Keys', path: '/api-keys', icon: KeyRound, tone: 'neutral' },
    { label: 'Reports', path: '/reports', icon: LayoutGrid, tone: 'blue' },
  ];
  const statCards = stats ? [
    { label: 'Active branches', value: branches.filter(branch => branch.isActive).length, icon: Building2, tone: 'blue' },
    { label: 'Available motorcycles', value: stats.inventory.available, icon: Bike, tone: 'success' },
    { label: 'Orders this month', value: stats.sales.orderCount, icon: ShoppingBag, tone: 'blue' },
    { label: 'Active financing', value: stats.financing.activeContracts, icon: CreditCard, tone: 'success' },
    { label: 'Overdue installments', value: stats.financing.overdueCount, icon: Activity, tone: stats.financing.overdueCount ? 'error' : 'neutral' },
    { label: 'Collected this month', value: `${stats.revenue.collectedAmount.toLocaleString('en-EG')} EGP`, icon: CircleDollarSign, tone: 'success' },
  ] : [];

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">MotoSystem Admin Panel</p>
          <h1>{isRtl ? 'لوحة التحكم' : 'Dashboard'}</h1>
          <p className="text-muted">{isRtl ? 'نظرة سريعة على عمليات الفرع' : 'A clear view of today’s operations and this month’s performance.'}</p>
        </div>
        <span className="dashboard-scope">{branches.find(branch => branch.id === branchId)?.nameEn ?? 'Current branch'}</span>
      </div>

      <section className="dashboard-section">
        <div className="section-heading"><div><p className="eyebrow">Overview</p><h2>Key stats</h2></div><span className="text-muted">This month</span></div>
        <div className="dashboard-stats">{executive.isLoading ? Array.from({ length: 6 }, (_, index) => <div className="card dashboard-stat skeleton" key={index} />) : statCards.map(stat => { const Icon = stat.icon; return <div className={`card dashboard-stat dashboard-tone-${stat.tone}`} key={stat.label}><div className="dashboard-stat-icon"><Icon size={18} /></div><span>{stat.label}</span><strong>{stat.value}</strong></div>; })}</div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading"><div><p className="eyebrow">Navigate</p><h2>Quick links</h2></div></div>
        <div className="dashboard-links">{quickLinks.map(link => { const Icon = link.icon; return <Link to={link.path} className="card dashboard-link" key={link.path}><span className={`dashboard-link-icon dashboard-tone-${link.tone}`}><Icon size={19} /></span><span>{isRtl ? ({ Suppliers: 'الموردون', Purchases: 'المشتريات', Customers: 'العملاء', Orders: 'الطلبات', Transfers: 'التحويلات', Financing: 'التمويل', Invoices: 'الفواتير', Payments: 'المدفوعات', Branches: 'الفروع', Letters: 'الخطابات', Configuration: 'الإعدادات', Integrations: 'التكاملات', 'API Keys': 'مفاتيح API', Reports: 'التقارير' } as Record<string, string>)[link.label] : link.label}</span></Link>; })}</div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading"><div><p className="eyebrow">Last 24 hours</p><h2>Recent activity</h2></div><Link to="/reports" className="text-link">View reports</Link></div>
        <div className="card activity-panel">{operational.isLoading ? Array.from({ length: 5 }, (_, index) => <div className="activity-skeleton" key={index} />) : activity.length === 0 ? <div className="empty-state"><Activity size={28} /><p>No recent activity</p></div> : activity.map(item => <div className="activity-item" key={`${item.type}-${item.id}`}><span className={`dashboard-link-icon dashboard-tone-${item.type === 'order' ? 'blue' : 'success'}`}>{item.type === 'order' ? <ShoppingBag size={17} /> : <Banknote size={17} />}</span><div><strong>{item.label}</strong><span>{item.detail} · {new Date(item.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><div className="activity-meta">{item.type === 'order' && <Badge status={item.status} lang={lang} />}<strong>{item.value.toLocaleString('en-EG')} EGP</strong></div></div>)}</div>
      </section>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [authenticated, setAuthenticated] = useState(() => Boolean(getToken()));

  if (!authenticated) {
    return <ToastProvider direction={lang === 'ar' ? 'rtl' : 'ltr'}><Login onLogin={() => setAuthenticated(true)} /></ToastProvider>;
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
    <ToastProvider direction={lang === 'ar' ? 'rtl' : 'ltr'}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BranchProvider>
            <BranchGate lang={lang}>
              <div className="app-container">
              <Sidebar lang={lang} onToggleLang={() => setLang(l => l === 'en' ? 'ar' : 'en')} onLogout={handleLogout} />
              <div className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard lang={lang} />} />
              <Route path="/suppliers" element={<Suppliers lang={lang} />} />
              <Route path="/brands" element={<Brands lang={lang} />} />
              <Route path="/categories" element={<Categories lang={lang} />} />
              <Route path="/motorcycles" element={<Motorcycles lang={lang} />} />
              <Route path="/motorcycles/new" element={<MotorcycleForm lang={lang} />} />
              <Route path="/motorcycles/:id/edit" element={<MotorcycleForm lang={lang} />} />
              <Route path="/purchases" element={<Purchases lang={lang} />} />
              <Route path="/purchases/new" element={<PurchaseForm lang={lang} />} />
              <Route path="/purchases/:id" element={<PurchaseDetail lang={lang} />} />
              <Route path="/invoices" element={<Invoices lang={lang} />} />
              <Route path="/invoices/:id" element={<InvoiceDetail lang={lang} />} />
              <Route path="/payments" element={<Payments lang={lang} />} />
              <Route path="/payments/new" element={<PaymentForm lang={lang} />} />
              <Route path="/payments/:id" element={<PaymentDetail lang={lang} />} />
              <Route path="/customers" element={<Customers lang={lang} />} />
              <Route path="/customers/:id" element={<CustomerDetail lang={lang} />} />
              <Route path="/customers/:id/edit" element={<CustomerForm lang={lang} />} />
              <Route path="/orders" element={<Orders lang={lang} />} />
              <Route path="/orders/:id" element={<OrderDetail lang={lang} />} />
              <Route path="/financing" element={<FinancingContracts lang={lang} />} />
              <Route path="/financing/new" element={<FinancingContractCreate lang={lang} />} />
              <Route path="/financing/:id" element={<FinancingContractDetail lang={lang} />} />
              <Route path="/letters" element={<Letters lang={lang} />} />
              <Route path="/letters/new" element={<LetterCreate lang={lang} />} />
              <Route path="/letters/:id" element={<LetterDetail lang={lang} />} />
              <Route path="/reports" element={<Reports lang={lang} />} />
              <Route path="/configuration" element={<Configuration lang={lang} />} />
              <Route path="/feature-flags" element={<FeatureFlags />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/configuration-audit" element={<ConfigurationAudit />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/api-keys" element={<APIKeys />} />
              <Route path="/transfers" element={<Transfers lang={lang} />} />
              <Route path="/transfers/new" element={<TransferCreate lang={lang} />} />
              <Route path="/transfers/:id" element={<Transfers lang={lang} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
              </div>
              </div>
            </BranchGate>
          </BranchProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ToastProvider>
  );
}
