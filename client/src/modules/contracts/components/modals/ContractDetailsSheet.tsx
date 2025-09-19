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
import { BILLING_PERIODS } from "@/modules/contracts/domain/constants";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

/** ─────────────────────────── UI bits ─────────────────────────── **/
const VALUE_CLASS =
  "text-[var(--klyxor-blue,#0059d6)] font-semibold tracking-tight";
const LABEL_CLASS = "text-[13px] sm:text-sm text-muted-foreground";
const CELL_CLASS =
  "min-h-[44px] rounded-md border bg-background/60 px-3 py-2 flex items-center";

const Mono: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span className="font-mono text-xs break-words">{children}</span>
);

/** A responsive field (label + value) that expands to fill free space */
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
      <div className={`${LABEL_CLASS}`}>{label}</div>
      <div className={`${CELL_CLASS}`}>
        <div className={`text-[15px] sm:text-base ${VALUE_CLASS}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Grid that auto-fills columns to efficiently use remaining space */
function BigGrid({
  children,
  min = 280,
}: React.PropsWithChildren<{ min?: number }>) {
  return (
    <div
      className="grid gap-3 sm:gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
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
  const billingLabel =
    BILLING_PERIODS.find(
      (p) => p.value === (contract.billingPeriod || contract.billingFrequency)
    )?.label || orDash(contract.billingPeriod || contract.billingFrequency);

  const indexationOn =
    Boolean(contract?.indexationEnabled) &&
    !!contract?.indexationFormulaId &&
    contract?.indexationFormulaId !== "none";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* p-0 so the sticky bar spans full width, content gets its own padding */}
      <SheetContent className="w-full sm:max-w-[92vw] md:max-w-[900px] lg:max-w-[1080px] p-0 overflow-y-auto">
        {/* Sticky header + tabs */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="px-6 pt-5 pb-4">
            <SheetHeader>
              <SheetTitle className="text-left text-lg sm:text-xl">
                <span className="mr-2">{orDash(contract.number)}</span>
                <span className="text-foreground/80">—</span>{" "}
                <span className={`ml-2 ${VALUE_CLASS}`}>
                  {orDash(contract.title)}
                </span>
              </SheetTitle>
              <div className="mt-2 text-sm text-muted-foreground">
                Statut :{" "}
                <span className={`ml-1 ${VALUE_CLASS}`}>
                  {orDash(contract.status)}
                </span>
              </div>
            </SheetHeader>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start overflow-x-auto rounded-none border-t border-b bg-background px-2">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="period">Période & Montants</TabsTrigger>
              <TabsTrigger value="indexation">Indexation</TabsTrigger>
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
            {/* ───────── Tab: Général ───────── */}
            <TabsContent value="general" className="m-0">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold">
                    Informations générales
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BigGrid min={300}>
                    <Field label="N° contrat">{orDash(contract.number)}</Field>
                    <Field label="Titre">{orDash(contract.title)}</Field>
                    <Field label="Client">{orDash(contract.clientName)}</Field>
                    <Field label="Type">{orDash(contract.type)}</Field>
                    <Field label="BU / Entité">
                      {orDash(contract.businessUnit)}
                    </Field>
                    <Field label="Devise">{orDash(currency)}</Field>
                    <Field label="Langue">
                      {orDash(contract.language || "FR")}
                    </Field>
                    {contract.technology && (
                      <Field label="Technologie">{contract.technology}</Field>
                    )}
                    {contract.parkCode && (
                      <Field label="Parc">{contract.parkCode}</Field>
                    )}
                    <Field label="Documents requis">
                      {yn(contract.hasRequiredDocuments)}
                    </Field>
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
                  </BigGrid>
                </CardContent>
              </Card>

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-[15px]">
                  <strong>Statut :</strong>{" "}
                  <span className={VALUE_CLASS}>{orDash(contract.status)}</span>{" "}
                  — après soumission, le contrat passe à «&nbsp;En attente de
                  validation&nbsp;».
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* ───────── Tab: Période & Montants ───────── */}
            <TabsContent value="period" className="m-0">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold">Période & montants</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BigGrid min={300}>
                    <Field label="Date début">
                      {fmtDate(contract.startDate)}
                    </Field>
                    <Field label="Date fin">{fmtDate(contract.endDate)}</Field>
                    <Field label="Périodicité de facturation">
                      {billingLabel}
                    </Field>
                    <Field label="Type de paiement">
                      {orDash(contract.paymentType)}
                    </Field>
                    <Field label="Montant (contrat)">
                      {fmtMoney(contract.amount, currency)}
                    </Field>
                  </BigGrid>

                  {(contract.type === "electricity" ||
                    contract.type === "renewable_ppa") && (
                    <div className="pt-2">
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                        Spécifiques énergie
                      </h4>
                      <BigGrid min={300}>
                        <Field label="Prod. annuelle max (MWh)">
                          {orDash(contract.maxAnnualProduction)}
                        </Field>
                        <Field label="Nb d’éoliennes">
                          {orDash(contract.numberOfTurbines)}
                        </Field>
                        <Field label="Prix / MWh">
                          {fmtMoney(contract.pricePerMWh, currency)}
                        </Field>
                      </BigGrid>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ───────── Tab: Indexation ───────── */}
            <TabsContent value="indexation" className="m-0">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold">Indexation</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {indexationOn ? (
                    <>
                      <BigGrid min={300}>
                        <Field label="Activée">
                          {yn(contract.indexationEnabled)}
                        </Field>
                        <Field label="Formule ID">
                          <Mono>{orDash(contract.indexationFormulaId)}</Mono>
                        </Field>
                        <Field label="Formule">
                          {orDash(contract.indexationFormula)}
                        </Field>
                        <Field label="Fréquence">
                          {orDash(contract.indexationFrequency || "annual")}
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
                      </BigGrid>

                      {/* JSON blocks as expandable, full width */}
                      <details className="rounded-md border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
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

                      <details className="rounded-md border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
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

                      <details className="rounded-md border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
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

                      <details className="rounded-md border bg-muted/30 px-3 py-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
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
                    <div className="text-sm text-muted-foreground">
                      Pas d’indexation configurée.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ───────── Tab: Pièces jointes ───────── */}
            <TabsContent value="attachments" className="m-0">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold">Pièces jointes</h3>
                </CardHeader>
                <CardContent className="text-sm">
                  {attLoading && (
                    <div className="text-muted-foreground">Chargement…</div>
                  )}
                  {attErr && <div className="text-red-600">{attErr}</div>}

                  {attachments && attachments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2 pr-2">Nom</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2">Catégorie</th>
                            <th className="py-2 pr-2">Taille</th>
                            <th className="py-2 pr-2">Lien</th>
                            <th className="py-2 pr-2">Ajouté le</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attachments.map((a) => (
                            <tr
                              key={a.id ?? a.name}
                              className="border-b last:border-0"
                            >
                              <td className="py-2 pr-2">
                                <span className={VALUE_CLASS}>{a.name}</span>
                              </td>
                              <td className="py-2 pr-2">{a.type ?? "—"}</td>
                              <td className="py-2 pr-2">{a.category ?? "—"}</td>
                              <td className="py-2 pr-2">
                                {formatBytes(a.size)}
                              </td>
                              <td className="py-2 pr-2">
                                {a.url ? (
                                  <a
                                    className="underline decoration-[var(--klyxor-blue,#0059d6)] underline-offset-2"
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
                              <td className="py-2 pr-2">
                                {fmtDate(a.uploadedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : !attLoading ? (
                    <div className="text-muted-foreground">
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
