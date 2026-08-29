import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PackageSearch, ShoppingCart, Users, ArrowLeftRight, ShoppingBag, X, FileText, CreditCard, Wallet, Mail, BarChart2, Settings, Flag, Building2, History, Key, Tag, Bike, ListTree, Clock } from 'lucide-react';
import { useBranch } from '../contexts/BranchContext';

interface SidebarProps {
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  onLogout: () => void;
}

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', labelAr: 'لوحة التحكم', exact: true },
  { to: '/reports', icon: BarChart2, label: 'Reports', labelAr: 'التقارير' },
  { to: '/brands', icon: Tag, label: 'Brands', labelAr: 'العلامات التجارية' },
  { to: '/categories', icon: ListTree, label: 'Categories', labelAr: 'الفئات' },
  { to: '/motorcycles', icon: Bike, label: 'Motorcycles', labelAr: 'الدراجات النارية' },
  { to: '/customers', icon: Users, label: 'Customers', labelAr: 'العملاء' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders', labelAr: 'الطلبات' },
  { to: '/payments', icon: CreditCard, label: 'Payments', labelAr: 'الدفعات' },
  { to: '/financing', icon: Wallet, label: 'Financing Contracts', labelAr: 'عقود التمويل' },
  { to: '/installment-requests', icon: Wallet, label: 'Installment Requests', labelAr: 'طلبات التقسيط' },
  { to: '/financing-companies', icon: Building2, label: 'Financing Companies', labelAr: 'شركات التمويل' },
  { to: '/installment-durations', icon: Clock, label: 'Installment Durations', labelAr: 'مدد التقسيط' },
];

export default function Sidebar({ lang, onToggleLang, onLogout }: SidebarProps) {
  const isRtl = lang === 'ar';
  const { branchId, setBranchId } = useBranch();

  return (
    <aside className="sidebar" style={{ direction: isRtl ? 'rtl' : 'ltr', backgroundColor: 'var(--accent-primary)', color: 'white', borderRight: 'none' }}>
      {/* Logo */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', display: 'inline-flex', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <img src="/logo.png" alt="MotoSystem" style={{ height: '36px', objectFit: 'contain' }} />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {nav.map(({ to, icon: Icon, label, labelAr, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: '0.75rem', padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none', fontWeight: 500,
              fontSize: '0.875rem', transition: 'var(--transition)',
              color: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.75)',
              background: isActive
                ? 'white'
                : 'transparent',
              borderLeft: 'none',
            })}
          >
            <Icon size={18} />
            {isRtl ? labelAr : label}
          </NavLink>
        ))}
      </nav>


      {/* Language toggle */}
      <button
        onClick={onToggleLang}
        className="btn"
        style={{ marginTop: '1rem', width: '100%', border: '1px solid rgba(255,255,255,0.3)', color: 'white', background: 'rgba(255,255,255,0.1)' }}
      >
        {isRtl ? 'English' : 'عربي'}
      </button>
      <button
        onClick={onLogout}
        className="btn"
        style={{ marginTop: '0.5rem', width: '100%', border: '1px solid rgba(255,255,255,0.3)', color: 'white', background: 'rgba(255,255,255,0.1)' }}
      >
        {isRtl ? 'تسجيل الخروج' : 'Sign out'}
      </button>
    </aside>
  );
}
