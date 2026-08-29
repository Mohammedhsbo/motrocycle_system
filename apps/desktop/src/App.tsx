import { useEffect, useState, type ReactElement } from 'react';
import { BrowserRouter, NavLink, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, BarChart3, Bell, Bike, Building2, CircleDollarSign, ClipboardList, Clock, FileImage, LogOut, Menu, Package, Plus, Printer, RefreshCw, Shield, ShoppingCart, Users, WalletCards, X } from 'lucide-react';
import { auth, branches, desktopPermissions, getToken, getUser, setUser, clearToken, clearUser, notifications, pos, type DesktopUser } from './api';
import { useViewingBranch, ViewingBranchProvider } from './contexts/ViewingBranchContext';
import LoginScreen from './LoginScreen';
import ReceivePurchase from './pages/ReceivePurchase';
import CreateOrder from './pages/CreateOrder';
import OrdersPOS from './pages/OrdersPOS';
import OrderDetailPOS from './pages/OrderDetailPOS';
import CreateReservation from './pages/CreateReservation';
import ReservationsPOS from './pages/ReservationsPOS';
import ReservationDetailPOS from './pages/ReservationDetailPOS';
import './index.css';
import Inventory from './pages/Inventory';
import InventoryDetail from './pages/InventoryDetail';
import Customers from './pages/Customers';
import Installments from './pages/Installments';
import InstallmentDetail from './pages/InstallmentDetail';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Suppliers from './pages/Suppliers';
import PrinterSettings from './pages/PrinterSettings';
import OfflineSync from './pages/OfflineSync';
import TransactionHistory from './pages/TransactionHistory';
import AccountManagement from './pages/AccountManagement';
import MyAccount from './pages/MyAccount';
import CustomerInquiries from './pages/CustomerInquiries';
import Transfers from './pages/Transfers';
import TransferCreate from './pages/TransferCreate';
import FinancingCompanies from './pages/FinancingCompanies';
import Sales from './pages/Sales';
import PosInstallments from './pages/PosInstallments';
import DesktopPermissionsPage from './pages/DesktopPermissions';
import Attendance from './pages/Attendance';
import Branches from './pages/Branches';


const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

type Lang = 'en' | 'ar';

const navItems = [
  { path: '/dashboard', icon: BarChart3, en: 'Dashboard', ar: 'لوحة التحكم', pageKey: 'dashboard' },
  { path: '/sales', icon: ShoppingCart, en: 'Sales', ar: 'المبيعات', pageKey: 'sales' },
  { path: '/pos-installments', icon: WalletCards, en: 'POS Installments', ar: 'أقساط المبيعات', pageKey: 'pos-installments' },
  { path: '/orders', icon: ClipboardList, en: 'Orders', ar: 'الطلبات', pageKey: 'orders' },
  { path: '/reservations', icon: ClipboardList, en: 'Reservations', ar: 'الحجوزات', pageKey: 'reservations' },
  { path: '/offline-sync', icon: RefreshCw, en: 'Offline sync', ar: 'المزامنة', pageKey: 'offline-sync' },
  { path: '/history', icon: ClipboardList, en: 'Transaction history', ar: 'سجل المعاملات', pageKey: 'history' },
  { path: '/inventory', icon: Bike, en: 'Inventory', ar: 'المخزون', pageKey: 'inventory' },
  { path: '/transfers', icon: ArrowRightLeft, en: 'Transfers', ar: 'التحويلات', pageKey: 'transfers' },
  { path: '/customers', icon: Users, en: 'Customers', ar: 'العملاء', pageKey: 'customers' },
  { path: '/inquiries', icon: FileImage, en: 'Inquiries', ar: 'استعلامات', pageKey: 'inquiries' },
  { path: '/installments', icon: WalletCards, en: 'Installments', ar: 'الأقساط', pageKey: 'installments' },
  { path: '/reports', icon: BarChart3, en: 'Reports', ar: 'التقارير', pageKey: 'reports' },
  { path: '/notifications', icon: Bell, en: 'Notifications', ar: 'الإشعارات', pageKey: 'notifications' },
  { path: '/suppliers', icon: Building2, en: 'Suppliers', ar: 'الموردون', pageKey: 'suppliers' },
  { path: '/financing-companies', icon: CircleDollarSign, en: 'Financing Companies', ar: 'شركات التمويل', pageKey: 'financing-companies' },
  { path: '/printers', icon: Printer, en: 'Printers', ar: 'الطابعات', pageKey: 'printers' },
  { path: '/branches', icon: Building2, en: 'Branches management', ar: 'إدارة الفروع', adminOnly: true },
  { path: '/accounts', icon: Users, en: 'Account management', ar: 'إدارة الحسابات', adminOnly: true },
  { path: '/desktop-permissions', icon: Shield, en: 'Permissions', ar: 'الصلاحيات', adminOnly: true },
  { path: '/attendance', icon: Clock, en: 'Attendance', ar: 'الحضور والانصراف' },
  { path: '/my-account', icon: Users, en: 'My account', ar: 'حسابي' },
];

