import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, Bike, Building2, CircleDollarSign, ClipboardList, LogOut, Menu, Package, Plus, Printer, ShoppingCart, Users, WalletCards, X } from 'lucide-react';
import { auth, getToken, clearToken, notifications, pos } from './api';
import LoginScreen from './LoginScreen';
import ReceivePurchase from './pages/ReceivePurchase';
import CreateOrder from './pages/CreateOrder';
import OrdersPOS from './pages/OrdersPOS';
import OrderDetailPOS from './pages/OrderDetailPOS';
import CreateReservation from './pages/CreateReservation';
import ReservationsPOS from './pages/ReservationsPOS';
import ReservationDetailPOS from './pages/ReservationDetailPOS';
import './index.css';
import POSMain from './pages/POSMain';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Installments from './pages/Installments';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Suppliers from './pages/Suppliers';
import PrinterSettings from './pages/PrinterSettings';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

type Lang = 'en' | 'ar';

const navItems = [
  { path: '/pos', icon: ShoppingCart, en: 'Point of Sale', ar: 'نقطة البيع' },
  { path: '/dashboard', icon: BarChart3, en: 'Dashboard', ar: 'لوحة التحكم' },
  { path: '/orders', icon: ClipboardList, en: 'Sales', ar: 'المبيعات' },
  { path: '/reservations', icon: ClipboardList, en: 'Reservations', ar: 'الحجوزات' },
  { path: '/receive', icon: Package, en: 'Receiving', ar: 'الاستلام' },
  { path: '/inventory', icon: Bike, en: 'Inventory', ar: 'المخزون' },
  { path: '/customers', icon: Users, en: 'Customers', ar: 'العملاء' },
  { path: '/installments', icon: WalletCards, en: 'Installments', ar: 'الأقساط' },
  { path: '/reports', icon: BarChart3, en: 'Reports', ar: 'التقارير' },
  { path: '/notifications', icon: Bell, en: 'Notifications', ar: 'الإشعارات' },
  { path: '/suppliers', icon: Building2, en: 'Suppliers', ar: 'الموردون' },
  { path: '/printers', icon: Printer, en: 'Printers', ar: 'الطابعات' },
];

function Dashboard({ lang }: { lang: Lang }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pos-dashboard'],
    queryFn: pos.getDashboard,
    refetchInterval: 30_000,
  });
  const isRtl = lang === 'ar';
  const money = (value: number) => value.toLocaleString(isRtl ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 0 });
  const cards = data ? [
    { icon: CircleDollarSign, label: isRtl ? 'مبيعات اليوم' : "Today's sales", value: `${money(data.todayStats.totalSales)} ${isRtl ? 'ج.م' : 'EGP'}`, tone: 'orange' },
    { icon: WalletCards, label: isRtl ? 'الطلبات اليوم' : "Today's orders", value: String(data.todayStats.ordersCreated), tone: 'blue' },
    { icon: Bike, label: isRtl ? 'دراجات متاحة' : 'Available motorcycles', value: String(data.todayStats.availableMotorcycles), tone: 'green' },
    { icon: ClipboardList, label: isRtl ? 'الحجوزات اليوم' : "Today's reservations", value: String(data.todayStats.reservationsCreated), tone: 'purple' },
  ] : [];

  if (window.location.pathname === '/printers') {
    return <PrinterSettings lang={lang} />;
  }

  return (
    <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{isRtl ? 'نظرة سريعة' : 'Store overview'}</span>
          <h1>{isRtl ? 'لوحة التحكم' : 'Dashboard'}</h1>
          <p>{isRtl ? 'تابع حركة الفرع وابدأ عملية بيع جديدة.' : 'Monitor the branch and start a new sale.'}</p>
        </div>
        <NavLink className="primary-action" to="/pos"><Plus size={17} /> {isRtl ? 'بيع جديد' : 'New sale'}</NavLink>
      </div>
      {isLoading && <div className="dashboard-grid">{[1, 2, 3, 4].map(item => <div className="metric-card skeleton" key={item} />)}</div>}
      {isError && <div className="state-panel"><p>{isRtl ? 'تعذر تحميل بيانات الفرع.' : 'Could not load branch data.'}</p><button className="secondary-action" onClick={() => refetch()}>{isRtl ? 'إعادة المحاولة' : 'Retry'}</button></div>}
      {!isLoading && !isError && data && <>
        <div className="dashboard-grid">
          {cards.map(({ icon: Icon, label, value, tone }) => <div className={`metric-card metric-${tone}`} key={label}><div className="metric-icon"><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small>{isRtl ? 'محدث الآن' : 'Updated just now'}</small></div>)}
        </div>
        <div className="dashboard-lower">
          <div className="surface-panel">
            <div className="panel-heading"><div><span className="eyebrow">{isRtl ? 'آخر العمليات' : 'Activity'}</span><h2>{isRtl ? 'آخر العمليات' : 'Recent transactions'}</h2></div><NavLink to="/orders">{isRtl ? 'عرض الكل' : 'View all'}</NavLink></div>
            {data.recentTransactions.length === 0 ? <div className="empty-state">{isRtl ? 'لا توجد عمليات حتى الآن.' : 'No transactions yet.'}</div> : <div className="activity-list">{data.recentTransactions.map(item => <div className="activity-row" key={item.id}><div className="activity-mark"><Bike size={16} /></div><div><strong>{item.customerName}</strong><span>{item.motorcycleModel} · {item.number}</span></div><b>{money(item.amount)} {isRtl ? 'ج.م' : 'EGP'}</b></div>)}</div>}
          </div>
          <div className="surface-panel branch-panel"><span className="eyebrow">{isRtl ? 'الفرع والموظف' : 'Branch & employee'}</span><h2>{isRtl ? data.currentUser.branch.nameAr : data.currentUser.branch.nameEn}</h2><p>{data.currentUser.name}</p><span className="role-pill">{data.currentUser.role}</span><div className="branch-rule" /><small>{isRtl ? 'الصلاحيات تطبق من الخادم على كل عملية.' : 'Permissions are enforced by the server for every action.'}</small></div>
        </div>
      </>}
    </section>
  );
}

