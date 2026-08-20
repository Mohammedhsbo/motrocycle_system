import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PackageSearch, ShoppingCart, Users, ArrowLeftRight, ShoppingBag, X, FileText, CreditCard, Wallet, Mail, BarChart2, Settings, Flag, Building2, History, Key } from 'lucide-react';

interface SidebarProps {
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  onLogout: () => void;
}

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', labelAr: 'لوحة التحكم', exact: true },
  { to: '/reports', icon: BarChart2, label: 'Reports', labelAr: 'التقارير' },
  { to: '/suppliers', icon: PackageSearch, label: 'Suppliers', labelAr: 'الموردون' },
  { to: '/purchases', icon: ShoppingCart, label: 'Purchases', labelAr: 'المشتريات' },
  { to: '/customers', icon: Users, label: 'Customers', labelAr: 'العملاء' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders', labelAr: 'الطلبات' },
  { to: '/letters', icon: Mail, label: 'Letters', labelAr: 'الخطابات' },
  { to: '/invoices', icon: FileText, label: 'Invoices', labelAr: 'الفواتير' },
  { to: '/payments', icon: CreditCard, label: 'Payments', labelAr: 'الدفعات' },
  { to: '/financing', icon: Wallet, label: 'Financing', labelAr: 'التمويل' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers', labelAr: 'التحويلات' },
  { to: '/configuration', icon: Settings, label: 'Configuration', labelAr: 'الإعدادات' },
  { to: '/feature-flags', icon: Flag, label: 'Feature Flags', labelAr: 'الميزات' },
  { to: '/branches', icon: Building2, label: 'Branches', labelAr: 'الفروع' },
  { to: '/configuration-audit', icon: History, label: 'Config Audit', labelAr: 'سجل الإعدادات' },
  { to: '/integrations', icon: Settings, label: 'Integrations', labelAr: 'التكامل' },
  { to: '/api-keys', icon: Key, label: 'API Keys', labelAr: 'مفاتيح API' },
];

export default function Sidebar({ lang, onToggleLang, onLogout }: SidebarProps) {
  const isRtl = lang === 'ar';

  return (
    <aside className="sidebar" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Logo */}
      <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '0.75rem', padding: '0.75rem 1rem',
        }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🏍</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>MotoSystem</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Admin Panel</div>
          </div>
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
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.2))'
                : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
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
        className="btn btn-outline"
        style={{ marginTop: '1rem', width: '100%' }}
      >
        {isRtl ? 'English' : 'عربي'}
      </button>
      <button
        onClick={onLogout}
        className="btn btn-outline"
        style={{ marginTop: '0.5rem', width: '100%' }}
      >
        {isRtl ? 'تسجيل الخروج' : 'Sign out'}
      </button>
    </aside>
  );
}
