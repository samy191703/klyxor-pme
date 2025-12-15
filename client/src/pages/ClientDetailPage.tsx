// client/src/pages/ClientDetailPage.tsx

import type { ReactNode } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe2,
  MapPin,
  Download,
  Edit,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

function orDash(value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value: any): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatMoney(value: any, currency?: string): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "-";
  const c = currency || "EUR";
  return `${num.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${c}`;
}

function ClientStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">
        N/A
      </Badge>
    );
  }

  const s = status.toLowerCase();

  if (s.includes("act")) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
        <CheckCircle className="mr-1 h-3 w-3" />
        Actif
      </Badge>
    );
  }

  if (s.includes("pros")) {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-xs text-amber-700">
        Prospect
      </Badge>
    );
  }

  if (s.includes("close") || s.includes("inact")) {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-xs text-slate-700">
        Inactif
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">
      {status}
    </Badge>
  );
}

function ContractStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge
        variant="outline"
        className="border-slate-200 bg-slate-50 text-xs text-slate-700"
      >
        N/A
      </Badge>
    );
  }

  const s = status.toLowerCase();

  if (s.includes("active") || s.includes("actif")) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
        Actif
      </Badge>
    );
  }

  if (s.includes("pending") || s.includes("valider")) {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-xs text-amber-700">
        À valider
      </Badge>
    );
  }

  if (s.includes("terminated") || s.includes("résilié")) {
    return (
      <Badge className="border-red-200 bg-red-50 text-xs text-red-700">
        Résilié
      </Badge>
    );
  }

  if (s.includes("closed") || s.includes("clôturé") || s.includes("archived")) {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-xs text-slate-700">
        Clôturé
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-50 text-xs text-slate-700"
    >
      {status}
    </Badge>
  );
}

function InfoSummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-1 text-sm text-slate-900">{value}</div>
        </div>
        <div className="rounded-full bg-slate-50 p-2">{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function ClientDetailPage() {
  const [match, params] = useRoute("/clients/:id");
  const id = params?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Impossible de charger le client.");
      return res.json();
    },
  });

  const invalidId = !match || !id;
  const c: any = data || {};

  const displayName =
    c.name ||
    c.legalName ||
    c.legal_name ||
    c.displayName ||
    c.display_name ||
    c.code ||
    c.number ||
    "Client";

  const clientCode = c.code || c.number || c.reference || c.clientCode;
  const segment = c.segment || c.type || c.category;
  const status = c.status || c.clientStatus || c.state;

  const contactName =
    c.contactName || c.mainContactName || c.primaryContactName;
  const contactEmail =
    c.contactEmail || c.mainContactEmail || c.primaryContactEmail || c.email;
  const contactPhone =
    c.contactPhone || c.mainContactPhone || c.primaryContactPhone || c.phone;

  const country = c.country || c.countryName || c.country_code;
  const city = c.city || c.town || c.locality;
  const postalCode = c.postalCode || c.zipCode || c.postal_code;
  const addressLine =
    c.addressLine1 || c.address || c.street || c.address_line_1;

  const vatNumber = c.vatNumber || c.vat_number || c.tva || c.siret;

  const createdAt = c.createdAt || c.created_at;
  const updatedAt = c.updatedAt || c.updated_at;

  const defaultCurrency =
    c.currency || c.currencyCode || c.currency_code || "EUR";

  // Contrats associés
  const contracts: any[] =
    c.contracts ||
    c.contractsList ||
    c.contracts_list ||
    c.relatedContracts ||
    [];

  // Historique
  const historyEvents: any[] =
    c.historyEvents || c.history_events || c.auditTrail || [];

  // Documents
  const documents: any[] = c.documents || c.files || [];

  const layoutSubtitle = c
    ? `Code : ${orDash(clientCode)} • Segment : ${orDash(segment)}`
    : "Détail du client et informations associées.";

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1 rounded-full text-xs",
              isDark
                ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            <Download className="h-3 w-3" />
            Export Excel
          </Button>
          <Button
            size="sm"
            className="gap-1 rounded-full bg-[var(--klyxor-bleu-nuit,#111827)] text-xs text-white hover:bg-slate-900"
          >
            <Edit className="h-3 w-3" />
            Modifier
          </Button>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ClientStatusBadge status={status} />
          {segment && (
            <Badge
              variant="outline"
              className="bg-slate-50 text-xs text-slate-700"
            >
              Segment : {segment}
            </Badge>
          )}
          {country && (
            <Badge
              variant="outline"
              className="bg-slate-50 text-xs text-slate-700"
            >
              Pays : {country}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <KlyxorPageLayout
      title={
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Link href="/clients" className="hover:underline">
              Base clients
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-700">
              {orDash(displayName)}
            </span>
          </div>
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Building2 className="h-4 w-4 text-slate-500" />
            {orDash(displayName)}
          </span>
        </div>
      }
      subtitle={layoutSubtitle}
      actions={renderHeaderActions}
    >
      {(theme) => {
        const {
          sectionCardClass,
          tableHeaderClass,
          tableRowHoverClass,
          secondaryText,
          mutedText,
          isDark,
        } = theme;

        const tableRowClass = (base?: string) =>
          tableRowHoverClass(
            cn(base, isDark ? "border-slate-800" : "border-slate-100"),
          );

        // États d'erreur / chargement / ID invalide

        if (invalidId) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6">
                <Alert variant="destructive">
                  <AlertDescription>
                    Identifiant de client invalide.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          );
        }

        if (isLoading && !data) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6">
                <p className={cn("text-sm", mutedText)}>
                  Chargement du client...
                </p>
              </CardContent>
            </Card>
          );
        }

        if ((error || !data) && !isLoading) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6">
                <Alert variant="destructive">
                  <AlertDescription>
                    Impossible de charger ce client. Veuillez réessayer.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          );
        }

        // Vue principale

        return (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-6">
                {/* Résumé cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoSummaryCard
                    label="Contact principal"
                    value={orDash(contactName || contactEmail || "—")}
                    icon={<User className="h-4 w-4 text-slate-500" />}
                  />
                  <InfoSummaryCard
                    label="Localisation"
                    value={
                      [
                        addressLine,
                        `${orDash(postalCode)} ${orDash(city)}`.trim(),
                        country,
                      ]
                        .filter((v) => v && v !== "-" && v !== " ")
                        .join(" · ") || "-"
                    }
                    icon={<MapPin className="h-4 w-4 text-slate-500" />}
                  />
                  <InfoSummaryCard
                    label="Contact"
                    value={
                      <>
                        <div>{orDash(contactEmail)}</div>
                        <div className="text-xs text-slate-500">
                          {orDash(contactPhone)}
                        </div>
                      </>
                    }
                    icon={<Phone className="h-4 w-4 text-slate-500" />}
                  />
                </div>

                {/* Carte + onglets */}
                <Card className={sectionCardClass}>
                  <CardContent className="p-0">
                    <Tabs defaultValue="infos" className="flex flex-col">
                      <div className="border-b bg-slate-50 px-4 pt-3">
                        <TabsList className="mb-2 h-9 gap-1 rounded-xl bg-slate-100 p-1">
                          <TabsTrigger
                            value="infos"
                            className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                          >
                            Infos
                          </TabsTrigger>
                          <TabsTrigger
                            value="contacts"
                            className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                          >
                            Contacts
                          </TabsTrigger>
                          <TabsTrigger
                            value="contracts"
                            className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                          >
                            Contrats
                          </TabsTrigger>
                          <TabsTrigger
                            value="documents"
                            className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                          >
                            GED
                          </TabsTrigger>
                          <TabsTrigger
                            value="history"
                            className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                          >
                            Historique
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <div className="space-y-6 p-4">
                        {/* INFOS */}
                        <TabsContent value="infos" className="m-0 space-y-4">
                          <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold">
                                Détails du client
                              </CardTitle>
                              <CardDescription
                                className={cn(
                                  "text-[11px]",
                                  secondaryText,
                                )}
                              >
                                Informations générales et identification
                                légale.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                                <DetailItem
                                  label="Nom"
                                  value={orDash(displayName)}
                                />
                                <DetailItem
                                  label="Code client"
                                  value={orDash(clientCode)}
                                />
                                <DetailItem
                                  label="Segment"
                                  value={orDash(segment)}
                                />
                                <DetailItem
                                  label="Statut"
                                  value={<ClientStatusBadge status={status} />}
                                />
                                <DetailItem
                                  label="Adresse"
                                  value={
                                    <>
                                      {orDash(addressLine)}
                                      <br />
                                      {[postalCode, city]
                                        .filter(Boolean)
                                        .join(" ")}
                                      <br />
                                      {orDash(country)}
                                    </>
                                  }
                                />
                                <DetailItem
                                  label="N° TVA / SIRET"
                                  value={orDash(vatNumber)}
                                />
                                <DetailItem
                                  label="Créé le"
                                  value={formatDate(createdAt)}
                                />
                                <DetailItem
                                  label="Dernière mise à jour"
                                  value={formatDate(updatedAt)}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* CONTACTS */}
                        <TabsContent
                          value="contacts"
                          className="m-0 space-y-4"
                        >
                          <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold">
                                Contacts
                              </CardTitle>
                              <CardDescription
                                className={cn(
                                  "text-[11px]",
                                  secondaryText,
                                )}
                              >
                                Contacts principaux pour ce client.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="grid gap-4 md:grid-cols-2">
                                <DetailItem
                                  label="Contact principal"
                                  value={orDash(contactName)}
                                />
                                <DetailItem
                                  label="Email"
                                  value={
                                    <div className="flex items-center gap-1 text-sm">
                                      <Mail className="h-3 w-3 text-slate-400" />
                                      <span>{orDash(contactEmail)}</span>
                                    </div>
                                  }
                                />
                                <DetailItem
                                  label="Téléphone"
                                  value={
                                    <div className="flex items-center gap-1 text-sm">
                                      <Phone className="h-3 w-3 text-slate-400" />
                                      <span>{orDash(contactPhone)}</span>
                                    </div>
                                  }
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* CONTRATS ASSOCIÉS */}
                        <TabsContent
                          value="contracts"
                          className="m-0 space-y-4"
                        >
                          <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <CardTitle className="text-sm font-semibold">
                                    Contrats associés
                                  </CardTitle>
                                  <CardDescription
                                    className={cn(
                                      "text-[11px]",
                                      secondaryText,
                                    )}
                                  >
                                    Liste des contrats rattachés à ce client.
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                              {contracts && contracts.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <Table>
                                    <TableHeader className={tableHeaderClass}>
                                      <TableRow>
                                        <TableHead>N° contrat</TableHead>
                                        <TableHead>Intitulé</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Période</TableHead>
                                        <TableHead className="text-right">
                                          Montant
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {contracts.map((ctr, idx) => (
                                        <TableRow
                                          key={ctr.id ?? idx}
                                          className={tableRowClass(
                                            "cursor-pointer",
                                          )}
                                          onClick={() => {
                                            const cid =
                                              ctr.id ||
                                              ctr.contract_id ||
                                              ctr.number;
                                            if (cid) {
                                              window.location.href = `/contracts/${cid}`;
                                            }
                                          }}
                                        >
                                          <TableCell>
                                            {orDash(
                                              ctr.number ||
                                                ctr.contractNumber ||
                                                ctr.code,
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {orDash(
                                              ctr.title ||
                                                ctr.contractTitle ||
                                                ctr.name,
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <ContractStatusBadge
                                              status={
                                                ctr.status ||
                                                ctr.state ||
                                                ctr.contractStatus
                                              }
                                            />
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(
                                              ctr.startDate ||
                                                ctr.start_date,
                                            )}{" "}
                                            →{" "}
                                            {formatDate(
                                              ctr.endDate || ctr.end_date,
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {formatMoney(
                                              ctr.amount || ctr.totalAmount,
                                              ctr.currency || defaultCurrency,
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  Aucun contrat n&apos;est encore associé à ce
                                  client.
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* DOCUMENTS */}
                        <TabsContent
                          value="documents"
                          className="m-0 space-y-4"
                        >
                          <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold">
                                Documents associés
                              </CardTitle>
                              <CardDescription
                                className={cn(
                                  "text-[11px]",
                                  secondaryText,
                                )}
                              >
                                KYC, NDA, documents contractuels, etc.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                              {documents && documents.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <Table>
                                    <TableHeader className={tableHeaderClass}>
                                      <TableRow>
                                        <TableHead>Nom du document</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">
                                          Actions
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {documents.map((doc, idx) => (
                                        <TableRow
                                          key={doc.id ?? idx}
                                          className={tableRowClass()}
                                        >
                                          <TableCell>
                                            {orDash(
                                              doc.name ||
                                                doc.fileName ||
                                                doc.filename ||
                                                doc.title,
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {orDash(doc.type || doc.category)}
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(
                                              doc.uploadedAt ||
                                                doc.uploaded_at ||
                                                doc.createdAt ||
                                                doc.created_at,
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  Aucun document n&apos;est encore rattaché à ce
                                  client.
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* HISTORIQUE */}
                        <TabsContent
                          value="history"
                          className="m-0 space-y-4"
                        >
                          <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold">
                                Historique des actions
                              </CardTitle>
                              <CardDescription
                                className={cn(
                                  "text-[11px]",
                                  secondaryText,
                                )}
                              >
                                Journal des événements sur ce client :
                                création, mises à jour, contrats associés, etc.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                              {historyEvents && historyEvents.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <Table>
                                    <TableHeader className={tableHeaderClass}>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Détail</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {historyEvents.map((evt, idx) => (
                                        <TableRow
                                          key={evt.id ?? idx}
                                          className={tableRowClass()}
                                        >
                                          <TableCell className="whitespace-nowrap">
                                            {formatDate(
                                              evt.date ||
                                                evt.createdAt ||
                                                evt.created_at,
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {orDash(
                                              evt.action ||
                                                evt.eventType ||
                                                evt.event_type,
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {orDash(
                                              evt.userName ||
                                                evt.username ||
                                                evt.user ||
                                                evt.user_email,
                                            )}
                                          </TableCell>
                                          <TableCell className="max-w-xs text-xs text-slate-600">
                                            {orDash(
                                              evt.detail ||
                                                evt.description ||
                                                evt.comment,
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  L&apos;historique client sera alimenté
                                  automatiquement par l&apos;audit (création,
                                  modifications, liens avec contrats, etc.).
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        );
      }}
    </KlyxorPageLayout>
  );
}
