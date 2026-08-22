export interface ReceiptData {
  type: 'order' | 'reservation';
  number: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  motorcycle: {
    model: string;
    vin: string;
    year: number;
    color?: string;
  };
  branch: {
    nameEn: string;
    nameAr: string;
  };
  user: {
    name: string;
  };
  pricing: {
    basePrice: number;
    discount: number;
    totalPrice: number;
    depositAmount?: number;
    remainingAmount?: number;
  };
  notes?: string;
}

export function formatReceiptForPrint(data: ReceiptData, lang: 'en' | 'ar'): string {
  const isRtl = lang === 'ar';
  const lines: string[] = [];

  // Header
  lines.push('='.repeat(48));
  lines.push(isRtl ? 'معرض الدراجات النارية' : 'MOTORCYCLE DEALERSHIP');
  lines.push('='.repeat(48));
  lines.push('');

  // Type & Number
  const typeLabel = data.type === 'order' 
    ? (isRtl ? 'فاتورة بيع' : 'SALES ORDER')
    : (isRtl ? 'إيصال حجز' : 'RESERVATION RECEIPT');
  lines.push(typeLabel);
  lines.push(`${isRtl ? 'رقم' : 'No'}: ${data.number}`);
  lines.push(`${isRtl ? 'التاريخ' : 'Date'}: ${new Date(data.date).toLocaleString(isRtl ? 'ar-EG' : 'en-EG')}`);
  lines.push('');

  // Branch & User
  lines.push(`${isRtl ? 'الفرع' : 'Branch'}: ${isRtl ? data.branch.nameAr : data.branch.nameEn}`);
  lines.push(`${isRtl ? 'البائع' : 'Salesperson'}: ${data.user.name}`);
  lines.push('-'.repeat(48));

  // Customer
  lines.push(isRtl ? 'بيانات العميل:' : 'Customer Information:');
  lines.push(`  ${isRtl ? 'الاسم' : 'Name'}: ${data.customer.name}`);
  lines.push(`  ${isRtl ? 'الهاتف' : 'Phone'}: ${data.customer.phone}`);
  if (data.customer.email) {
    lines.push(`  ${isRtl ? 'البريد' : 'Email'}: ${data.customer.email}`);
  }
  lines.push('-'.repeat(48));

  // Motorcycle
  lines.push(isRtl ? 'بيانات الدراجة النارية:' : 'Motorcycle Details:');
  lines.push(`  ${isRtl ? 'الموديل' : 'Model'}: ${data.motorcycle.model}`);
  lines.push(`  ${isRtl ? 'رقم الهيكل' : 'VIN'}: ${data.motorcycle.vin}`);
  lines.push(`  ${isRtl ? 'السنة' : 'Year'}: ${data.motorcycle.year}`);
  if (data.motorcycle.color) {
    lines.push(`  ${isRtl ? 'اللون' : 'Color'}: ${data.motorcycle.color}`);
  }
  lines.push('-'.repeat(48));

  // Pricing
  lines.push(isRtl ? 'التفاصيل المالية:' : 'Financial Details:');
  lines.push(`  ${isRtl ? 'السعر الأساسي' : 'Base Price'}:    ${formatMoney(data.pricing.basePrice, isRtl)}`);
  
  if (data.pricing.discount > 0) {
    lines.push(`  ${isRtl ? 'الخصم' : 'Discount'}:        ${formatMoney(-data.pricing.discount, isRtl)}`);
  }
  
  lines.push(`  ${isRtl ? 'الإجمالي' : 'Total'}:          ${formatMoney(data.pricing.totalPrice, isRtl)}`);

  if (data.type === 'reservation' && data.pricing.depositAmount) {
    lines.push('');
    lines.push(`  ${isRtl ? 'المدفوع (عربون)' : 'Paid (Deposit)'}:  ${formatMoney(data.pricing.depositAmount, isRtl)}`);
    lines.push(`  ${isRtl ? 'المتبقي' : 'Remaining'}:       ${formatMoney(data.pricing.remainingAmount || 0, isRtl)}`);
  }

  lines.push('='.repeat(48));

  // Notes
  if (data.notes) {
    lines.push('');
    lines.push(isRtl ? 'ملاحظات:' : 'Notes:');
    lines.push(data.notes);
    lines.push('');
  }

  // Footer
  lines.push('');
  lines.push(isRtl ? 'شكراً لتعاملكم معنا' : 'Thank you for your business');
  lines.push('='.repeat(48));

  return lines.join('\n');
}

