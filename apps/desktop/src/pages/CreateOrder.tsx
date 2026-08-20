import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, ShoppingBag, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import CustomerSearchPOS from '../components/CustomerSearchPOS';
import CustomerFormPOS from '../components/CustomerFormPOS';
import OrderReview from '../components/OrderReview';
import {
  orders,
  motorcycles,
  type CustomerSearchResult,
  type MotorcycleSearchResult,
} from '../api';

type Lang = 'en' | 'ar';

const T = {
  en: {
    title: 'Create Order',
    step1: 'Select Customer',
    step2: 'Select Motorcycles',
    step3: 'Review & Confirm',
    customerSelected: 'Customer Selected',
    change: 'Change',
    searchCustomer: 'Search Customer',
    searchMotorcycles: 'Search motorcycles by VIN or model...',
    availableMotorcycles: 'Available Motorcycles',
    selectedMotorcycles: 'Selected',
    add: 'Add',
    remove: 'Remove',
    noMotorcycles: 'No available motorcycles found',
    searching: 'Searching...',
    reviewOrder: 'Review Order',
    orderCreated: 'Order created successfully!',
    draftSaved: 'Draft saved successfully!',
    errorCreating: 'Failed to create order',
    viewOrder: 'View Order',
    createAnother: 'Create Another',
    vin: 'VIN',
    model: 'Model',
    year: 'Year',
    price: 'Price',
    branch: 'Branch',
  },
  ar: {
    title: 'إنشاء طلب',
    step1: 'اختيار العميل',
    step2: 'اختيار الدراجات',
    step3: 'المراجعة والتأكيد',
    customerSelected: 'تم اختيار العميل',
    change: 'تغيير',
    searchCustomer: 'البحث عن عميل',
    searchMotorcycles: 'ابحث عن الدراجات بواسطة رقم الهيكل أو الموديل...',
    availableMotorcycles: 'الدراجات المتاحة',
    selectedMotorcycles: 'المختارة',
    add: 'إضافة',
    remove: 'إزالة',
    noMotorcycles: 'لا توجد دراجات متاحة',
    searching: 'جاري البحث...',
    reviewOrder: 'مراجعة الطلب',
    orderCreated: 'تم إنشاء الطلب بنجاح!',
    draftSaved: 'تم حفظ المسودة بنجاح!',
    errorCreating: 'فشل إنشاء الطلب',
    viewOrder: 'عرض الطلب',
    createAnother: 'إنشاء طلب آخر',
    vin: 'رقم الهيكل',
    model: 'الموديل',
    year: 'السنة',
    price: 'السعر',
    branch: 'الفرع',
  },
};

interface Props {
  lang: Lang;
}

