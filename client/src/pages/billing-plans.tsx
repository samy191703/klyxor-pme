import { useState } from "react";
import SidebarWithSubmenu from "@/components/layout/sidebar-with-submenu";
import MobileNavWithSubmenu from "@/components/layout/mobile-nav-with-submenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search,
  Calendar,
  Euro,
  Clock,
  TrendingUp,
  FileCheck,
  Info,
  Database,
  Send,
  CreditCard,
  DollarSign,
  Receipt,
  AlertTriangle,
  Building2,
  Link,
  TrendingDown,
  Upload
} from "lucide-react";

interface BillingPlan {
  id: string;
  contractId: string;
  contractName: string;
  contractType: string;
  period: { start: string; end: string };
  periodicity: string;
  term: string;
  linesCount: number;
  totalAmount: number;
  currency: string;
  status: "to_validate" | "validated" | "rejected" | "sap_pending" | "sap_error";
  lastAction: string;
  flowsToCreate: number;
  creator: string;
  createdAt: string;
  indexationFormula?: string;
  sapStatus?: string;
  sapCode?: string;
  paymentProofCount?: number;
  businessUnit?: string;
}

export default function BillingPlans() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [statusFilter, setStatusFilter] = useState("to_validate");
  const [searchQuery, setSearchQuery] = useState("");

  // Données exemple enrichies
  const plans: BillingPlan[] = [
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
      businessUnit: "ENGIE Solutions France"
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
      businessUnit: "ENGIE Green"
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
      businessUnit: "ENGIE Global Energy Management"
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
      businessUnit: "ENGIE Solutions France"
    }
  ];

  const filteredPlans = plans.filter(plan => {
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    const matchesSearch = plan.contractName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plan.contractId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "to_validate":
        return <Badge variant="secondary" className="bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30">À valider</Badge>;
      case "validated":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Validé</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>;
      case "sap_pending":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Database className="w-3 h-3 mr-1" />
          SAP en cours
        </Badge>;
      case "sap_error":
        return <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Erreur SAP
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SidebarWithSubmenu />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <MobileNavWithSubmenu />
          <img 
            src="/klyxor-logo.jpeg" 
            alt="KLYXOR Logo"
            className="w-10 h-10 object-contain rounded-lg shadow"
          />
        </div>
        
        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto py-6 px-4 lg:px-8 xl:px-12 space-y-6 max-w-[1600px]">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#0F2A43]">Plans de facturation</h1>
          <p className="text-gray-600 mt-2">Gestion et validation des plans de facturation</p>
        </div>
      </div>

      {/* Bandeau règle */}
      <Alert className="border-[#C9A646]/30 bg-[#C9A646]/5">
        <Info className="h-4 w-4 text-[#C9A646]" />
        <AlertDescription className="text-[#0F2A43]">
          Un plan passe en "à valider" à sa création. Sa validation génère les flux de paiement.
        </AlertDescription>
      </Alert>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Période couverte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Périodicité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="quarterly">Trimestriel</SelectItem>
                <SelectItem value="annual">Annuel</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Terme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advance">À échoir</SelectItem>
                <SelectItem value="arrears">Échu</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Rechercher contrat/plan..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions en masse */}
      {statusFilter === "to_validate" && filteredPlans.length > 0 && (
        <div className="flex gap-2">
          <Button className="bg-[#0F2A43] hover:bg-[#0F2A43]/90">
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider la sélection
          </Button>
          <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
            <XCircle className="w-4 h-4 mr-2" />
            Rejeter la sélection
          </Button>
        </div>
      )}

      {/* Tableau des plans */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Périodicité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indexation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SAP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preuves</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium text-[#0F2A43]">{plan.id}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{plan.contractId}</div>
                        <div className="text-gray-500 text-xs">{plan.contractName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline">{plan.contractType}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(plan.period.start).toLocaleDateString('fr-FR')} - {new Date(plan.period.end).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm">{plan.periodicity}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {plan.totalAmount.toLocaleString('fr-FR')} {plan.currency}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {plan.indexationFormula && (
                        <Badge variant="secondary">{plan.indexationFormula}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(plan.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      {plan.sapCode ? (
                        <div className="flex items-center gap-1">
                          <Link className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-mono">{plan.sapCode}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {plan.paymentProofCount && plan.paymentProofCount > 0 ? (
                        <Badge variant="outline" className="bg-green-50">
                          <Receipt className="w-3 h-3 mr-1" />
                          {plan.paymentProofCount}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button 
                        variant="ghost" 
                        size="sm"
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

          {filteredPlans.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun plan à valider pour ces filtres.</p>
              <Button variant="outline" className="mt-4">
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panneau latéral de détail */}
      <Sheet open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {selectedPlan && (
            <>
              <SheetHeader>
                <SheetTitle>Détail du plan {selectedPlan.id}</SheetTitle>
                <SheetDescription>
                  Contrat {selectedPlan.contractId} - {selectedPlan.contractName}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* En-tête */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Statut</span>
                    {getStatusBadge(selectedPlan.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Créateur</span>
                    <span className="text-sm">{selectedPlan.creator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Créé le</span>
                    <span className="text-sm">{selectedPlan.createdAt}</span>
                  </div>
                </div>

                {/* Paramètres du plan */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Paramètres du plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Date début paiement</span>
                      <span className="text-sm font-medium">{selectedPlan.period.start}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Date fin</span>
                      <span className="text-sm font-medium">{selectedPlan.period.end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Périodicité</span>
                      <span className="text-sm font-medium">{selectedPlan.periodicity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Terme</span>
                      <span className="text-sm font-medium">{selectedPlan.term}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Aperçu des lignes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Aperçu des lignes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-sm text-gray-500 font-medium">
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
                      <div className="text-center text-sm text-gray-500 py-2">...</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Impact si validation */}
                {selectedPlan.status === "to_validate" && (
                  <Alert className="border-[#C9A646]/30 bg-[#C9A646]/5">
                    <AlertCircle className="h-4 w-4 text-[#C9A646]" />
                    <AlertDescription>
                      <strong>Impact si validation :</strong> Création de {selectedPlan.flowsToCreate} flux de paiement + export vers ERP.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedPlan.status === "to_validate" && (
                    <>
                      <Button 
                        className="flex-1 bg-[#0F2A43] hover:bg-[#0F2A43]/90"
                        onClick={() => setShowSimulation(true)}
                      >
                        <FileCheck className="w-4 h-4 mr-2" />
                        Voir simulation
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
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
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Simulation des flux générés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Échéance</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Réf. facture</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut prévu</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination ERP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...Array(3)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm">{`01/${String(i + 1).padStart(2, '0')}/2025`}</td>
                        <td className="px-4 py-2 text-sm font-medium">20 000</td>
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
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  La validation du plan créera les flux correspondants et préparera l'export ERP.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 mt-6">
                <Button className="flex-1 bg-[#0F2A43] hover:bg-[#0F2A43]/90">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider et créer les flux
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
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
  </div>
  );
}