const permissionForPath: Record<string, [string, string]> = {
  '/installments': ['financing_contract', 'read'],
  '/reports': ['report', 'read'],
  '/suppliers': ['supplier', 'read'],
  '/transfers': ['transfer', 'read'],
  '/financing-companies': ['setting', 'read'],
};

function canAccessPath(user: DesktopUser | null, path: string) {
  const required = permissionForPath[path];
  if (!required) return true;
  if (user?.role.name === 'super_admin') return true;
  return user?.role.permissions.some((permission) => permission.resource === required[0] && permission.action === required[1]) ?? false;
}

function AccessDenied({ lang }: { lang: Lang }) {
  return <section className="desktop-page" dir={lang === 'ar' ? 'rtl' : 'ltr'}><div className="state-panel">{lang === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة.' : 'You do not have permission to access this page.'}</div></section>;
}

function gatedRoute(user: DesktopUser, lang: Lang, path: string, element: ReactElement) {
  return canAccessPath(user, path) ? element : <AccessDenied lang={lang} />;
}

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
        <NavLink className="primary-action" to="/sales"><Plus size={17} /> {isRtl ? 'بيع جديد' : 'New sale'}</NavLink>
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
          <div className="surface-panel branch-panel"><span className="eyebrow">{isRtl ? 'الفرع والموظف' : 'Branch & employee'}</span><h2>{data.currentUser.branch ? (isRtl ? data.currentUser.branch.nameAr : data.currentUser.branch.nameEn) : (isRtl ? 'كل الفروع' : 'All branches')}</h2><p>{data.currentUser.name}</p><span className="role-pill">{data.currentUser.role}</span><div className="branch-rule" /><small>{isRtl ? 'الصلاحيات تطبق من الخادم على كل عملية.' : 'Permissions are enforced by the server for every action.'}</small></div>
        </div>
      </>}
    </section>
  );
}