export default function CreateOrder({ lang }: Props) {
  const t = T[lang];
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [selectedMotorcycles, setSelectedMotorcycles] = useState<MotorcycleSearchResult[]>([]);
  const [motorcycleSearch, setMotorcycleSearch] = useState('');
  const [showOrderReview, setShowOrderReview] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  // Search available motorcycles
  const { data: motorcyclesData, isLoading: motorcyclesLoading } = useQuery({
    queryKey: ['motorcycles', motorcycleSearch],
    queryFn: () =>
      motorcycles.search({
        search: motorcycleSearch,
        status: 'available',
        limit: 50,
      }),
    enabled: !!selectedCustomer,
  });

  const availableMotorcycles = motorcyclesData?.items ?? [];
  const availableFiltered = availableMotorcycles.filter(
    (m) => !selectedMotorcycles.some((sm) => sm.id === m.id)
  );

  const createOrderMutation = useMutation({
    mutationFn: (data: { isDraft: boolean }) =>
      orders.create({
        customerId: selectedCustomer!.id,
        motorcycleIds: selectedMotorcycles.map((m) => m.id),
        discount,
        notes: notes || undefined,
        isDraft: data.isDraft,
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['motorcycles'] });
      setCreatedOrder({ id: order.id, orderNumber: order.orderNumber });
      setShowOrderReview(false);
    },
  });

  const handleCustomerSelect = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
  };

  const handleCustomerCreated = (customer: any) => {
    setSelectedCustomer({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      nationalId: customer.nationalId,
      defaultAddress: customer.addresses?.find((a: any) => a.isDefault) ?? null,
    });
    setShowCustomerForm(false);
  };

  const handleAddMotorcycle = (motorcycle: MotorcycleSearchResult) => {
    setSelectedMotorcycles((prev) => [...prev, motorcycle]);
  };

  const handleRemoveMotorcycle = (motorcycleId: string) => {
    setSelectedMotorcycles((prev) => prev.filter((m) => m.id !== motorcycleId));
  };

  const handleSaveDraft = () => {
    createOrderMutation.mutate({ isDraft: true });
  };

  const handleConfirmOrder = () => {
    createOrderMutation.mutate({ isDraft: false });
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setSelectedMotorcycles([]);
    setMotorcycleSearch('');
    setDiscount(0);
    setNotes('');
    setCreatedOrder(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Success screen
  if (createdOrder) {
    return (
      <div className="pos-detail-panel" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div
          style={{
            maxWidth: 500,
            margin: '0 auto',
            textAlign: 'center',
            paddingTop: '4rem',
          }}
        >
          <CheckCircle size={64} style={{ color: 'var(--green-light)', marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {t.orderCreated}
          </h1>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '1.125rem',
              color: 'var(--blue-light)',
              marginBottom: '2rem',
            }}
          >
            {createdOrder.orderNumber}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/orders/${createdOrder.id}`)}
              className="btn btn-primary"
            >
              {t.viewOrder}
            </button>
            <button onClick={handleReset} className="btn btn-ghost">
              {t.createAnother}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pos-detail-panel" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        {/* Page title */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
          {t.title}
        </h1>

        {/* Step 1: Customer */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--text-3)',
              marginBottom: '0.75rem',
            }}
          >
            {t.step1}
          </div>
          {!selectedCustomer ? (
            <button
              onClick={() => setShowCustomerSearch(true)}
              className="pos-card"
              style={{
                width: '100%',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                border: '2px dashed var(--pos-border)',
              }}
            >
              <Search size={20} style={{ color: 'var(--blue-light)' }} />
              <span style={{ fontWeight: 600 }}>{t.searchCustomer}</span>
            </button>
          ) : (
            <div
              className="pos-card"
              style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-3)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t.customerSelected}
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {selectedCustomer.name}
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-2)',
                    fontFamily: 'monospace',
                  }}
                >
                  {selectedCustomer.phone}
                </div>
              </div>
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="btn btn-ghost"
                style={{ fontSize: '0.875rem' }}
              >
                {t.change}
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Motorcycles */}
        {selectedCustomer && (
          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--text-3)',
                marginBottom: '0.75rem',
              }}
            >
              {t.step2}
            </div>

            {/* Search bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  background: 'var(--pos-card)',
                  border: '1px solid var(--pos-border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <Search size={16} style={{ color: 'var(--text-3)' }} />
                <input
                  type="text"
                  value={motorcycleSearch}
                  onChange={(e) => setMotorcycleSearch(e.target.value)}
                  placeholder={t.searchMotorcycles}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-1)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>

            {/* Selected motorcycles */}
            {selectedMotorcycles.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--green-light)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {t.selectedMotorcycles} ({selectedMotorcycles.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedMotorcycles.map((moto) => (
                    <div
                      key={moto.id}
                      className="pos-card"
                      style={{
                        padding: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        border: '1px solid var(--green)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            marginBottom: '0.25rem',
                          }}
                        >
                          {lang === 'ar' ? moto.brand.nameAr : moto.brand.nameEn} {moto.model}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-2)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {moto.vin} • {moto.year}
                          {moto.color && ` • ${moto.color}`}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: 'var(--blue-light)',
                        }}
                      >
                        {formatCurrency(moto.price)}
                      </div>
                      <button
                        onClick={() => handleRemoveMotorcycle(moto.id)}
                        className="btn btn-ghost"
                        style={{ padding: '0.375rem', color: 'var(--red-light)' }}
                      >
                        {t.remove}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available motorcycles */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  marginBottom: '0.5rem',
                }}
              >
                {t.availableMotorcycles}
              </div>
              {motorcyclesLoading ? (
                <div
                  className="pos-card"
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                  }}
                >
                  {t.searching}
                </div>
              ) : availableFiltered.length === 0 ? (
                <div
                  className="pos-card"
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                  }}
                >
                  {t.noMotorcycles}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {availableFiltered.map((moto) => (
                    <div
                      key={moto.id}
                      className="pos-card"
                      style={{
                        padding: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            marginBottom: '0.25rem',
                          }}
                        >
                          {lang === 'ar' ? moto.brand.nameAr : moto.brand.nameEn} {moto.model}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-2)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {t.vin}: {moto.vin} • {t.year}: {moto.year}
                          {moto.color && ` • ${moto.color}`}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-3)',
                            marginTop: '0.25rem',
                          }}
                        >
                          {t.branch}: {lang === 'ar' ? moto.branch.nameAr : moto.branch.nameEn}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: 'var(--blue-light)',
                        }}
                      >
                        {formatCurrency(moto.price)}
                      </div>
                      <button
                        onClick={() => handleAddMotorcycle(moto)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}
                      >
                        <Plus size={14} />
                        {t.add}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review button */}
        {selectedCustomer && selectedMotorcycles.length > 0 && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              padding: '1.5rem 0',
              borderTop: '1px solid var(--pos-border)',
              background: 'var(--pos-bg)',
            }}
          >
            <button
              onClick={() => setShowOrderReview(true)}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}
            >
              <ShoppingBag size={18} />
              {t.reviewOrder}
            </button>
          </div>
        )}
      </div>

      {/* Customer search modal */}
      {showCustomerSearch && (
        <CustomerSearchPOS
          lang={lang}
          onSelect={handleCustomerSelect}
          onCreateNew={() => {
            setShowCustomerSearch(false);
            setShowCustomerForm(true);
          }}
          onClose={() => setShowCustomerSearch(false)}
        />
      )}

      {/* Customer form modal */}
      {showCustomerForm && (
        <CustomerFormPOS
          lang={lang}
          onSuccess={handleCustomerCreated}
          onClose={() => setShowCustomerForm(false)}
        />
      )}

      {/* Order review modal */}
      {showOrderReview && selectedCustomer && (
        <OrderReview
          lang={lang}
          customer={selectedCustomer}
          motorcycles={selectedMotorcycles}
          discount={discount}
          notes={notes}
          onDiscountChange={setDiscount}
          onNotesChange={setNotes}
          onRemoveMotorcycle={handleRemoveMotorcycle}
          onSaveDraft={handleSaveDraft}
          onConfirm={handleConfirmOrder}
          onClose={() => setShowOrderReview(false)}
          isLoading={createOrderMutation.isPending}
        />
      )}
    </>
  );
}
