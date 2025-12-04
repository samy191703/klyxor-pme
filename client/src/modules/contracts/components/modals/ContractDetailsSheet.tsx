import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TECHNOLOGY_LABELS,
  PAYMENT_TYPE_LABELS,
  BILLING_PERIOD_LABELS,
  BUSINESS_UNIT_LABELS,
  CONTRACT_TYPE_LABELS,
  BILLING_PERIODS,
} from "@shared/enums/contracts";
import { ContractStatusLabels } from "@shared/enums/contracts-status.enum";
import { useBillingSchedule } from "@/hooks/useBillingSchedule";
import { BillingLinesTable } from "@/components/BillingLinesTable";
import { Skeleton } from "@/components/ui/skeleton";

// ⬇️ Pills
import { StatusPill } from "@/components/pills/contract-status-pill";
import { FormulaTypePill } from "@/components/pills/indexation-formula-type-pill";

/** ─────────────────────────── Types ─────────────────────────── **/
type Attachment = {
  id?: string;
  name: string;
  type?: string;
  category?: string;
  size?: number;
  url?: string;
  mimeType?: string;
  uploadedAt?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: any | null; // replace with your Contract type
  attachments?: Attachment[];
  attachmentsEndpoint?: (contractId: string | number) => string;
};

/** ─────────────────────── Helpers / Formatters ─────────────────────── **/
function fmtMoney(n?: number | string | null, currency = "EUR") {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? parseFloat(n.replace(",", ".")) : n;
  const safe = Number.isFinite(Number(v)) ? Number(v) : 0;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    safe
  );
}
function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("fr-FR").format(date);
}
function yn(v?: boolean | null) {
  return v ? "Oui" : v === false ? "Non" : "—";
}
function orDash<T>(v: T, format?: (x: T) => React.ReactNode) {
  if (v === null || v === undefined || v === "") return "—";
  return format ? format(v) : (v as any);
}
function formatBytes(n?: number) {
  if (n == null) return "—";
  if (n === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  const val = parseFloat((n / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i]}`;
}
/** Mappe une valeur via une table de labels, sinon fallback vers la valeur (ou "—") */
function mapLabel<T extends string | number | undefined | null>(
  map: Record<string, string>,
  value: T,
  fallback = "—"
) {
  if (value === null || value === undefined || value === "") return fallback;
  const key = String(value);
  return map[key] ?? String(value);
}

/** ─────────────────────────── UI bits ─────────────────────────── **/
// Use KLYXOR colors from :root
const VALUE_CLASS = "text-[var(--primary)] font-medium tracking-tight";
const LABEL_CLASS = "text-[13px] sm:text-sm text-[var(--muted-foreground)]";
const CELL_CLASS =
  "h-[52px] rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 flex items-center shadow-sm";

const Mono: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span className="font-mono text-xs break-words">{children}</span>
);

/** Field (Material-ish: labeled, elevated cell) */
function Field({
  label,
  children,
  className = "",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className={LABEL_CLASS}>{label}</div>
      <div className={CELL_CLASS}>
        <div className={`text-[15px] sm:text-base ${VALUE_CLASS}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** 2-col grid helper */
function Grid2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  );
}

/** Billing Schedule Content Component */
function BillingScheduleContent({ contractId }: { contractId?: string }) {
  const { data, isLoading, error } = useBillingSchedule(contractId, true);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : "Erreur lors du chargement de l'échéancier"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.schedule?.billingLines || data.schedule.billingLines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune échéance générée pour ce contrat
      </div>
    );
  }

  return <BillingLinesTable lines={data.schedule.billingLines} />;
}