function formatMoney(amount: number, isRtl: boolean): string {
  const formatted = Math.abs(amount).toLocaleString();
  const currency = isRtl ? 'ريال' : 'EGP';
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatted} ${currency}`;
}

export function formatReceiptHTML(data: ReceiptData, lang: 'en' | 'ar'): string {
  const isRtl = lang === 'ar';
  
  return `
<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${isRtl ? 'Arial, sans-serif' : 'monospace'}; 
      padding: 20px; 
      max-width: 800px; 
      margin: 0 auto;
      direction: ${isRtl ? 'rtl' : 'ltr'};
    }
    .receipt { border: 2px solid #000; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .section { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #999; }
    .section:last-child { border-bottom: none; }
    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .label { font-weight: bold; }
    .total { font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
    .footer { text-align: center; margin-top: 20px; font-style: italic; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${isRtl ? 'معرض الدراجات النارية' : 'MOTORCYCLE DEALERSHIP'}</h1>
      <div>${data.type === 'order' ? (isRtl ? 'فاتورة بيع' : 'SALES ORDER') : (isRtl ? 'إيصال حجز' : 'RESERVATION RECEIPT')}</div>
      <div><strong>${data.number}</strong></div>
      <div>${new Date(data.date).toLocaleString(isRtl ? 'ar-EG' : 'en-EG')}</div>
    </div>

    <div class="section">
      <div class="row"><span class="label">${isRtl ? 'الفرع:' : 'Branch:'}</span><span>${isRtl ? data.branch.nameAr : data.branch.nameEn}</span></div>
      <div class="row"><span class="label">${isRtl ? 'البائع:' : 'Salesperson:'}</span><span>${data.user.name}</span></div>
    </div>

    <div class="section">
      <div class="label">${isRtl ? 'بيانات العميل:' : 'Customer Information:'}</div>
      <div class="row"><span>${isRtl ? 'الاسم:' : 'Name:'}</span><span>${data.customer.name}</span></div>
      <div class="row"><span>${isRtl ? 'الهاتف:' : 'Phone:'}</span><span>${data.customer.phone}</span></div>
      ${data.customer.email ? `<div class="row"><span>${isRtl ? 'البريد:' : 'Email:'}</span><span>${data.customer.email}</span></div>` : ''}
    </div>

    <div class="section">
      <div class="label">${isRtl ? 'بيانات الدراجة النارية:' : 'Motorcycle Details:'}</div>
      <div class="row"><span>${isRtl ? 'الموديل:' : 'Model:'}</span><span>${data.motorcycle.model}</span></div>
      <div class="row"><span>${isRtl ? 'رقم الهيكل:' : 'VIN:'}</span><span>${data.motorcycle.vin}</span></div>
      <div class="row"><span>${isRtl ? 'السنة:' : 'Year:'}</span><span>${data.motorcycle.year}</span></div>
      ${data.motorcycle.color ? `<div class="row"><span>${isRtl ? 'اللون:' : 'Color:'}</span><span>${data.motorcycle.color}</span></div>` : ''}
    </div>

    <div class="section">
      <div class="label">${isRtl ? 'التفاصيل المالية:' : 'Financial Details:'}</div>
      <div class="row"><span>${isRtl ? 'السعر الأساسي:' : 'Base Price:'}</span><span>${formatMoney(data.pricing.basePrice, isRtl)}</span></div>
      ${data.pricing.discount > 0 ? `<div class="row"><span>${isRtl ? 'الخصم:' : 'Discount:'}</span><span>-${formatMoney(data.pricing.discount, isRtl)}</span></div>` : ''}
      <div class="row total"><span>${isRtl ? 'الإجمالي:' : 'Total:'}</span><span>${formatMoney(data.pricing.totalPrice, isRtl)}</span></div>
      ${data.type === 'reservation' && data.pricing.depositAmount ? `
        <div class="row" style="margin-top: 10px;"><span>${isRtl ? 'المدفوع (عربون):' : 'Paid (Deposit):'}</span><span>${formatMoney(data.pricing.depositAmount, isRtl)}</span></div>
        <div class="row"><span>${isRtl ? 'المتبقي:' : 'Remaining:'}</span><span>${formatMoney(data.pricing.remainingAmount || 0, isRtl)}</span></div>
      ` : ''}
    </div>

    ${data.notes ? `
    <div class="section">
      <div class="label">${isRtl ? 'ملاحظات:' : 'Notes:'}</div>
      <div>${data.notes}</div>
    </div>
    ` : ''}

    <div class="footer">
      ${isRtl ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}
    </div>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
      ${isRtl ? 'طباعة' : 'Print'}
    </button>
  </div>
</body>
</html>
  `.trim();
}