function DesktopShell({ lang, setLang, onLogout }: { lang: Lang; setLang: (lang: Lang) => void; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isRtl = lang === 'ar';
  const activeLabel = navItems.find(item => location.pathname.startsWith(item.path));
  const unread = useQuery({ queryKey: ['desktop-notification-count'], queryFn: notifications.unreadCount, refetchInterval: 30_000 });
  return <div className={`desktop-shell ${collapsed ? 'sidebar-collapsed' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
    <aside className="desktop-sidebar">
      <div className="brand-lockup"><button className="brand-emblem" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? (isRtl ? 'فتح القائمة' : 'Open dashboard menu') : (isRtl ? 'إغلاق القائمة' : 'Close dashboard menu')} title={collapsed ? (isRtl ? 'فتح القائمة' : 'Open menu') : (isRtl ? 'إغلاق القائمة' : 'Close menu')}><Bike size={20} /></button>{!collapsed && <div><strong>Moto<span>System</span></strong><small>{isRtl ? 'نظام الوكالة' : 'Dealership POS'}</small></div>}</div>
      <nav className="desktop-nav">{navItems.map(({ path, icon: Icon, en, ar }) => <NavLink key={path} to={path} className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`} title={collapsed ? (isRtl ? ar : en) : undefined}><Icon size={18} /><span>{isRtl ? ar : en}</span></NavLink>)}</nav>
        <div className="sidebar-footer"><button className="desktop-nav-link logout-link" onClick={onLogout}><LogOut size={18} /><span>{isRtl ? 'تسجيل الخروج' : 'Sign out'}</span></button></div>
    </aside>
    <div className="desktop-main"><header className="desktop-topbar"><button className="icon-button" onClick={() => setCollapsed(!collapsed)} title={isRtl ? 'القائمة' : 'Menu'}>{collapsed ? <Menu size={19} /> : <X size={19} />}</button><div className="topbar-context"><strong>{isRtl ? activeLabel?.ar : activeLabel?.en}</strong><span>{new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><div className="topbar-actions"><NavLink className="notification-button" to="/notifications" title={isRtl ? 'الإشعارات' : 'Notifications'}><Bell size={18} />{(unread.data?.count || 0) > 0 && <b>{unread.data?.count}</b>}</NavLink><span className="connection-dot"><i />{isRtl ? 'متصل' : 'Connected'}</span><button className="language-button" onClick={() => setLang(isRtl ? 'en' : 'ar')}>{isRtl ? 'English' : 'العربية'}</button></div></header><main className="desktop-content"><Routes><Route path="/" element={<Dashboard lang={lang} />} /><Route path="/dashboard" element={<Dashboard lang={lang} />} /><Route path="/pos" element={<POSMain lang={lang} onBack={() => undefined} />} /><Route path="/orders" element={<OrdersPOS lang={lang} />} /><Route path="/orders/new" element={<CreateOrder lang={lang} />} /><Route path="/orders/:id" element={<OrderDetailPOS lang={lang} />} /><Route path="/reservations" element={<ReservationsPOS lang={lang} />} /><Route path="/reservations/new" element={<CreateReservation lang={lang} />} /><Route path="/reservations/:id" element={<ReservationDetailPOS lang={lang} />} /><Route path="/receive" element={<ReceivePurchase lang={lang} />} /><Route path="/inventory" element={<Inventory lang={lang} />} /><Route path="/customers" element={<Customers lang={lang} />} /><Route path="/installments" element={<Installments lang={lang} />} /><Route path="/reports" element={<Reports lang={lang} />} /><Route path="/notifications" element={<Notifications lang={lang} />} /><Route path="/suppliers" element={<Suppliers lang={lang} />} /><Route path="*" element={<Dashboard lang={lang} />} /></Routes></main></div>
  </div>;
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('pos_language') as Lang) || 'ar');
  const setLang = (next: Lang) => { setLangState(next); localStorage.setItem('pos_language', next); };

  useEffect(() => {
    const handleExpired = () => setAuthed(false);
    window.addEventListener('pos-auth-expired', handleExpired);
    return () => window.removeEventListener('pos-auth-expired', handleExpired);
  }, []);

  if (!authed) {
    return (
      <QueryClientProvider client={qc}>
        <LoginScreen lang={lang} onLogin={() => setAuthed(true)} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <DesktopShell lang={lang} setLang={setLang} onLogout={async () => { try { await auth.logout(); } finally { clearToken(); setAuthed(false); } }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
