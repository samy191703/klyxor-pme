import { INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "@/modules/invoices/domain/constants";

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
  amountHt?: number;
  vatAmount?: number;
  totalAmount?: number;
  status?: string;
  dueDate?: Date | string;
};

type RenderOptions = {
  logoDataUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  customerCode?: string;
  bank?: {
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    swift?: string;
    owner?: string;
    address?: string;
  };
  companyFooter?: {
    capital?: string;
    rc?: string;
    patente?: string;
    if?: string;
    cnss?: string;
    ice?: string;
  };
  paymentConditions?: string;
  currency?: string;
};

// Format helpers
function formatDateFR(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(value?: number | null, currency: string = "EUR"): string {
  if (value == null) return "0,00";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function labelOf<T extends Record<string, string>>(map: T, value: string): string {
  return map[value] ?? value;
}

export function renderInvoiceHtml(
  invoice: InvoiceForPdf & {
    maxAnnualProduction?: string;
    numberOfTurbines?: string;
    pricePerMWh?: string;
    currency?: string;
  },
  lines?: InvoiceLineForPdf[],
  opts: RenderOptions = {}
): string {
  const companyName = opts.companyName || "KLYXOR Solutionssss";
  const companyAddress = opts.companyAddress || "";

  const clientName = invoice.clientName || "Client";
  const clientAddress = invoice.clientAddress || "";

  const amountHT = invoice.baseAmount ?? 0;
  const vatRate = invoice.vatRate ?? 0;
  const vatAmount = invoice.vatAmount ?? (amountHT * (vatRate / 100));
  const totalAmount = invoice.totalAmount ?? (amountHT + vatAmount);

  const invoiceLines = lines && lines.length > 0
    ? lines.map((line, idx) => {
      const lineHT = line.amountHt ?? line.unitPrice ?? 0;
      const lineVat = line.vatAmount ?? (lineHT * (vatRate / 100));
      const lineTotal = line.totalAmount ?? (lineHT + lineVat);

      return {
        sequenceNo: line.sequenceNo ?? idx + 1,
        description: line.description || invoice.description || "Service",
        quantity: line.quantity ?? 1,
        unitPrice: lineHT,
        amount: lineTotal,
        vatAmount: lineVat,
        status: line.status,
        dueDate: line.dueDate,
      };
    })
    : [
      {
        sequenceNo: 1,
        description: invoice.description || "Service",
        quantity: 1,
        unitPrice: amountHT,
        amount: totalAmount,
        vatAmount: vatAmount,
        status: invoice.status,
        dueDate: invoice.dueDate,
      },
    ];

  const calculatedTotalHT = invoiceLines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * (line.quantity ?? 1), 0);
  const calculatedTotalVAT = invoiceLines.reduce((sum, line) => sum + (line.vatAmount ?? 0), 0);
  const calculatedTotal = calculatedTotalHT + calculatedTotalVAT;
  const finalTotal = invoice.totalAmount ?? calculatedTotal;
  const finalHT = invoice.baseAmount ?? calculatedTotalHT;
  const finalVAT = invoice.vatAmount ?? calculatedTotalVAT;

  const currency = opts.currency || invoice.currency || "EUR";
  const currencySymbol = currency === "EUR" ? "€" : currency === "MAD" ? "MAD" : currency;

  // Format money without currency symbol for table display
  function formatMoneyPlain(value: number | null | undefined, currency: string = "EUR"): string {
    if (value == null) return "0,00";
    const formatted = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return formatted;
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      padding: 30px 40px;
      line-height: 1.4;
      background: #fff;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
    }

    .logo-section {
      width: 150px;
      height: 50px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-section img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }

    .logo-section.placeholder {
      background: linear-gradient(135deg, #6B46C1 0%, #805AD5 100%);
      color: white;
      font-weight: bold;
      font-size: 18px;
    }

    .invoice-meta {
      text-align: right;
      font-size: 10px;
      line-height: 1.5;
    }

    .invoice-meta .invoice-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 2px;
    }

    .two-column-info {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .info-box {
      flex: 1;
      font-size: 10px;
      line-height: 1.5;
    }

    .info-box-title {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 8px;
    }

    .emetteur-box {
      background-color: #f0f0f0;
      padding: 12px 15px;
      border: 1px solid #d0d0d0;
    }

    .adresse-box {
      background-color: #fff;
      padding: 12px 15px;
      border: 1px solid #d0d0d0;
    }

    .info-box strong {
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }

    .currency-note {
      font-size: 10px;
      color: #666;
      text-align: right;
      margin-bottom: 5px;
      font-style: italic;
    }

    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10px;
    }

    table.items-table th {
      background-color: #f5f5f5;
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: center;
      font-weight: bold;
      font-size: 10px;
    }

    table.items-table td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: center;
      vertical-align: top;
      height: 400px;
    }

    table.items-table td.designation-cell {
      text-align: left;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    table.totals-table {
      width: 250px;
      border-collapse: collapse;
      font-size: 10px;
    }

    table.totals-table td {
      border: 1px solid #ccc;
      padding: 6px 10px;
    }

    table.totals-table td:first-child {
      text-align: left;
      font-weight: bold;
    }

    table.totals-table td:last-child {
      text-align: right;
      font-weight: bold;
    }

    .payment-conditions {
      margin-bottom: 15px;
    }

    .payment-conditions-title {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 5px;
    }

    .payment-conditions-content {
      font-size: 10px;
      line-height: 1.5;
    }

    .payment-method {
      margin-bottom: 12px;
    }

    .payment-method-title {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 5px;
    }

    .payment-method-content {
      font-size: 10px;
      line-height: 1.6;
    }

    .footer-legal {
      margin-top: 30px;
      font-size: 9px;
      color: #555;
      text-align: center;
      line-height: 1.4;
    }
    .page-number {
     text-align: right;
     font-size: 9px;
     color: #666;
     margin-top: 15px;
     padding-top: 10px;
     border-top: 1px solid #ccc;
}
  </style>
</head>
<body>

  <!-- Header: Logo + Invoice Meta -->
  <div class="invoice-header">
    <div class="logo-section ${opts.logoDataUrl ? "" : "placeholder"}">
      ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" alt="${companyName}" />` : companyName}
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">Facture ${invoice.invoiceNumber}</div>
      <div>Date facturation : ${formatDateFR(invoice.generatedAt)}</div>
      <div>Date échéance : ${formatDateFR(invoice.dueDate)}</div>
      ${opts.customerCode ? `<div>Code client : ${opts.customerCode}</div>` : ""}
    </div>
  </div>

  <!-- Two Column: Émetteur (grey) + Adressé à (white) -->
  <div class="two-column-info">
    <div class="info-box emetteur-box">
      <div class="info-box-title">Émetteur</div>
      <strong>${companyName}</strong>
      <div>${companyAddress}</div>
      ${opts.companyPhone ? `<div>Tél.: ${opts.companyPhone}</div>` : ""}
      ${opts.companyEmail ? `<div>Email: ${opts.companyEmail}</div>` : ""}
      ${opts.companyWebsite ? `<div>Web: ${opts.companyWebsite}</div>` : ""}
    </div>

    <div class="info-box adresse-box">
      <div class="info-box-title">Adressé à</div>
      <strong>${clientName}</strong>
      ${clientAddress ? `<div>${clientAddress.split("\n").join("</div><div>")}</div>` : ""}
      ${invoice.maxAnnualProduction ? `<div>Production annuelle maximale: ${invoice.maxAnnualProduction}</div>` : ""}
      ${invoice.numberOfTurbines ? `<div>Nombre de turbines: ${invoice.numberOfTurbines}</div>` : ""}
      ${invoice.pricePerMWh ? `<div>Prix par MWh: ${invoice.pricePerMWh} ${currency}</div>` : ""}
    </div>
  </div>

  <!-- Currency Note -->
  <div class="currency-note">Montants exprimés en ${currencySymbol}</div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50%;">Désignation</th>
        <th style="width: 12%;">TVA</th>
        <th style="width: 13%;">P.U. HT</th>
        <th style="width: 10%;">Qté</th>
        <th style="width: 15%;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceLines.map((line) => {
    const lineHT = (line.unitPrice ?? 0) * (line.quantity ?? 1);
    const vatPercent = vatRate; // vatRate is already in percentage form (e.g., 20 for 20%)
    const unitPriceFormatted = formatMoneyPlain(line.unitPrice ?? 0, currency);
    const totalHTFormatted = formatMoneyPlain(lineHT, currency);
    return `
        <tr>
          <td class="designation-cell">${line.description}</td>
          <td>${vatPercent}%</td>
          <td>${unitPriceFormatted}</td>
          <td>${line.quantity ?? 1}</td>
          <td>${totalHTFormatted}</td>
        </tr>
      `;
  }).join("")}
    </tbody>
  </table>

  <!-- Totals Section (right-aligned) -->
  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td>Total HT</td>
        <td>${formatMoneyPlain(finalHT, currency)}</td>
      </tr>
      <tr>
        <td>Total TVA ${vatRate}%</td>
        <td>${formatMoneyPlain(finalVAT, currency)}</td>
      </tr>
      <tr>
        <td>Total TTC</td>
        <td>${formatMoneyPlain(finalTotal, currency)}</td>
      </tr>
    </table>
  </div>

  <!-- Payment Conditions -->
  <div class="payment-conditions">
    <div class="payment-conditions-title">Conditions de règlement:</div>
    <div class="payment-conditions-content">${opts.paymentConditions || "À réception"}</div>
  </div>


 <!-- Legal Footer -->
  ${opts.companyFooter ? `
    <div class="footer-legal">
      Capital de ${opts.companyFooter.capital || "N/A"} - 
      ${opts.companyFooter.rc ? `R.C.: ${opts.companyFooter.rc} - ` : ""}
      ${opts.companyFooter.patente ? `Patente: ${opts.companyFooter.patente} - ` : ""}
      ${opts.companyFooter.if ? `I.F.: ${opts.companyFooter.if} - ` : ""}
      ${opts.companyFooter.cnss ? `C.N.S.S.: ${opts.companyFooter.cnss} - ` : ""}
      ${opts.companyFooter.ice ? `ICE: ${opts.companyFooter.ice}` : ""}
    </div>
  ` : ""}

  <!-- Page Number -->
  <div class="page-number">1 / 1</div>

</body>
</html>
  `;
}