/** ─────────────────────────── Component ─────────────────────────── **/
export default function ContractDetailsSheet({
  open,
  onOpenChange,
  contract,
  attachments: attachmentsProp,
  attachmentsEndpoint,
}: Props) {
  const [tab, setTab] = React.useState("general");
  const [attachments, setAttachments] = React.useState<Attachment[] | null>(
    attachmentsProp ?? null
  );
  const [attErr, setAttErr] = React.useState<string | null>(null);
  const [attLoading, setAttLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (attachmentsProp) {
      setAttachments(attachmentsProp);
      return;
    }
    if (!contract?.id) return;

    const endpoint =
      attachmentsEndpoint?.(contract.id) ??
      `/api/contracts/${contract.id}/uploads`;

    let cancelled = false;
    (async () => {
      try {
        setAttLoading(true);
        setAttErr(null);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items: Attachment[] = Array.isArray(json)
          ? json
          : json.items ?? [];
        if (!cancelled) setAttachments(items);
      } catch (e: any) {
        if (!cancelled)
          setAttErr(e?.message || "Échec du chargement des pièces jointes");
      } finally {
        if (!cancelled) setAttLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attachmentsProp, contract?.id, attachmentsEndpoint]);

  if (!contract) return null;

  const currency = contract.currency || "EUR";

  // Labels lisibles
  const statusLabel = mapLabel(ContractStatusLabels, contract.status);
  const typeLabel = mapLabel(CONTRACT_TYPE_LABELS, contract.type);
  const buLabel = mapLabel(BUSINESS_UNIT_LABELS, contract.businessUnit);
  const techLabel = mapLabel(TECHNOLOGY_LABELS, contract.technology);
  const paymentTypeLabel = mapLabel(PAYMENT_TYPE_LABELS, contract.paymentType);

  const billingLabel =
    BILLING_PERIODS.find(
      (p) => p.value === (contract.billingPeriod || contract.billingFrequency)
    )?.label ||
    mapLabel(
      BILLING_PERIOD_LABELS as unknown as Record<string, string>,
      contract.billingPeriod || contract.billingFrequency
    );

  const indexationOn =
    Boolean(contract?.indexationEnabled) &&
    !!contract?.indexationFormulaId &&
    contract?.indexationFormulaId !== "none";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[92vw] md:max-w-[960px] lg:max-w-[1120px] p-0 overflow-y-auto">
        {/* Sticky AppBar-like header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <div className="px-6 pt-5 pb-4">
            <SheetHeader>
              <SheetTitle className="text-left text-lg sm:text-xl flex flex-wrap items-center gap-3">
                <span className="mr-2">{orDash(contract.number)}</span>
                <span className="text-foreground/60">—</span>
                <span className={`ml-2 ${VALUE_CLASS}`}>
                  {orDash(contract.title)}
                </span>

                {/* Status pill in header */}
                <span className="inline-flex items-center gap-2 ml-auto">
                  <StatusPill status={contract.status} />
                </span>
              </SheetTitle>

              {/* Meta row under title */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="text-[var(--muted-foreground)]">
                  Type : <span className={VALUE_CLASS}>{typeLabel}</span>
                </div>
                <div className="text-[var(--muted-foreground)]">
                  BU : <span className={VALUE_CLASS}>{buLabel}</span>
                </div>
                {contract.technology && (
                  <div className="text-[var(--muted-foreground)]">
                    Tech : <span className={VALUE_CLASS}>{techLabel}</span>
                  </div>
                )}
                {indexationOn && (
                  <div className="text-[var(--muted-foreground)]">
                    Formule :{" "}
                    <span className="align-middle">
                      <FormulaTypePill
                        type={contract.indexationFormula ?? "NONE"}
                      />
                    </span>
                  </div>
                )}
              </div>
            </SheetHeader>
          </div>

          {/* Tabs as top navigation bar */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start overflow-x-auto rounded-none border-t border-b bg-background/80 px-2">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="period">Période & Montants</TabsTrigger>
              <TabsTrigger value="indexation">Indexation</TabsTrigger>
              <TabsTrigger value="echeancier">Échéancier</TabsTrigger>
              <TabsTrigger value="attachments">
                Pièces jointes
                {attachments?.length ? ` (${attachments.length})` : ""}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable content */}
        <div className="px-6 py-5 space-y-5">
          <Tabs value={tab} onValueChange={setTab}>
            {/* ───────── Général ───────── */}
            <TabsContent value="general" className="m-0">
              <Card className="border rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground/80">
                    Informations générales
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Grid2>
                    <Field label="N° contrat">{orDash(contract.number)}</Field>
                    <Field label="Titre">{orDash(contract.title)}</Field>
                    <Field label="Client">{orDash(contract.clientName)}</Field>
                    <Field label="Type">{typeLabel}</Field>
                    <Field label="BU / Entité">{buLabel}</Field>
                    <Field label="Devise">{orDash(currency)}</Field>
                    <Field label="Langue">
                      {mapLabel(
                        { FR: "Français", EN: "Anglais" },
                        contract.language || "FR"
                      )}
                    </Field>
                    {contract.technology && (
                      <Field label="Technologie">{techLabel}</Field>
                    )}
                    {contract.parkCode && (
                      <Field label="Parc">{contract.parkCode}</Field>
                    )}
                    {/* ⛔ Removed hasRequiredDocuments */}
                    <Field label="Créé par">
                      <Mono>{orDash(contract.createdBy)}</Mono>
                    </Field>
                    <Field label="Créé le">{fmtDate(contract.createdAt)}</Field>
                    <Field label="Validé par">
                      <Mono>{orDash(contract.validatedBy)}</Mono>
                    </Field>
                    <Field label="Dernière MAJ">
                      {fmtDate(contract.updatedAt)}
                    </Field>
                  </Grid2>
                </CardContent>
              </Card>

              <Alert
                className="mt-4 border-l-4"
                // use brand warning tones
                style={{
                  borderColor: "var(--secondary)",
                  backgroundColor: "hsl(44 50% 75% / 0.15)",
                }}
              >
                <Info className="h-4 w-4" />
                <AlertDescription className="text-[15px]">
                  <strong>Statut :</strong>{" "}
                  <span className="inline-flex align-middle ml-1">
                    <StatusPill status={contract.status} />
                  </span>{" "}
                  — après soumission, le contrat passe à « En attente de
                  validation ».
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* ───────── Période & Montants ───────── */}
            <TabsContent value="period" className="m-0">
              <Card className="border rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground/80">
                    Période & montants
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Grid2>
                    <Field label="Date début">
                      {fmtDate(contract.startDate)}
                    </Field>
                    <Field label="Date fin">{fmtDate(contract.endDate)}</Field>
                    <Field label="Périodicité de facturation">
                      {billingLabel}
                    </Field>
                    <Field label="Type de paiement">{paymentTypeLabel}</Field>
                    <Field label="Montant (contrat)">
                      {fmtMoney(contract.amount, currency)}
                    </Field>
                  </Grid2>

                  {(contract.type === "electricity" ||
                    contract.type === "renewable_ppa") && (
                    <>
                      <div className="border-t my-2" />
                      <h4 className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                        Spécifiques énergie
                      </h4>
                      <Grid2>
                        <Field label="Prod. annuelle max (MWh)">
                          {orDash(contract.maxAnnualProduction)}
                        </Field>
                        <Field label="Nb d’éoliennes">
                          {orDash(contract.numberOfTurbines)}
                        </Field>
                        <Field label="Prix / MWh">
                          {fmtMoney(contract.pricePerMWh, currency)}
                        </Field>
                      </Grid2>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ───────── Indexation ───────── */}
            <TabsContent value="indexation" className="m-0">
              <Card className="border rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wide text-foreground/80">
                      Indexation
                    </h3>
                    {indexationOn ? (
                      <FormulaTypePill
                        type={contract.indexationFormula ?? "NONE"}
                      />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {indexationOn ? (
                    <>
                      <Grid2>
                        <Field label="Activée">
                          {yn(contract.indexationEnabled)}
                        </Field>
                        <Field label="Formule ID">
                          <Mono>{orDash(contract.indexationFormulaId)}</Mono>
                        </Field>
                        <Field label="Formule">
                          <FormulaTypePill
                            type={contract.indexationFormula ?? "NONE"}
                          />
                        </Field>
                        <Field label="Fréquence">
                          {mapLabel(
                            BILLING_PERIOD_LABELS as unknown as Record<
                              string,
                              string
                            >,
                            contract.indexationFrequency || "annual"
                          )}
                        </Field>
                        <Field label="Date 1ère indexation">
                          {fmtDate(contract.indexationDate)}
                        </Field>
                        <Field label="Prochaine indexation">
                          {fmtDate(contract.nextIndexationDate)}
                        </Field>
                        <Field label="Mode de calcul">
                          {orDash(
                            contract.calculationMode ||
                              (contract.indexationMode ?? "P0")
                          )}
                        </Field>
                        <Field label="Règle prise d’indice">
                          {orDash(
                            contract.indexTakingDateRule ||
                              contract.indexationPolicy
                          )}
                        </Field>
                        <Field label="Date de prise d’indice">
                          {fmtDate(
                            contract.indexTakingDate || contract.lastIndiceDate
                          )}
                        </Field>
                        <Field label="Type requis (R/P)">
                          {orDash(contract.requireRevised)}
                        </Field>
                        <Field label="Cap (%)">
                          {orDash(contract.indexationCap, (x: any) => `${x}%`)}
                        </Field>
                        <Field label="Seuil (%)">
                          {orDash(
                            contract.indexationThreshold,
                            (x: any) => `${x}%`
                          )}
                        </Field>
                        <Field label="Montant base (P0)">
                          {fmtMoney(
                            contract.indexationBaseAmount ??
                              contract.fixedAmount,
                            currency
                          )}
                        </Field>
                        <Field label="Montant courant">
                          {fmtMoney(contract.indexationCurrentAmount, currency)}
                        </Field>
                      </Grid2>

                      {/* JSON blocks (full width) */}
                      <details className="rounded-lg border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-[var(--muted-foreground)]">
                          Séries d’indices (base)
                        </summary>
                        <pre className="mt-2 text-[12px] p-3 bg-background rounded overflow-x-auto">
                          {JSON.stringify(
                            contract.indexationBaseIndicesSeries ?? {},
                            null,
                            2
                          )}
                        </pre>
                      </details>

                      <details className="rounded-lg border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-[var(--muted-foreground)]">
                          Valeurs d’indices (base)
                        </summary>
                        <pre className="mt-2 text-[12px] p-3 bg-background rounded overflow-x-auto">
                          {JSON.stringify(
                            contract.indexationBaseIndicesValues ?? {},
                            null,
                            2
                          )}
                        </pre>
                      </details>

                      <details className="rounded-lg border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-[var(--muted-foreground)]">
                          Montant de base — série
                        </summary>
                        <pre className="mt-2 text-[12px] p-3 bg-background rounded overflow-x-auto">
                          {JSON.stringify(
                            contract.indexationBaseAmountSeries ?? {},
                            null,
                            2
                          )}
                        </pre>
                      </details>

                      <details className="rounded-lg border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-[var(--muted-foreground)]">
                          Dernier aperçu de calcul
                        </summary>
                        <pre className="mt-2 text-[12px] p-3 bg-background rounded overflow-x-auto">
                          {JSON.stringify(
                            contract.lastIndexationPreview ?? {},
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="text-sm text-[var(--muted-foreground)]">
                      Pas d’indexation configurée.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ───────── Échéancier ───────── */}
            <TabsContent value="echeancier" className="m-0">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Échéances de facturation</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plan de facturation actif pour ce contrat
                  </p>
                </CardHeader>
                <CardContent>
                  <BillingScheduleContent contractId={contract?.id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ───────── Pièces jointes ───────── */}
            <TabsContent value="attachments" className="m-0">
              <Card className="border rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground/80">
                    Pièces jointes
                  </h3>
                </CardHeader>
                <CardContent className="text-sm">
                  {attLoading && (
                    <div className="text-[var(--muted-foreground)]">
                      Chargement…
                    </div>
                  )}
                  {attErr && <div className="text-error">{attErr}</div>}

                  {attachments && attachments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[15px]">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-4 pr-3 font-semibold text-foreground/80">
                              Nom
                            </th>
                            <th className="py-4 pr-3 font-semibold text-foreground/80">
                              Type
                            </th>
                            <th className="py-4 pr-3 font-semibold text-foreground/80">
                              Catégorie
                            </th>
                            <th className="py-4 pr-3 font-semibold text-foreground/80">
                              Taille
                            </th>
                            <th className="py-4 pr-3 font-semibold text-foreground/80">
                              Lien
                            </th>
                            <th className="py-4 pr-0 font-semibold text-foreground/80">
                              Ajouté le
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {attachments.map((a) => (
                            <tr
                              key={a.id ?? a.name}
                              className="border-b last:border-0 hover:bg-[rgba(201,166,70,0.05)] transition-colors"
                            >
                              <td className="py-4 pr-3">
                                <span
                                  className={`${VALUE_CLASS} font-semibold`}
                                >
                                  {a.name}
                                </span>
                              </td>
                              <td className="py-4 pr-3">{a.type ?? "—"}</td>
                              <td className="py-4 pr-3">{a.category ?? "—"}</td>
                              <td className="py-4 pr-3">
                                {formatBytes(a.size)}
                              </td>
                              <td className="py-4 pr-3">
                                {a.url ? (
                                  <a
                                    className="underline underline-offset-2"
                                    style={{ color: "var(--secondary)" }} // gold
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Télécharger
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="py-4 pr-0">
                                {fmtDate(a.uploadedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : !attLoading ? (
                    <div className="text-[var(--muted-foreground)]">
                      Aucune pièce jointe
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
