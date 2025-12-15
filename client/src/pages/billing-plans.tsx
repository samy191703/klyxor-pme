import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Info,
  Link,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import Header from "@/components/layout/header";
import { PageHeaderKlyxor } from "@/components/layout/PageHeaderKlyxor";

interface BillingPlan {
  id: string;
  contractId?: string;
  contractNumber?: string;
  contractName?: string;
  contractTitle?: string;
  contractType?: string;
  period?: { start: string; end: string };
  periodicity?: string;
  term?: string;
  linesCount?: number;
  totalAmount?: number;
  currency?: string;
  status?:
    | "to_validate"
    | "validated"
    | "rejected"
    | "sap_pending"
    | "sap_error";
  lastAction?: string;
  flowsToCreate?: number;
  creator?: string;
  createdAt?: string;
  indexationFormula?: string;
  sapStatus?: string;
  sapCode?: string;
  paymentProofCount?: number;
  businessUnit?: string;
}

export default function BillingPlans() {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [statusFilter, setStatusFilter] = useState("to_validate");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Permissions
  const { hasPermission } = usePermissions();
  const canCreatePlan = hasPermission("/billing-plans");
  const canValidatePlan = hasPermission("/billing-plans");
  const canExportPlan = hasPermission("/billing-plans");
  const canGenerateFlows = hasPermission("/payment-flows");

  // Récupération des plans de facturation depuis l'API
  const { data: plansData = [], isLoading: plansLoading } = useQuery<
    BillingPlan[]
  >({
    queryKey: ["/api/admin/billing/plans"],
  });

  // Mutation pour générer les flux de paiement
  const generateFlowsMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest(
        "POST",
        `/api/billing-plans/${planId}/generate-flows`
      );
    },
    onSuccess: () => {
      toast({
        title: "Flux générés",
        description: "Les flux de paiement ont été générés avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de générer les flux de paiement",
        variant: "destructive",
      });
    },
  });

  // Mutation pour valider un plan
  const validatePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest("PUT", `/api/billing-plans/${planId}`, {
        status: "validated",
      });
    },
    onSuccess: () => {
      toast({
        title: "Plan validé",
        description: "Le plan de facturation a été validé",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de valider le plan",
        variant: "destructive",
      });
    },
  });

  // Export des données
  const handleExport = async () => {
    try {
      await apiRequest("GET", "/api/admin/billing/plans/export");
      toast({
        title: "Export réussi",
        description: "Les données ont été exportées",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les données",
        variant: "destructive",
      });
    }
  };

  // Données exemple enrichies (fallback si pas de données API)
  const plans: BillingPlan[] =
    plansData.length > 0
      ? plansData
      : [
          {
            id: "PF-2025-001",
            contractId: "AUX89",
            contractName: "OMSA - Maintenance Éolienne Normandie",
            contractType: "OMSA",
            period: { start: "2025-01-01", end: "2025-12-31" },
            periodicity: "Mensuel",
            term: "À échoir",
            linesCount: 12,
            totalAmount: 240000,
            currency: "EUR",
            status: "to_validate",
            lastAction: "Création avec indexation ICHT",
            flowsToCreate: 12,
            creator: "Sophie Martin",
            createdAt: "2025-01-20 14:30",
            indexationFormula: "ICHT",
            sapStatus: "En attente",
            paymentProofCount: 0,
            businessUnit: "ENGIE Solutions France",
          },
          {
            id: "PF-2025-002",
            contractId: "FIG83",
            contractName: "PPA - Parc Photovoltaïque Figueira",
            contractType: "PPA",
            period: { start: "2025-02-01", end: "2025-07-31" },
            periodicity: "Trimestriel",
            term: "Échu",
            linesCount: 2,
            totalAmount: 875000,
            currency: "EUR",
            status: "sap_pending",
            lastAction: "Export SAP en cours",
            flowsToCreate: 2,
            creator: "Pierre Durand",
            createdAt: "2025-01-19 09:15",
            indexationFormula: "FMOA",
            sapStatus: "Interface SAP",
            sapCode: "4500123456",
            paymentProofCount: 0,
            businessUnit: "ENGIE Green",
          },
          {
            id: "PF-2024-098",
            contractId: "JCO99",
            contractName: "LTSA - Joint Contract Operation Belgium",
            contractType: "LTSA",
            period: { start: "2024-01-01", end: "2024-12-31" },
            periodicity: "Mensuel",
            term: "À échoir",
            linesCount: 12,
            totalAmount: 1250000,
            currency: "EUR",
            status: "validated",
            lastAction: "Validé et intégré SAP",
            flowsToCreate: 0,
            creator: "Marie Leblanc",
            createdAt: "2024-01-05 11:00",
            indexationFormula: "CPI",
            sapStatus: "Intégré",
            sapCode: "4500112233",
            paymentProofCount: 8,
            businessUnit: "ENGIE Global Energy Management",
          },
          {
            id: "PF-2025-003",
            contractId: "CPP12",
            contractName: "OMGC - Contrat Performance Pays de Loire",
            contractType: "OMGC",
            period: { start: "2025-01-01", end: "2025-06-30" },
            periodicity: "Mensuel",
            term: "À échoir",
            linesCount: 6,
            totalAmount: 320000,
            currency: "EUR",
            status: "sap_error",
            lastAction: "Erreur SAP - Code article manquant",
            flowsToCreate: 6,
            creator: "Jean Martin",
            createdAt: "2025-01-18 16:45",
            indexationFormula: "ICC",
            sapStatus: "Erreur",
            paymentProofCount: 0,
            businessUnit: "ENGIE Solutions France",
          },
        ];

  const filteredPlans = plans.filter((plan) => {
    const matchesStatus =
      statusFilter === "all" || plan.status === statusFilter;
    const contractDisplay = plan.contractName || plan.contractTitle || "";
    const contractIdDisplay = plan.contractId || plan.contractNumber || "";
    const matchesSearch =
      contractDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractIdDisplay.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "to_validate":
        return (
          <Badge
            variant="secondary"
            className="bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30"
          >
            À valider
          </Badge>
        );
      case "validated":
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300 border-emerald-400/60">
            Validé
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/15 border-red-400 text-red-300">
            Rejeté
          </Badge>
        );
      case "sap_pending":
        return (
          <Badge variant="secondary" className="bg-sky-500/10 text-sky-300 border-sky-400/60">
            <AlertCircle className="w-3 h-3 mr-1" />
            SAP en cours
          </Badge>
        );
      case "sap_error":
        return (
          <Badge variant="destructive" className="bg-red-500/15 border-red-400 text-red-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Erreur SAP
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="billing-plans-main">
      <Header />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto py-6 px-4 lg:px-8 xl:px-12 space-y-6 max-w-[1600px]">
          {/* Header de page */}
          <PageHeaderKlyxor
            title="Plans de facturation"
            subtitle="Gestion et validation des plans de facturation pour chaque contrat."
            actions={
              <>
                {canExportPlan && (
                  <Button
                    variant="outline"
                    className="kly-btn-outline"
                    onClick={handleExport}
                  >
                    Exporter
                  </Button>
                )}
              </>
            }
          />

          {/* Bandeau règle */}
          <Alert className="border-kly-border-soft bg-kly-surfaceSoft">
            <Info className="h-4 w-4 text-kly-gold" />
            <AlertDescription className="text-kly-text-primary text-sm">
              Un plan passe en <strong>"À valider"</strong> à sa création. Sa
              validation génère les flux de paiement et prépare l’export SAP.
            </AlertDescription>
          </Alert>

          {/* Filtres */}
          <Card className="kly-card">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Statut */}
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="kly-select-trigger">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="to_validate">À valider</SelectItem>
                    <SelectItem value="validated">Validé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                    <SelectItem value="sap_pending">SAP en cours</SelectItem>
                    <SelectItem value="sap_error">Erreur SAP</SelectItem>
                  </SelectContent>
                </Select>

                {/* Période couverte */}
                <Select>
                  <SelectTrigger className="kly-select-trigger">
                    <SelectValue placeholder="Période couverte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>

                {/* Périodicité */}
                <Select>
                  <SelectTrigger className="kly-select-trigger">
                    <SelectValue placeholder="Périodicité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="annual">Annuel</SelectItem>
                  </SelectContent>
                </Select>

                {/* Terme */}
                <Select>
                  <SelectTrigger className="kly-select-trigger">
                    <SelectValue placeholder="Terme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">À échoir</SelectItem>
                    <SelectItem value="arrears">Échu</SelectItem>
                  </SelectContent>
                </Select>

                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kly-text-muted h-4 w-4" />
                  <Input
                    placeholder="Rechercher contrat/plan..."
                    className="pl-10 kly-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions en masse (optionnel) */}
          {statusFilter === "to_validate" && filteredPlans.length > 0 && (
            <div className="flex gap-2">
              <Button className="kly-btn-secondary">
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider la sélection
              </Button>
              <Button
                variant="outline"
                className="kly-btn-danger"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter la sélection
              </Button>
            </div>
          )}

          {/* Tableau des plans */}
          <Card className="kly-table-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-kly-text-primary">
                  <thead className="kly-table-header">
                    <tr>
                      <th className="px-4 py-3 text-left uppercase">
                        Plan ID
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Contrat
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Période
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Périodicité
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Indexation
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        SAP
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Preuves
                      </th>
                      <th className="px-4 py-3 text-left uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="kly-table-row cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-kly-gold">
                          {plan.id}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">
                              {plan.contractId ||
                                plan.contractNumber ||
                                "N/A"}
                            </div>
                            <div className="text-xs text-kly-text-secondary">
                              {plan.contractName ||
                                plan.contractTitle ||
                                "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {plan.contractType || "N/A"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {plan.period?.start
                            ? new Date(
                                plan.period.start
                              ).toLocaleDateString("fr-FR")
                            : "N/A"}{" "}
                          -{" "}
                          {plan.period?.end
                            ? new Date(plan.period.end).toLocaleDateString(
                                "fr-FR"
                              )
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {plan.periodicity || "N/A"}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {(plan.totalAmount || 0).toLocaleString("fr-FR")}{" "}
                          {plan.currency || "EUR"}
                        </td>
                        <td className="px-4 py-3">
                          {plan.indexationFormula && (
                            <Badge variant="secondary">
                              {plan.indexationFormula}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(plan.status || "to_validate")}
                        </td>
                        <td className="px-4 py-3">
                          {plan.sapCode ? (
                            <div className="flex items-center gap-1">
                              <Link className="w-3 h-3 text-sky-400" />
                              <span className="text-xs font-mono">
                                {plan.sapCode}
                              </span>
                            </div>
                          ) : (
                            <span className="text-kly-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {plan.paymentProofCount &&
                          plan.paymentProofCount > 0 ? (
                            <Badge variant="outline">
                              <Receipt className="w-3 h-3 mr-1" />
                              {plan.paymentProofCount}
                            </Badge>
                          ) : (
                            <span className="text-kly-text-muted">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="kly-btn-outline"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            Détails
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredPlans.length === 0 && !plansLoading && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-kly-text-muted mx-auto mb-4" />
                  <p className="text-sm text-kly-text-secondary">
                    Aucun plan trouvé pour ces filtres.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 kly-btn-outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panneau latéral de détail */}
          <Sheet
            open={!!selectedPlan}
            onOpenChange={() => setSelectedPlan(null)}
          >
            <SheetContent className="w-full sm:max-w-xl bg-white text-kly-text-primary border-l border-kly-border">
              {selectedPlan && (
                <>
                  <SheetHeader>
                    <SheetTitle className="text-kly-text-primary">
                      Détail du plan {selectedPlan.id}
                    </SheetTitle>
                    <SheetDescription className="text-kly-text-secondary">
                      Contrat {selectedPlan.contractId} –{" "}
                      {selectedPlan.contractName}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6 text-sm">
                    {/* En-tête */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-kly-text-secondary">
                          Statut
                        </span>
                        {getStatusBadge(selectedPlan.status || "to_validate")}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-kly-text-secondary">
                          Créateur
                        </span>
                        <span className="font-medium">
                          {selectedPlan.creator}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-kly-text-secondary">
                          Créé le
                        </span>
                        <span className="font-medium">
                          {selectedPlan.createdAt}
                        </span>
                      </div>
                    </div>

                    {/* Paramètres du plan */}
                    <Card className="kly-card-soft">
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Paramètres du plan
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-kly-text-secondary">
                            Date début paiement
                          </span>
                          <span className="font-medium">
                            {selectedPlan.period?.start}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-kly-text-secondary">
                            Date fin
                          </span>
                          <span className="font-medium">
                            {selectedPlan.period?.end}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-kly-text-secondary">
                            Périodicité
                          </span>
                          <span className="font-medium">
                            {selectedPlan.periodicity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-kly-text-secondary">
                            Terme
                          </span>
                          <span className="font-medium">
                            {selectedPlan.term}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Aperçu des lignes */}
                    <Card className="kly-card-soft">
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Aperçu des lignes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs text-kly-text-secondary font-medium">
                            <span>Période</span>
                            <span>Date facture</span>
                            <span className="text-right">Montant</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span>Jan 2025</span>
                            <span>01/01/2025</span>
                            <span className="text-right">20 000 EUR</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span>Fév 2025</span>
                            <span>01/02/2025</span>
                            <span className="text-right">20 000 EUR</span>
                          </div>
                          <div className="text-center text-xs text-kly-text-secondary py-2">
                            …
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Impact si validation */}
                    {selectedPlan.status === "to_validate" && (
                      <Alert className="border-kly-border-soft bg-kly-surfaceSoft">
                        <AlertCircle className="h-4 w-4 text-kly-gold" />
                        <AlertDescription className="text-sm text-kly-text-primary">
                          <strong>Impact si validation :</strong> création de{" "}
                          {selectedPlan.flowsToCreate} flux de paiement +
                          export vers ERP.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {selectedPlan.status === "to_validate" && (
                        <>
                          <Button
                            className="flex-1 kly-btn-secondary"
                            onClick={() => setShowSimulation(true)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Voir simulation
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 kly-btn-danger"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rejeter
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>

          {/* Modal de simulation */}
          {showSimulation && selectedPlan && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
              <Card className="w-full max-w-5xl max-h-[90vh] overflow-auto bg-white text-kly-text-primary border border-kly-border">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Simulation des flux générés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-kly-text-primary">
                      <thead className="kly-table-header">
                        <tr>
                          <th className="px-4 py-2 text-left uppercase text-xs">
                            Échéance
                          </th>
                          <th className="px-4 py-2 text-left uppercase text-xs">
                            Montant
                          </th>
                          <th className="px-4 py-2 text-left uppercase text-xs">
                            Devise
                          </th>
                          <th className="px-4 py-2 text-left uppercase text-xs">
                            Réf. facture
                          </th>
                          <th className="px-4 py-2 text-left uppercase text-xs">
                            Statut prévu
                          </th>
                          <th className="px-4 py-2 text-left uppercase text-xs">
                            Destination ERP
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(3)].map((_, i) => (
                          <tr key={i} className="kly-table-row">
                            <td className="px-4 py-2 text-sm">{`01/${String(
                              i + 1
                            ).padStart(2, "0")}/2025`}</td>
                            <td className="px-4 py-2 text-sm font-medium">
                              20 000
                            </td>
                            <td className="px-4 py-2 text-sm">EUR</td>
                            <td className="px-4 py-2 text-sm">-</td>
                            <td className="px-4 py-2 text-sm">
                              <Badge variant="outline">Généré</Badge>
                            </td>
                            <td className="px-4 py-2 text-sm">SAP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Alert className="mt-4 border-sky-400/60 bg-sky-500/10">
                    <Info className="h-4 w-4 text-sky-300" />
                    <AlertDescription className="text-sm text-kly-text-primary">
                      La validation du plan créera les flux correspondants et
                      préparera l&apos;export ERP.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2 mt-6">
                    <Button className="flex-1 kly-btn-primary">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider et créer les flux
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 kly-btn-outline"
                      onClick={() => setShowSimulation(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
