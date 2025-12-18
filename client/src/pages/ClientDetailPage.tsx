// client/src/pages/ClientDetailPage.tsx

import { useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";

import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Download,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  History,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

function orDash(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(value: any): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

function formatMoney(value: any, currency?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  if (Number(num) === 0) return "—";
  const c = currency || "EUR";
  return `${Number(num).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${c}`;
}

function ClientStatusBadge({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();

  if (!status) {
    return (
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-700">
        N/A
      </Badge>
    );
  }

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
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-700">
      {status}
    </Badge>
  );
}

function ContractStatusBadge({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();

  if (!status) {
    return (
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-700">
        N/A
      </Badge>
    );
  }

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

  if (s.includes("draft") || s.includes("brouillon")) {
    return (
      <Badge className="border-sky-200 bg-sky-50 text-xs text-sky-700">
        Brouillon
      </Badge>
    );
  }

  if (s.includes("terminated") || s.includes("résili")) {
    return (
      <Badge className="border-red-200 bg-red-50 text-xs text-red-700">
        Résilié
      </Badge>
    );
  }

  if (s.includes("closed") || s.includes("clôtur") || s.includes("archived")) {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-xs text-slate-700">
        Clôturé
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-700">
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
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <div className="mt-1 text-sm text-slate-900">{value}</div>
        </div>
        <div className="rounded-full bg-slate-50 p-2">{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function ClientDetailPage() {
  const [match, params] = useRoute("/clients/:id");
  const [, navigate] = useLocation();
  const id = params?.id;

  const invalidId = !match || !id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["client-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Impossible de charger le client.");
      return res.json();
    },
  });

  const c: any = data || {};

  const displayName =
    c.name ||
    c.legalName ||
    c.legal_name ||
    c.displayName ||
    c.display_name ||
    c.code ||
    c.number ||
    "Client (sans nom)";

  const clientCode = c.code || c.number || c.reference || c.clientCode;
  const segment = c.segment || c.type || c.category;
  const status = c.status || c.clientStatus || c.state;

  const contactName = c.contactName || c.mainContactName || c.primaryContactName;
  const contactEmail =
    c.contactEmail || c.mainContactEmail || c.primaryContactEmail || c.email;
  const contactPhone =
    c.contactPhone || c.mainContactPhone || c.primaryContactPhone || c.phone;

  const country = c.country || c.countryName || c.country_code;
  const city = c.city || c.town || c.locality;
  const postalCode = c.postalCode || c.zipCode || c.postal_code;
  const addressLine = c.addressLine1 || c.address || c.street || c.address_line_1;

  const vatNumber = c.vatNumber || c.vat_number || c.tva || c.siret;

  const createdAt = c.createdAt || c.created_at;
  const updatedAt = c.updatedAt || c.updated_at;

  const defaultCurrency = c.currency || c.currencyCode || c.currency_code || "EUR";

  const contracts: any[] =
    c.contracts ||
    c.contractsList ||
    c.contracts_list ||
    c.relatedContracts ||
    [];

  const historyEvents: any[] = c.historyEvents || c.history_events || c.auditTrail || [];
  const documents: any[] = c.documents || c.files || [];

  const contractsTop = useMemo(() => contracts.slice(0, 5), [contracts]);
  const documentsTop = useMemo(() => documents.slice(0, 5), [documents]);

  if (invalidId) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>Identifiant de client invalide.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !data) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Chargement du client…
        </CardContent>
      </Card>
    );
  }

  if ((error || !data) && !isLoading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Impossible de charger ce client.
              </span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const locationLabel =
    [addressLine, [postalCode, city].filter(Boolean).join(" "), country]
      .filter((v) => v && v !== "—")
      .join(" · ") || "—";

  const goContractsForClient = () => {
    // Recherche côté liste contrats (c’est un Sales Pack shortcut)
    navigate(`/contracts?search=${encodeURIComponent(displayName)}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Link href="/clients" className="hover:underline">
              Base clients
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-700 truncate">{orDash(displayName)}</span>
          </div>

          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Building2 className="h-5 w-5 text-slate-500" />
            {orDash(displayName)}
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Code : {orDash(clientCode)} • Segment : {orDash(segment)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => window.alert("Export (à brancher)")}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button size="sm" className="gap-2" onClick={() => window.alert("Modifier (à brancher)")}>
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {status ? (
              <ClientStatusBadge status={status} />
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-xs text-slate-700 border-slate-200">
                Statut : Non renseigné
              </Badge>
            )}

            {segment && (
              <Badge variant="outline" className="bg-slate-50 text-xs text-slate-700 border-slate-200">
                Segment : {segment}
              </Badge>
            )}
            {country && (
              <Badge variant="outline" className="bg-slate-50 text-xs text-slate-700 border-slate-200">
                Pays : {country}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoSummaryCard
          label="Contact principal"
          value={orDash(contactName || contactEmail)}
          icon={<User className="h-4 w-4 text-slate-500" />}
        />
        <InfoSummaryCard
          label="Localisation"
          value={locationLabel}
          icon={<MapPin className="h-4 w-4 text-slate-500" />}
        />
        <InfoSummaryCard
          label="Contact"
          value={
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-900">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="truncate">{orDash(contactEmail)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-900">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="truncate">{orDash(contactPhone)}</span>
              </div>
            </div>
          }
          icon={<Phone className="h-4 w-4 text-slate-500" />}
        />
      </div>

      {/* Tabs */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-0">
          <Tabs defaultValue="infos" className="flex flex-col">
            <div className="border-b bg-slate-50 px-4 pt-3">
              <TabsList className="mb-2 h-9 gap-1 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="infos" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Infos
                </TabsTrigger>
                <TabsTrigger value="contacts" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="contracts" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Contrats
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  GED
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Historique
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-6 p-4">
              {/* INFOS */}
              <TabsContent value="infos" className="m-0 space-y-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Détails du client</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Informations générales et identification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                      <DetailItem label="Nom" value={orDash(displayName)} />
                      <DetailItem label="Code client" value={orDash(clientCode)} />
                      <DetailItem label="Segment" value={orDash(segment)} />
                      <DetailItem
                        label="Statut"
                        value={status ? <ClientStatusBadge status={status} /> : "Non renseigné"}
                      />

                      <DetailItem
                        label="Adresse"
                        value={
                          <>
                            {orDash(addressLine)}
                            <br />
                            {[postalCode, city].filter(Boolean).join(" ") || "—"}
                            <br />
                            {orDash(country)}
                          </>
                        }
                      />
                      <DetailItem label="N° TVA / SIRET" value={orDash(vatNumber)} />
                      <DetailItem label="Créé le" value={formatDate(createdAt)} />
                      <DetailItem label="Dernière mise à jour" value={formatDate(updatedAt)} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* CONTACTS */}
              <TabsContent value="contacts" className="m-0 space-y-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Contacts</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Contact principal et informations de communication.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailItem label="Contact principal" value={orDash(contactName)} />
                      <DetailItem
                        label="Email"
                        value={
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="truncate">{orDash(contactEmail)}</span>
                          </div>
                        }
                      />
                      <DetailItem
                        label="Téléphone"
                        value={
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="truncate">{orDash(contactPhone)}</span>
                          </div>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* CONTRATS */}
              <TabsContent value="contracts" className="m-0 space-y-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-semibold">Contrats associés</CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                          Top 5 contrats rattachés à ce client.
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="border-slate-300" onClick={goContractsForClient}>
                        Voir tous
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {contractsTop.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead>N° contrat</TableHead>
                              <TableHead>Intitulé</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Période</TableHead>
                              <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contractsTop.map((ctr, idx) => {
                              const cid = ctr.id || ctr.contract_id || ctr.number || ctr.contract_number;
                              const number = ctr.number || ctr.contractNumber || ctr.contract_number || ctr.code;
                              const title = ctr.title || ctr.contractTitle || ctr.name || "(Sans titre)";
                              const st = ctr.status || ctr.state || ctr.contractStatus;
                              const start = ctr.startDate || ctr.start_date || ctr.effectiveDate || ctr.effective_date;
                              const end = ctr.endDate || ctr.end_date || ctr.expiryDate || ctr.expiry_date;
                              const amt = ctr.amount ?? ctr.totalAmount ?? ctr.total_amount;
                              const cur = ctr.currency || ctr.currencyCode || ctr.currency_code || defaultCurrency;

                              return (
                                <TableRow
                                  key={cid ?? idx}
                                  className="border-slate-100 hover:bg-slate-50 cursor-pointer"
                                  onClick={() => cid && navigate(`/contracts/${encodeURIComponent(String(cid))}`)}
                                >
                                  <TableCell className="font-mono text-xs text-slate-900">{orDash(number)}</TableCell>
                                  <TableCell className="text-sm text-slate-900">{orDash(title)}</TableCell>
                                  <TableCell><ContractStatusBadge status={st} /></TableCell>
                                  <TableCell className="text-xs text-slate-700">
                                    {formatDate(start)} <span className="text-slate-300">—</span> {formatDate(end)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-slate-900">
                                    {formatMoney(amt, cur)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Aucun contrat n’est encore associé à ce client.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DOCUMENTS */}
              <TabsContent value="documents" className="m-0 space-y-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Documents</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      KYC, NDA, documents contractuels, etc.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {documentsTop.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {documentsTop.map((doc, idx) => (
                              <TableRow key={doc.id ?? idx} className="border-slate-100">
                                <TableCell className="text-sm text-slate-900">
                                  {orDash(doc.name || doc.fileName || doc.filename || doc.title)}
                                </TableCell>
                                <TableCell className="text-xs text-slate-700">{orDash(doc.type || doc.category)}</TableCell>
                                <TableCell className="text-xs text-slate-700">
                                  {formatDate(doc.uploadedAt || doc.uploaded_at || doc.createdAt || doc.created_at)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => window.alert("Téléchargement (à brancher)")}
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
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Aucun document n’est encore rattaché à ce client.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* HISTORIQUE */}
              <TabsContent value="history" className="m-0 space-y-4">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Historique</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Journal des événements sur ce client.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {historyEvents.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Utilisateur</TableHead>
                              <TableHead>Détail</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historyEvents.slice(0, 8).map((evt, idx) => (
                              <TableRow key={evt.id ?? idx} className="border-slate-100">
                                <TableCell className="text-xs text-slate-700 whitespace-nowrap">
                                  {formatDate(evt.date || evt.createdAt || evt.created_at)}
                                </TableCell>
                                <TableCell className="text-sm text-slate-900">
                                  {orDash(evt.action || evt.eventType || evt.event_type)}
                                </TableCell>
                                <TableCell className="text-sm text-slate-900">
                                  {orDash(evt.userName || evt.username || evt.user || evt.user_email)}
                                </TableCell>
                                <TableCell className="text-xs text-slate-600">
                                  {orDash(evt.detail || evt.description || evt.comment)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        L’historique sera alimenté automatiquement (création, modifications, contrats associés…).
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
