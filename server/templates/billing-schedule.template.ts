export type InvoiceEmitter = {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type InvoiceCustomer = {
  name: string;
  address: string;
  city?: string;
  ice?: string;
};

export type InvoiceItem = {
  description: string;
  tva: number;
  unitPrice: number;
  quantity: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  customerCode?: string;
  emitter: InvoiceEmitter;
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  bank: {
    bankName: string;
    accountNumber: string;
    iban: string;
    swift: string;
    owner: string;
    address: string;
  };
  companyFooter: {
    capital: string;
    rc: string;
    patente: string;
    if: string;
    cnss: string;
    ice: string;
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MAD",
  }).format(value);
}

function formatDateFR(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("fr-FR");
}

function formatMoneyEUR(value: number | null | undefined): string {
  if (value == null) return "0,00 €";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function renderInvoiceHtml(data: InvoiceData, logoDataUrl?: string) {
  const rowsHtml = data.items
    .map((it) => {
      const totalHT = it.unitPrice * it.quantity;
      return `
        <tr>
          <td>${it.description}</td>
          <td>${it.tva}%</td>
          <td>${formatMoney(it.unitPrice)}</td>
          <td>${it.quantity}</td>
          <td>${formatMoney(totalHT)}</td>
        </tr>
      `;
    })
    .join("");

  const totalHT = data.items.reduce(
    (acc, it) => acc + it.unitPrice * it.quantity,
    0
  );

  const totalTVA = data.items.reduce(
    (acc, it) => acc + it.unitPrice * it.quantity * (it.tva / 100),
    0
  );

  const totalTTC = totalHT + totalTVA;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <style>
    * { font-family: Arial, sans-serif; }
    body { margin: 24px; font-size: 12px; color: #222; }

    .header { display: flex; justify-content: space-between; }
    .logo { height: 60px; }

    .title {
      font-size: 22px;
      margin-top: 12px;
      font-weight: bold;
      text-align: right;
    }

    .section-title {
      font-size: 14px;
      margin: 20px 0 8px 0;
      font-weight: bold;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 12px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: center;
    }

    th { background: #f5f5f5; }

    .totals {
      margin-top: 20px;
      width: 280px;
      float: right;
    }

    .totals td {
      border: 1px solid #ccc;
      padding: 6px 8px;
    }

    .footer {
      margin-top: 40px;
      font-size: 10px;
      color: #555;
      text-align: center;
    }
  </style>
</head>

<body>

  <div class="header">
    <div>
      ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" />` : ""}
    </div>
    <div class="title">
      Facture N° ${data.invoiceNumber}
      <br />
      <small>Date facturation : ${formatDateFR(data.invoiceDate)}</small>
      <br />
      <small>Date échéance : ${formatDateFR(data.dueDate)}</small>
      ${
        data.customerCode
          ? `<br /><small>Code client : ${data.customerCode}</small>`
          : ""
      }
    </div>
  </div>

  <!-- Emetteur -->
  <div class="section-title">Émetteur</div>
  <div>
    <strong>${data.emitter.name}</strong><br />
    ${data.emitter.address}<br />
    ${data.emitter.phone ? `Tél: ${data.emitter.phone}<br />` : ""}
    ${data.emitter.email ? `Email: ${data.emitter.email}<br />` : ""}
    ${data.emitter.website ? `Web: ${data.emitter.website}` : ""}
  </div>

  <!-- Client -->
  <div class="section-title">Adressé à</div>
  <div>
    <strong>${data.customer.name}</strong><br />
    ${data.customer.address}<br />
    ${data.customer.city ? data.customer.city + "<br />" : ""}
    ${data.customer.ice ? "ICE: " + data.customer.ice : ""}
  </div>

  <!-- ITEMS -->
  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>TVA</th>
        <th>P.U. HT</th>
        <th>Qté</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <!-- TOTALS -->
  <table class="totals">
    <tr>
      <td><strong>Total HT</strong></td>
      <td><strong>${formatMoney(totalHT)}</strong></td>
    </tr>
    <tr>
      <td><strong>Total TVA</strong></td>
      <td><strong>${formatMoney(totalTVA)}</strong></td>
    </tr>
    <tr>
      <td><strong>Total TTC</strong></td>
      <td><strong>${formatMoney(totalTTC)}</strong></td>
    </tr>
  </table>

  <div style="clear: both;"></div>

  <!-- CONDITIONS -->
  <div class="section-title">Conditions de règlement</div>
  À réception

  <div class="section-title">Règlement par virement</div>
  Banque: ${data.bank.bankName}<br />
  Numéro de compte: ${data.bank.accountNumber}<br />
  IBAN: ${data.bank.iban}<br />
  BIC/SWIFT: ${data.bank.swift}<br />
  Propriétaire du compte: ${data.bank.owner}<br />
  Adresse: ${data.bank.address}<br />

  <!-- FOOTER -->
  <div class="footer">
    Capital: ${data.companyFooter.capital} - 
    R.C.: ${data.companyFooter.rc} - 
    Patente: ${data.companyFooter.patente} - 
    I.F.: ${data.companyFooter.if} -
    C.N.S.S.: ${data.companyFooter.cnss} -
    ICE: ${data.companyFooter.ice}
  </div>

</body>
</html>
`;
}

// Billing Schedule types
type BillingScheduleForPdf = {
  contractNumber: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  frequency: string | null;
  billingType: string | null;
  version: number | null;
  status: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  tvaRate: number | null;
};

type BillingLineForPdf = {
  sequenceNo?: number | null;
  dueDate?: Date | string | null;
  amountHt?: number | null;
  status?: string | null;
};

type BillingScheduleRenderOptions = {
  logoDataUrl?: string;
};

export function renderBillingScheduleHtml(
  schedule: BillingScheduleForPdf,
  lines: BillingLineForPdf[],
  opts: BillingScheduleRenderOptions = {}
): string {
  const tvaRate = schedule.tvaRate ?? 20;
  const totalHT = lines.reduce((sum, line) => sum + (Number(line.amountHt) || 0), 0);
  const totalVAT = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + totalVAT;

  const linesHtml = lines
    .map((line) => {
      const amountHt = Number(line.amountHt) || 0;
      return `
        <tr>
          <td>${line.sequenceNo ?? ""}</td>
          <td>${formatDateFR(line.dueDate)}</td>
          <td>${formatMoneyEUR(amountHt)}</td>
          <td>${formatMoneyEUR(amountHt * (tvaRate / 100))}</td>
          <td>${formatMoneyEUR(amountHt * (1 + tvaRate / 100))}</td>
          <td>${line.status ?? ""}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Plan de facturation - ${schedule.contractNumber ?? "N/A"}</title>
  <style>
    * { font-family: Arial, sans-serif; }
    body { margin: 24px; font-size: 12px; color: #222; }

    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .logo { height: 60px; }
    .title {
      font-size: 18px;
      margin-top: 12px;
      font-weight: bold;
      text-align: right;
    }

    .section-title {
      font-size: 14px;
      margin: 20px 0 8px 0;
      font-weight: bold;
      text-transform: uppercase;
    }

    .info-section {
      margin-bottom: 15px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 12px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: center;
    }

    th { background: #f5f5f5; }

    .totals {
      margin-top: 20px;
      width: 280px;
      float: right;
    }

    .totals td {
      border: 1px solid #ccc;
      padding: 6px 8px;
    }

    .totals tr:last-child td {
      background: #f0f0f0;
      font-weight: bold;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="logo" />` : ""}
    </div>
    <div class="title">
      Plan de Facturation
      <br />
      <small>Contrat: ${schedule.contractNumber ?? "N/A"}</small>
    </div>
  </div>

  <div class="section-title">Informations du plan</div>
  <div class="info-section">
    <strong>Contrat:</strong> ${schedule.contractNumber ?? "N/A"}<br />
    <strong>Période:</strong> ${formatDateFR(schedule.startDate)} - ${formatDateFR(schedule.endDate)}<br />
    <strong>Fréquence:</strong> ${schedule.frequency ?? "N/A"}<br />
    <strong>Type:</strong> ${schedule.billingType ?? "N/A"}<br />
    <strong>Version:</strong> ${schedule.version ?? "N/A"}<br />
    <strong>Statut:</strong> ${schedule.status ?? "N/A"}<br />
    <strong>TVA:</strong> ${tvaRate}%
  </div>

  <div class="section-title">Lignes de facturation</div>
  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Date d'échéance</th>
        <th>Montant HT</th>
        <th>TVA</th>
        <th>Montant TTC</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td><strong>Total HT</strong></td>
      <td><strong>${formatMoneyEUR(totalHT)}</strong></td>
    </tr>
    <tr>
      <td><strong>Total TVA ${tvaRate}%</strong></td>
      <td><strong>${formatMoneyEUR(totalVAT)}</strong></td>
    </tr>
    <tr>
      <td><strong>Total TTC</strong></td>
      <td><strong>${formatMoneyEUR(totalTTC)}</strong></td>
    </tr>
  </table>

  <div style="clear: both;"></div>

</body>
</html>
`;
}
