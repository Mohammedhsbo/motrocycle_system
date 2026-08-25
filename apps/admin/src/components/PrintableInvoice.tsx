import './PrintableInvoice.css';

interface InvoiceItem {
  id: string;
  motorcycleId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  branch: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  user: {
    id: string;
    name: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  address?: string | null;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

interface Props {
  invoice: Invoice;
  lang: 'en' | 'ar';
}

const t = {
  en: {
    invoice: 'INVOICE',
    invoiceNumber: 'Invoice Number',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    billTo: 'Bill To',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    description: 'Description',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    total: 'Total',
    items: 'Items',
    subtotal: 'Subtotal',
    totalDiscount: 'Total Discount',
    totalAmount: 'Total Amount',
    paidAmount: 'Paid Amount',
    remainingAmount: 'Remaining Amount',
    status: 'Status',
    notes: 'Notes',
    branch: 'Branch',
    vin: 'VIN',
    model: 'Model',
    thankyou: 'Thank you for your business!',
  },
  ar: {
    invoice: 'فاتورة',
    invoiceNumber: 'رقم الفاتورة',
    issueDate: 'تاريخ الإصدار',
    dueDate: 'تاريخ الاستحقاق',
    billTo: 'الفاتورة إلى',
    address: 'العنوان',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    description: 'الوصف',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    discount: 'الخصم',
    total: 'الإجمالي',
    items: 'العناصر',
    subtotal: 'المجموع الفرعي',
    totalDiscount: 'إجمالي الخصم',
    totalAmount: 'المبلغ الإجمالي',
    paidAmount: 'المبلغ المدفوع',
    remainingAmount: 'المبلغ المتبقي',
    status: 'الحالة',
    notes: 'ملاحظات',
    branch: 'الفرع',
    vin: 'رقم الهيكل',
    model: 'الموديل',
    thankyou: 'شكراً على تعاملكم معنا!',
  },
};

export default function PrintableInvoice({ invoice, lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—';

  const totalDiscount = invoice.items.reduce((sum, item) => sum + item.discount, 0);
  const subtotal = invoice.totalAmount + totalDiscount;

  return (
    <div className="printable-invoice" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="invoice-container">
        {/* Header */}
        <div className="invoice-header">
          <div className="company-info">
            <h1 className="company-name">{i18n.invoice}</h1>
            <p className="company-details">{lang === 'ar' ? invoice.branch.nameAr : invoice.branch.nameEn}</p>
          </div>
          <div className="invoice-meta">
            <div className="meta-row">
              <span className="label">{i18n.invoiceNumber}:</span>
              <span className="value">{invoice.invoiceNumber}</span>
            </div>
            <div className="meta-row">
              <span className="label">{i18n.issueDate}:</span>
              <span className="value">{formatDate(invoice.issueDate || invoice.createdAt)}</span>
            </div>
            {invoice.dueDate && (
              <div className="meta-row">
                <span className="label">{i18n.dueDate}:</span>
                <span className="value">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="bill-to">
          <div className="bill-section">
            <h3>{i18n.billTo}</h3>
            <div className="customer-info">
              <p className="customer-name">{invoice.customer.name}</p>
              <p className="customer-phone">{invoice.customer.phone}</p>
              {invoice.customer.email && <p className="customer-email">{invoice.customer.email}</p>}
              {invoice.address && <p className="customer-address">{invoice.address}</p>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="col-description">{i18n.description}</th>
              <th className="col-qty">{i18n.quantity}</th>
              <th className="col-price">{i18n.unitPrice}</th>
              <th className="col-discount">{i18n.discount}</th>
              <th className="col-total">{i18n.total}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="col-description">
                  <div className="item-description">{item.description}</div>
                </td>
                <td className="col-qty">{item.quantity}</td>
                <td className="col-price">{formatCurrency(item.unitPrice)}</td>
                <td className="col-discount">{formatCurrency(item.discount)}</td>
                <td className="col-total">{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="invoice-summary">
          <div className="summary-row">
            <span>{i18n.subtotal}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="summary-row">
              <span>{i18n.totalDiscount}</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>{i18n.totalAmount}</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="summary-row">
            <span>{i18n.paidAmount}</span>
            <span>{formatCurrency(invoice.paidAmount)}</span>
          </div>
          {invoice.remainingAmount > 0 && (
            <div className="summary-row remaining">
              <span>{i18n.remainingAmount}</span>
              <span>{formatCurrency(invoice.remainingAmount)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="invoice-notes">
            <h4>{i18n.notes}</h4>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="invoice-footer">
          <p>{i18n.thankyou}</p>
        </div>
      </div>
    </div>
  );
}
