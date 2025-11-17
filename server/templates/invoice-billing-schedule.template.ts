// server/templates/invoice.template.ts

type InvoiceForPdf = {
  invoiceNumber: string;
  contractNumber: string;
  description: string;
  dueDate: Date | string;
  generatedAt: Date | string;
  status: string;
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  redactionAmount: number;
  totalAmount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  clientName?: string;
  clientAddress?: string;
};

type InvoiceLineForPdf = {
  sequenceNo?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  dueDate?: Date | string;
  amountHt?: number;
  vatAmount?: number;
  totalAmount?: number;
  status?: string;
};

type RenderOptions = {
  logoDataUrl?: string;
  companyName?: string;
  companyAddress?: string;
};

function formatDateFR(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoneyGBP(value?: number | null): string {
  if (value == null) return "0.00";
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function renderInvoiceHtml(
  invoice: InvoiceForPdf,
  lines?: InvoiceLineForPdf[],
  opts: RenderOptions = {}
): string {
  // Company info
  const companyName = opts.companyName || "KLYXOR Solutions";
  const companyAddress = opts.companyAddress || "";

  // Client info
  const clientName = invoice.clientName || "Your client";
  const clientAddress = invoice.clientAddress || "";

  // Calculate totals
  const amountHT = invoice.baseAmount ?? 0;
  const vatRate = invoice.vatRate ?? 0;
  const vatAmount = invoice.vatAmount ?? (amountHT * (vatRate / 100));
  const totalAmount = invoice.totalAmount ?? (amountHT + vatAmount);

  // Format invoice lines for table
  const invoiceLines = lines && lines.length > 0 ? lines.map(line => {
    const lineHT = line.amountHt ?? line.amount ?? 0;
    const lineVat = line.vatAmount ?? (lineHT * (vatRate / 100));
    const lineTotal = line.totalAmount ?? (lineHT + lineVat);
    
    return {
      description: line.description || invoice.description || "Service",
      quantity: line.quantity ?? 1,
      unitPrice: lineHT,
      amount: lineTotal,
    };
  }) : [{
    description: invoice.description || "Service",
    quantity: 1,
    unitPrice: amountHT,
    amount: totalAmount,
  }];

  // Calculate totals from lines
  const calculatedTotal = invoiceLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const finalTotal = totalAmount || calculatedTotal;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 50px;
      color: #333;
      font-size: 13px;
      line-height: 1.6;
      background: #fff;
    }

    /* Header Section */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 3px solid #000;
    }

    .invoice-title {
      font-size: 36px;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .company-section {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 15px;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo {
      height: 60px;
      width: auto;
      margin-right: 20px;
    }

    .logo-placeholder {
      width: 80px;
      height: 60px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ddd;
    }

    .company-name {
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
      margin-bottom: 2px;
    }

    .company-tagline {
      font-size: 11px;
      text-transform: uppercase;
      color: #999;
      letter-spacing: 2px;
    }

    .company-address {
      font-size: 11px;
      color: #666;
      line-height: 1.5;
      text-align: right;
    }

    /* Details Section */
    .details-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-bottom: 40px;
    }

    .bill-to h3,
    .invoice-info h3 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #000;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .bill-to-content {
      font-size: 12px;
      color: #333;
      line-height: 1.7;
    }

    .invoice-info-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .info-label {
      color: #666;
    }

    .info-value {
      font-weight: 600;
      color: #000;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .items-table thead {
      background-color: #f8f8f8;
    }

    .items-table th {
      padding: 12px 15px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #ddd;
    }

    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) {
      text-align: right;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #eee;
    }

    .items-table td {
      padding: 15px;
      font-size: 12px;
      color: #333;
      vertical-align: top;
    }

    .items-table td:nth-child(2),
    .items-table td:nth-child(3),
    .items-table td:nth-child(4) {
      text-align: right;
    }

    .item-description {
      font-weight: 600;
      color: #000;
      margin-bottom: 3px;
    }

    .item-description-sub {
      font-size: 11px;
      color: #666;
    }

    /* Totals Section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 30px;
      margin-bottom: 60px;
    }

    .totals-container {
      width: 350px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      font-size: 13px;
    }

    .total-row-label {
      color: #666;
      font-weight: 500;
    }

    .total-row-value {
      font-weight: 700;
      color: #000;
    }

    .total-due {
      background-color: #000;
      color: #fff;
      padding: 15px;
      margin-top: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .total-due-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .total-due-value {
      font-size: 16px;
      font-weight: 700;
    }

    /* Footer */
    .footer {
      margin-top: 80px;
      text-align: right;
    }

    .signature-label {
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
    }

    .signature-name {
      font-size: 18px;
      font-weight: 400;
      color: #000;
      font-family: 'Brush Script MT', cursive;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="invoice-header">
    <div class="logo-container">
      ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="logo" alt="Logo"/>` : `
      <div class="logo-placeholder">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 8L8 16V24L20 32L32 24V16L20 8Z" stroke="#666" stroke-width="2" fill="none"/>
          <circle cx="20" cy="20" r="3" fill="#666"/>
        </svg>
      </div>
      `}
      <div>
        <h1 class="invoice-title">INVOICE</h1>
      </div>
    </div>
    <div class="company-section">
      <div>
        <div class="company-name">${companyName.toUpperCase().split(' ')[0] || 'COMPANY'}</div>
        ${companyName.split(' ').length > 1 ? `<div class="company-tagline">${companyName.split(' ').slice(1).join(' ').toUpperCase()}</div>` : ''}
      </div>
    </div>
  </div>

  ${companyAddress ? `<div style="font-size: 11px; color: #666; margin-bottom: 30px; text-align: right;">
    ${companyName}, ${companyAddress}
  </div>` : ''}

  <!-- Details Section -->
  <div class="details-section">
    <div class="bill-to">
      <h3>BILL TO</h3>
      <div class="bill-to-content">
        ${clientName}<br/>
        ${clientAddress ? clientAddress.split('\n').map(line => `${line}<br/>`).join('') : ''}
      </div>
    </div>
    <div class="invoice-info">
      <div class="invoice-info-grid">
        <div class="info-row">
          <span class="info-label">Invoice No.:</span>
          <span class="info-value">${invoice.invoiceNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Issue date:</span>
          <span class="info-value">${formatDateFR(invoice.generatedAt || invoice.createdAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Due date:</span>
          <span class="info-value">${formatDateFR(invoice.dueDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reference:</span>
          <span class="info-value">${invoice.contractNumber || invoice.invoiceNumber}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>DESCRIPTION</th>
        <th>QUANTITY</th>
        <th>UNIT PRICE (£)</th>
        <th>AMOUNT (£)</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceLines.map((line, index) => {
        const description = line.description || `Service ${index + 1}`;
        const descriptionParts = description.split('\n').filter(p => p.trim());
        const mainDesc = descriptionParts[0] || description;
        const subDesc = descriptionParts.length > 1 
          ? descriptionParts.slice(1).join(' ')
          : (invoice.description && invoice.description !== mainDesc ? invoice.description : '');
        
        return `
      <tr>
        <td>
          <div class="item-description">${mainDesc}</div>
          ${subDesc ? `<div class="item-description-sub">${subDesc}</div>` : ""}
        </td>
        <td>${line.quantity || 1}</td>
        <td>£${formatMoneyGBP(line.unitPrice || 0)}</td>
        <td>£${formatMoneyGBP(line.amount || 0)}</td>
      </tr>
      `;
      }).join('')}
    </tbody>
  </table>

  <!-- Totals Section -->
  <div class="totals-section">
    <div class="totals-container">
      <div class="total-row">
        <span class="total-row-label">TOTAL (GBP):</span>
        <span class="total-row-value">£${formatMoneyGBP(calculatedTotal || amountHT)}</span>
      </div>
      <div class="total-due">
        <span class="total-due-label">TOTAL DUE (GBP)</span>
        <span class="total-due-value">£${formatMoneyGBP(finalTotal)}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="signature-label">Issued by, signature:</div>
    <div class="signature-name">${companyName}</div>
  </div>
</body>
</html>
  `;
}
