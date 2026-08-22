import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pos } from '../api';

interface TransactionHistoryProps {
  lang: 'en' | 'ar';
  onBack: () => void;
}

export default function TransactionHistory({ lang, onBack }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'reservation'>('all');
  const isRtl = lang === 'ar';

  const { data: dashboard } = useQuery({
    queryKey: ['pos-dashboard'],
    queryFn: pos.getDashboard,
  });

  const transactions = dashboard?.recentTransactions || [];

  const filteredTransactions = transactions.filter((t: any) => {
    const matchesSearch =
      !searchQuery ||
      t.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.motorcycleModel.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || t.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          {isRtl ? '→ رجوع' : '← Back'}
        </button>
        <h1 className="text-2xl font-bold">
          {isRtl ? 'سجل العمليات' : 'Transaction History'}
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isRtl
                ? 'البحث (رقم العملية، العميل، الدراجة)...'
                : 'Search (number, customer, motorcycle)...'
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          {[
            { value: 'all', label: isRtl ? 'الكل' : 'All' },
            { value: 'order', label: isRtl ? 'طلبات' : 'Orders' },
            { value: 'reservation', label: isRtl ? 'حجوزات' : 'Reservations' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTypeFilter(filter.value as any)}
              className={`px-4 py-2 rounded-lg border ${
                typeFilter === filter.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {isRtl ? 'لا توجد عمليات' : 'No transactions found'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction: any) => (
            <div
              key={transaction.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-lg">{transaction.number}</div>
                  <div className="text-sm text-gray-600">
                    {transaction.customerName}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 text-sm rounded ${
                    transaction.type === 'order'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {transaction.type === 'order'
                    ? isRtl
                      ? 'طلب'
                      : 'Order'
                    : isRtl
                    ? 'حجز'
                    : 'Reservation'}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">
                    {isRtl ? 'الدراجة:' : 'Motorcycle:'}
                  </span>{' '}
                  {transaction.motorcycleModel}
                </div>
                <div>
                  <span className="text-gray-600">
                    {isRtl ? 'المبلغ:' : 'Amount:'}
                  </span>{' '}
                  <span className="font-bold">
                    {transaction.amount.toLocaleString()}{' '}
                    {isRtl ? 'ريال' : 'EGP'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">
                    {isRtl ? 'التاريخ:' : 'Date:'}
                  </span>{' '}
                  {new Date(transaction.createdAt).toLocaleString(
                    isRtl ? 'ar-EG' : 'en-EG'
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {dashboard && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">
            {isRtl ? 'إحصائيات اليوم' : "Today's Stats"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">
                {isRtl ? 'طلبات' : 'Orders'}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {dashboard.todayStats.ordersCreated}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">
                {isRtl ? 'حجوزات' : 'Reservations'}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {dashboard.todayStats.reservationsCreated}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">
                {isRtl ? 'إجمالي المبيعات' : 'Total Sales'}
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {dashboard.todayStats.totalSales.toLocaleString()}{' '}
                <span className="text-sm">
                  {isRtl ? 'ريال' : 'EGP'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">
                {isRtl ? 'دراجات متاحة' : 'Available'}
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {dashboard.todayStats.availableMotorcycles}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