function DesktopShell({ lang, setLang, user, onLogout }: { lang: Lang; setLang: (lang: Lang) => void; user: DesktopUser; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isRtl = lang === 'ar';
  const isSuperAdmin = user.role.name === 'super_admin';
  const { viewingBranchId, setViewingBranchId } = useViewingBranch();
  const branchQuery = useQuery({ queryKey: ['active-branches'], queryFn: branches.list, enabled: isSuperAdmin });
  const selectedBranchId = isSuperAdmin ? viewingBranchId ?? undefined : user.branchId ?? undefined;
  const activeLabel = navItems.find(item => location.pathname.startsWith(item.path));
  const unread = useQuery({ queryKey: ['desktop-notification-count'], queryFn: notifications.unreadCount, refetchInterval: 30_000 });

  // Fetch desktop-specific permissions for non-super_admin users
  const myPermsQuery = useQuery({
    queryKey: ['my-desktop-perms'],
    queryFn: desktopPermissions.getMe,
    enabled: !isSuperAdmin,
    staleTime: 60_000,
  });

  const isPageVisible = (pageKey: string | undefined): boolean => {
    if (!pageKey) return true;         // items without pageKey are always shown
    if (isSuperAdmin) return true;     // super_admin sees everything
    if (!myPermsQuery.data) return true; // default: show while loading
    const perm = myPermsQuery.data.find((p) => p.pageKey === pageKey);
    return perm ? perm.canView : true; // default true if no record
  };

  const restrictedPages = {
    installments: gatedRoute(user, lang, '/installments', <Installments lang={lang} />),
    reports: gatedRoute(user, lang, '/reports', <Reports lang={lang} />),
    suppliers: gatedRoute(user, lang, '/suppliers', <Suppliers lang={lang} />),
    transfers: gatedRoute(user, lang, '/transfers', <Transfers lang={lang} />),
  };
  return <div className={`desktop-shell ${collapsed ? 'sidebar-collapsed' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
    <aside className="desktop-sidebar">
      <div className="brand-lockup"><button className="brand-emblem" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? (isRtl ? 'فتح القائمة' : 'Open dashboard menu') : (isRtl ? 'إغلاق القائمة' : 'Close dashboard menu')} title={collapsed ? (isRtl ? 'فتح القائمة' : 'Open menu') : (isRtl ? 'إغلاق القائمة' : 'Close menu')}><Bike size={20} /></button>{!collapsed && <div><strong>Moto<span>System</span></strong><small>{isRtl ? 'نظام الوكالة' : 'Dealership POS'}</small></div>}</div>
      <nav className="desktop-nav">{navItems.filter(({ path, adminOnly, pageKey }) => (!adminOnly || isSuperAdmin) && canAccessPath(user, path) && isPageVisible(pageKey)).map(({ path, icon: Icon, en, ar }) => <NavLink key={path} to={path} className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`} title={collapsed ? (isRtl ? ar : en) : undefined}><Icon size={18} /><span>{isRtl ? ar : en}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><button className="desktop-nav-link logout-link" onClick={onLogout}><LogOut size={18} /><span>{isRtl ? 'تسجيل الخروج' : 'Sign out'}</span></button></div>
    </aside>
    <div className="desktop-main">
      <header className="desktop-topbar"><button className="icon-button" onClick={() => setCollapsed(!collapsed)} title={isRtl ? 'القائمة' : 'Menu'}>{collapsed ? <Menu size={19} /> : <X size={19} />}</button><div className="topbar-context"><strong>{isRtl ? activeLabel?.ar : activeLabel?.en}</strong><span>{new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><div className="topbar-actions">{isSuperAdmin && <label className="branch-switcher"><span>{isRtl ? 'الفرع' : 'Branch'}</span><select value={viewingBranchId ?? ''} onChange={(event) => setViewingBranchId(event.target.value || null)}><option value="">{isRtl ? 'كل الفروع' : 'All branches'}</option>{branchQuery.data?.items.map((branch) => <option key={branch.id} value={branch.id}>{isRtl ? branch.nameAr : branch.nameEn}</option>)}</select></label>}<NavLink className="notification-button" to="/notifications" title={isRtl ? 'الإشعارات' : 'Notifications'}><Bell size={18} />{(unread.data?.count || 0) > 0 && <b>{unread.data?.count}</b>}</NavLink><span className="connection-dot"><i />{isRtl ? 'متصل' : 'Connected'}</span><button className="language-button" onClick={() => setLang(isRtl ? 'en' : 'ar')}>{isRtl ? 'English' : 'العربية'}</button></div></header>
      <main className="desktop-content"><Routes>
        <Route path="/" element={<Dashboard lang={lang} />} />
        <Route path="/dashboard" element={<Dashboard lang={lang} />} />
        <Route path="/sales" element={<Sales lang={lang} />} />
        <Route path="/pos-installments" element={<PosInstallments lang={lang} />} />
        <Route path="/orders" element={<OrdersPOS lang={lang} />} />

        <Route path="/orders/new" element={<CreateOrder lang={lang} />} />
        <Route path="/orders/:id" element={<OrderDetailPOS lang={lang} />} />
        <Route path="/reservations" element={<ReservationsPOS lang={lang} />} />
        <Route path="/reservations/new" element={<CreateReservation lang={lang} />} />
        <Route path="/reservations/:id" element={<ReservationDetailPOS lang={lang} />} />
        <Route path="/offline-sync" element={<OfflineSync lang={lang} />} />
        <Route path="/history" element={<TransactionHistory lang={lang} />} />
        <Route path="/inventory" element={<Inventory lang={lang} branchId={selectedBranchId} />} />
        <Route path="/inventory/:id" element={<InventoryDetail lang={lang} />} />
        <Route path="/transfers" element={restrictedPages.transfers} />
        <Route path="/transfers/new" element={<TransferCreate lang={lang} />} />
        <Route path="/customers" element={<Customers lang={lang} />} />
        <Route path="/inquiries" element={<CustomerInquiries lang={lang} />} />
        <Route path="/installments" element={restrictedPages.installments} />
        <Route path="/installments/:id" element={<InstallmentDetail lang={lang} />} />
        <Route path="/reports" element={isSuperAdmin ? <Reports lang={lang} branchId={viewingBranchId ?? undefined} /> : restrictedPages.reports} />
        <Route path="/notifications" element={<Notifications lang={lang} />} />
        <Route path="/suppliers" element={restrictedPages.suppliers} />
        <Route path="/financing-companies" element={<FinancingCompanies lang={lang} />} />
        {isSuperAdmin && <Route path="/branches" element={<Branches lang={lang} />} />}
        {isSuperAdmin && <Route path="/accounts" element={<AccountManagement lang={lang} />} />}
        {isSuperAdmin && <Route path="/desktop-permissions" element={<DesktopPermissionsPage lang={lang} />} />}
        <Route path="/attendance" element={<Attendance lang={lang} user={user} />} />
        <Route path="/my-account" element={<MyAccount lang={lang} />} />
        <Route path="*" element={<Dashboard lang={lang} />} />
      </Routes></main>
    </div>
  </div>;
}

export default function App() {
  const [user, setUserState] = useState<DesktopUser | null>(() => getUser());
  const [authed, setAuthed] = useState(!!getToken() && !!getUser());
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('pos_language') as Lang) || 'ar');
  const setLang = (next: Lang) => { setLangState(next); localStorage.setItem('pos_language', next); };

  useEffect(() => {
    const handleExpired = () => { clearUser(); setUserState(null); setAuthed(false); };
    window.addEventListener('pos-auth-expired', handleExpired);
    return () => window.removeEventListener('pos-auth-expired', handleExpired);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    auth.me().then((currentUser) => { setUser(currentUser); setUserState(currentUser); setAuthed(true); }).catch(() => { clearToken(); clearUser(); setUserState(null); setAuthed(false); });
  }, []);

  if (!authed) {
    return (
      <QueryClientProvider client={qc}>
        <LoginScreen lang={lang} onLogin={(currentUser) => { setUserState(currentUser); setAuthed(true); }} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        {user && <ViewingBranchProvider user={user}><DesktopShell lang={lang} setLang={setLang} user={user} onLogout={async () => { try { await auth.logout(); } finally { sessionStorage.removeItem(`pos_viewing_branch_${user.id}`); clearToken(); clearUser(); setUserState(null); setAuthed(false); } }} /></ViewingBranchProvider>}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
