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
};

type InvoiceLineForPdf = {
  sequenceNo?: number;
  dueDate?: Date | string;
  amountHt?: number;
  status?: string;
};

type RenderOptions = {
  logoDataUrl?: string;
};

function formatDateFR(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("fr-FR");
}

function formatMoneyEUR(value?: number | null): string {
  if (value == null) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function renderInvoiceHtml(
  invoice: InvoiceForPdf,
  line?: InvoiceLineForPdf,
  opts: RenderOptions = {}
): string {
  const tvaAmount = invoice.vatAmount ?? (invoice.baseAmount * (invoice.vatRate / 100));
  const totalAmount = invoice.totalAmount;

  let lineHtml = "";
  if (line) {
    const lineTvaAmount = line.amountHt ? line.amountHt * (invoice.vatRate / 100) : 0;
    const lineTtcAmount = (line.amountHt ?? 0) + lineTvaAmount;
    lineHtml = `
      <tr>
        <td>${line.sequenceNo ?? "-"}</td>
        <td>${formatDateFR(line.dueDate)}</td>
        <td>${formatMoneyEUR(line.amountHt)}</td>
        <td>${formatMoneyEUR(lineTvaAmount)}</td>
        <td>${formatMoneyEUR(lineTtcAmount)}</td>
        <td>${line.status ?? "-"}</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: system-ui; margin: 24px; color: #1f2933; font-size: 12px; }
    .header { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
    .logo { height:40px; }
    h1 { font-size:20px; margin:0; }
    .subtitle { font-size:12px; font-weight:600; color:#4b5563; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { border:1px solid #e5e7eb; padding:6px 8px; text-align:center; }
    thead { background:#f9fafb; }
    .meta { margin-top:12px; }
    .meta div { margin-bottom:4px; }
  </style>
</head>
<body>
  <div class="header">
    ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="logo"/>` : ""}
    <div>
      <h1>Facture</h1>
      <div class="subtitle">N° ${invoice.invoiceNumber} - Contrat N° ${invoice.contractNumber}</div>
    </div>
  </div>

  <div class="meta">
    <div>Description: ${invoice.description}</div>
    <div>Échéance: ${formatDateFR(invoice.dueDate)}</div>
    <div>Statut: ${invoice.status}</div>
    <div>Créée le: ${formatDateFR(invoice.createdAt)}</div>
    <div>Générée le: ${formatDateFR(invoice.generatedAt)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Échéance</th>
        <th>Montant HT</th>
        <th>Montant TVA</th>
        <th>Montant TTC</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      ${lineHtml || `
      <tr>
        <td>-</td>
        <td>${formatDateFR(invoice.dueDate)}</td>
        <td>${formatMoneyEUR(invoice.baseAmount)}</td>
        <td>${formatMoneyEUR(tvaAmount)}</td>
        <td>${formatMoneyEUR(totalAmount)}</td>
        <td>${invoice.status}</td>
      </tr>
      `}
    </tbody>
  </table>
</body>
</html>
  `;
}
