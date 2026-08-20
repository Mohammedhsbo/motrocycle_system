import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getToken, clearToken } from './api';
import LoginScreen from './LoginScreen';
import ReceivePurchase from './pages/ReceivePurchase';
import CreateOrder from './pages/CreateOrder';
import OrdersPOS from './pages/OrdersPOS';
import OrderDetailPOS from './pages/OrderDetailPOS';
import CreateReservation from './pages/CreateReservation';
import ReservationsPOS from './pages/ReservationsPOS';
import ReservationDetailPOS from './pages/ReservationDetailPOS';
import './index.css';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

type Lang = 'en' | 'ar';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [lang, setLang] = useState<Lang>('en');
  const [currentPage, setCurrentPage] = useState<'receive' | 'orders' | 'createOrder' | 'reservations' | 'createReservation'>('orders');
  const isRtl = lang === 'ar';

  if (!authed) {
    return (
      <QueryClientProvider client={qc}>
        <LoginScreen lang={lang} onLogin={() => setAuthed(true)} />
      </QueryClientProvider>
    );
  }

  const pageTitle =
    currentPage === 'receive'
      ? isRtl
        ? 'استلام المشتريات'
        : 'Receive Purchases'
      : currentPage === 'createOrder'
      ? isRtl
        ? 'إنشاء طلب'
        : 'Create Order'
      : currentPage === 'reservations'
      ? isRtl
        ? 'الحجوزات'
        : 'Reservations'
      : currentPage === 'createReservation'
      ? isRtl
        ? 'إنشاء حجز'
        : 'Create Reservation'
      : isRtl
      ? 'الطلبات'
      : 'Orders';

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="pos-root" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
          {/* Top bar */}
          <header className="pos-header">
            <span style={{ fontSize: '1.25rem' }}>🏍️</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '0.02em',
              }}
            >
              {isRtl ? 'نظام الدراجات' : 'MotoSystem'} — {pageTitle}
            </span>
            <div style={{ flex: 1 }} />
            {/* Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-ghost"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  color: currentPage === 'orders' ? 'var(--blue-light)' : 'var(--text-2)',
                }}
                onClick={() => {
                  setCurrentPage('orders');
                  window.location.href = '/orders';
                }}
              >
                {isRtl ? 'الطلبات' : 'Orders'}
              </button>
              <button
                className="btn btn-ghost"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  color: currentPage === 'createOrder' ? 'var(--blue-light)' : 'var(--text-2)',
                }}
                onClick={() => {
                  setCurrentPage('createOrder');
                  window.location.href = '/orders/new';
                }}
              >
                {isRtl ? 'طلب جديد' : 'New Order'}
              </button>
              <button
                className="btn btn-ghost"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  color: currentPage === 'reservations' ? 'var(--blue-light)' : 'var(--text-2)',
                }}
                onClick={() => {
                  setCurrentPage('reservations');
                  window.location.href = '/reservations';
                }}
              >
                {isRtl ? 'الحجوزات' : 'Reservations'}
              </button>
              <button
                className="btn btn-ghost"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  color: currentPage === 'createReservation' ? 'var(--blue-light)' : 'var(--text-2)',
                }}
                onClick={() => {
                  setCurrentPage('createReservation');
                  window.location.href = '/reservations/new';
                }}
              >
                {isRtl ? 'حجز جديد' : 'New Reservation'}
              </button>
              <button
                className="btn btn-ghost"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  color: currentPage === 'receive' ? 'var(--blue-light)' : 'var(--text-2)',
                }}
                onClick={() => {
                  setCurrentPage('receive');
                  window.location.href = '/receive';
                }}
              >
                {isRtl ? 'استلام' : 'Receive'}
              </button>
            </div>
            {/* Lang toggle */}
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
              onClick={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
            >
              {isRtl ? 'English' : 'عربي'}
            </button>
            {/* Sign out */}
            <button
              className="btn btn-ghost"
              style={{
                fontSize: '0.8rem',
                padding: '0.3rem 0.75rem',
                color: 'var(--red-light)',
              }}
              onClick={() => {
                clearToken();
                setAuthed(false);
              }}
            >
              {isRtl ? 'خروج' : 'Sign out'}
            </button>
          </header>

          {/* Main content */}
          <Routes>
            <Route path="/" element={<OrdersPOS lang={lang} />} />
            <Route path="/orders" element={<OrdersPOS lang={lang} />} />
            <Route path="/orders/new" element={<CreateOrder lang={lang} />} />
            <Route path="/orders/:id" element={<OrderDetailPOS lang={lang} />} />
            <Route path="/reservations" element={<ReservationsPOS lang={lang} />} />
            <Route path="/reservations/new" element={<CreateReservation lang={lang} />} />
            <Route path="/reservations/:id" element={<ReservationDetailPOS lang={lang} />} />
            <Route path="/receive" element={<ReceivePurchase lang={lang} />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
