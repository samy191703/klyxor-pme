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
};

// Format helpers
function formatDateFR(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(value?: number | null): string {
  if (value == null) return "0,00";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
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
  const companyName = opts.companyName || "KLYXOR Solutions";
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

  const calculatedTotal = invoiceLines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const finalTotal = invoice.totalAmount ?? calculatedTotal;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
    .invoice-header { display: flex; align-items: center; padding: 20px; border-bottom: 2px solid #000; }
    .logo { height: 60px; margin-right: 20px; }
    .company-section { font-weight: bold; font-size: 18px; }
    .details-section { display: flex; justify-content: space-between; padding: 20px; }
    .client-section h3 { margin: 0 0 10px 0; }
    .invoice-info { font-size: 14px; }
    .invoice-info-grid .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    .totals-section { display: flex; justify-content: flex-end; padding: 0 20px 20px 0; }
    .totals-container { width: 300px; }
    .total-row, .total-due { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; }
    .footer { padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #ccc; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="invoice-header">
    ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="logo"/>` : ""}
    <div class="company-section">
      ${companyName}<br/>
      ${companyAddress}
    </div>
  </div>

  <div class="details-section">
    <div class="client-section">
      <h3>Client</h3>
      <div>${clientName}<br/>${clientAddress.split("\n").join("<br/>")}</div>
      ${invoice.maxAnnualProduction ? `<div>Production annuelle maximale: ${invoice.maxAnnualProduction}</div>` : ""}
      ${invoice.numberOfTurbines ? `<div>Nombre de turbines: ${invoice.numberOfTurbines}</div>` : ""}
      ${invoice.pricePerMWh ? `<div>Prix par MWh: ${invoice.pricePerMWh} ${invoice.currency ?? "EUR"}</div>` : ""}
    </div>

    <div class="invoice-info">
      <h3>Détails de la facture</h3>
      <div class="invoice-info-grid">
        <div class="info-row"><span>Numéro de facture:</span><span><strong>${invoice.invoiceNumber}</strong></span></div>
        <div class="info-row"><span>Date d'émission:</span><span>${formatDateFR(invoice.generatedAt)}</span></div>
        <div class="info-row"><span>Date d'échéance:</span><span>${formatDateFR(invoice.dueDate)}</span></div>
        <div class="info-row"><span>Référence contrat:</span><span>${invoice.contractNumber}</span></div>
        <div class="info-row"><span>Statut:</span><span>${labelOf(INVOICE_STATUS_LABELS, invoice.status)}</span></div>
        <div class="info-row"><span>TVA (%):</span><span>${vatRate * 100}%</span></div>
        <div class="info-row"><span>Montant HT:</span><span>${formatMoney(amountHT)}</span></div>
        <div class="info-row"><span>Montant TVA:</span><span>${formatMoney(vatAmount)}</span></div>
        <div class="info-row"><span>Total TTC:</span><span>${formatMoney(finalTotal)}</span></div>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>Prix unitaire (€)</th>
        <th>TVA (€)</th>
        <th>Montant (€)</th>
        <th>Statut</th>
        <th>Date échéance</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceLines.map((line, idx) => `
        <tr>
          <td>${line.sequenceNo ?? idx + 1}</td>
          <td>${line.description}</td>
          <td>${formatMoney(line.unitPrice ?? 0)}</td>
          <td>${formatMoney(line.vatAmount ?? 0)}</td>
          <td>${formatMoney(line.amount ?? 0)}</td>
          <td>${line.status ? labelOf(INVOICE_STATUS_LABELS, line.status) : ""}</td>
          <td>${formatDateFR(line.dueDate)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="totals-container">
      <div class="total-row"><span>Total HT:</span><span>${formatMoney(amountHT)}</span></div>
      <div class="total-row"><span>Total TVA:</span><span>${formatMoney(vatAmount)}</span></div>
      <div class="total-due"><span>Total TTC:</span><span>${formatMoney(finalTotal)}</span></div>
    </div>
  </div>

  <div class="footer">
    Émis par ${companyName} - Signature: __________________
  </div>
</body>
</html>
  `;
}
