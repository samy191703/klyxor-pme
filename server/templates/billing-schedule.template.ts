// server/templates/billing-schedule.template.ts
import {
  BillingFrequency,
  BillingType,
  BillingScheduleStatus,
  BillingLineStatus,
  BILLING_TYPE_LABELS,
} from "@shared/enums/billing.enum";

type BillingScheduleForPdf = {
  contractNumber: string | null;
  startDate: Date | string;
  endDate: Date | string;
  frequency: string; // "MONTHLY" | "QUARTERLY" | ...
  billingType: string; // "A_ECHOIR" | "TERME_ECHU"
  version: number;
  status: string; // "draft" | "active" | "archived"
  createdAt: Date | string;
  updatedAt: Date | string;
};

type BillingLineForPdf = {
  sequenceNo: number;
  dueDate: Date | string;
  amountHt: string | number; // decimal
  status: string; // "A_FACTURER" | "FACTUREE"
};

function formatDateFR(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("fr-FR");
}

function formatMoneyEUR(value: string | number | null | undefined): string {
  if (value == null) return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type RenderOptions = {
  logoDataUrl?: string; // data:image/png;base64,...
};

// 🔹 Local label maps (using your enums)
const BILLING_FREQUENCY_LABELS: Record<string, string> = {
  [BillingFrequency.MONTHLY]: "Mensuelle",
  [BillingFrequency.QUARTERLY]: "Trimestrielle",
  [BillingFrequency.SEMIANNUAL]: "Semestrielle",
  [BillingFrequency.ANNUAL]: "Annuelle",
};

const BILLING_STATUS_LABELS: Record<string, string> = {
  [BillingScheduleStatus.DRAFT]: "Brouillon",
  [BillingScheduleStatus.ACTIVE]: "Active",
  [BillingScheduleStatus.ARCHIVED]: "Archivée",
};

const BILLING_LINE_STATUS_LABELS: Record<string, string> = {
  [BillingLineStatus.A_FACTURER]: "À facturer",
  [BillingLineStatus.FACTUREE]: "Facturée",
};

// 🔹 Generic helper: map value → label with fallback
function labelOf<T extends Record<string, string>>(
  map: T,
  value: string
): string {
  return map[value] ?? value;
}

export function renderBillingScheduleHtml(
  schedule: BillingScheduleForPdf,
  lines: BillingLineForPdf[],
  opts: RenderOptions = {}
): string {
  const safeContractNumber = schedule.contractNumber ?? "—";

  const rowsHtml = lines
    .map((ln) => {
      const lineStatusLabel = labelOf(BILLING_LINE_STATUS_LABELS, ln.status);
      return `
        <tr>
          <td>${ln.sequenceNo}</td>
          <td>${formatDateFR(ln.dueDate)}</td>
          <td>${formatMoneyEUR(ln.amountHt)}</td>
          <td>${lineStatusLabel}</td>
        </tr>
      `;
    })
    .join("");

  const periode = `${formatDateFR(schedule.startDate)} — ${formatDateFR(
    schedule.endDate
  )}`;

  const frequencyLabel = labelOf(BILLING_FREQUENCY_LABELS, schedule.frequency);
  const billingTypeLabel = labelOf(
    BILLING_TYPE_LABELS as Record<string, string>,
    schedule.billingType
  );
  const statusLabel = labelOf(BILLING_STATUS_LABELS, schedule.status);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Échéancier - ${safeContractNumber}</title>
  <style>
    * {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 24px;
      font-size: 12px;
      color: #1f2933;
    }

    /* HEADER (logo + title) */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .logo {
      height: 40px;
      width: auto;
    }
    .title-block {
      flex: 1;
      text-align: center;
    }
    h1 {
      font-size: 20px;
      margin: 0;
    }
    .subtitle {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #4b5563;
    }

    .meta {
      margin-bottom: 16px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px 24px;
      margin-bottom: 8px;
    }
    .meta-item-label {
      font-size: 11px;
      color: #6b7280;
    }
    .meta-item-value {
      font-size: 12px;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 11px;
    }
    thead tr {
      background: #f9fafb;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      text-align: center;       /* horizontal center */
      vertical-align: middle;   /* vertical center */
    }
  </style>
</head>
<body>
  <div class="header">
    ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="logo" />` : ""}
    <div class="title-block">
      <h1>Échéancier de facturation</h1>
      <div class="subtitle">
        Contrat N° ${safeContractNumber}
      </div>
    </div>
  </div>

  <div class="meta">
    <!-- Row 1: Période / Fréquence / Type -->
    <div class="meta-row">
      <div>
        <div class="meta-item-label">Période</div>
        <div class="meta-item-value">${periode}</div>
      </div>
      <div>
        <div class="meta-item-label">Fréquence</div>
        <div class="meta-item-value">${frequencyLabel}</div>
      </div>
      <div>
        <div class="meta-item-label">Type</div>
        <div class="meta-item-value">${billingTypeLabel}</div>
      </div>
    </div>

    <!-- Row 2: Statut / Créé le / (empty third col) -->
    <div class="meta-row">
      <div>
        <div class="meta-item-label">Statut</div>
        <div class="meta-item-value">${statusLabel}</div>
      </div>
      <div>
        <div class="meta-item-label">Créé le</div>
        <div class="meta-item-value">${formatDateFR(schedule.createdAt)}</div>
      </div>
      <div></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Échéance</th>
        <th>Montant HT</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>
`;
}
