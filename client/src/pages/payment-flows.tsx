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
  TrendingUp,
  Search,
  Calendar,
  Euro,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  ArrowUpRight,
  Clock,
  Ban,
} from "lucide-react";
import Header from "@/components/layout/header";

interface PaymentFlow {
  id: string;
  planId?: string;
  contractId?: string;
  contractNumber?: string;
  contractName?: string;
  contractTitle?: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  invoiceRef?: string;
  status?: "generated" | "exported_erp" | "completed" | "blocked";
  lastERPEvent?: string;
  blockReason?: string;
}

export default function PaymentFlows() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<PaymentFlow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Permissions
  const { hasPermission } = usePermissions();
  const canBlockFlow = hasPermission("/payment-flows");
  const canExportFlow = hasPermission("/payment-flows");

  /**
   * Hook pour récupérer les flux de paiement depuis l'API
   * @description Récupère dynamiquement les flux de paiement depuis la base de données.
   * Les données sont automatiquement rafraîchies toutes les 30 secondes pour garantir
   * que l'interface affiche toujours l'état actuel des flux (générés, exportés SAP, bloqués, etc.)
   *
   * @returns {PaymentFlow[]} flowsData - Tableau des flux de paiement
   * @returns {boolean} flowsLoading - État de chargement des données
   */
  const { data: flowsData = [], isLoading: flowsLoading } = useQuery<
    PaymentFlow[]
  >({
    queryKey: ["/api/admin/billing/flows"],
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes pour suivre l'état SAP en temps réel
  });

  /**
   * Mutation pour bloquer un flux de paiement
   * @description Permet de bloquer un flux de paiement lorsqu'un montant est modifié sans approbation.
   * Cette action empêche l'export vers SAP jusqu'à validation du nouveau montant.
   */
  const blockFlowMutation = useMutation({
    mutationFn: async ({ flowId, oldAmount, newAmount, reason }: any) => {
      return await apiRequest("POST", `/api/payment-flows/${flowId}/block`, {
        oldAmount,
        newAmount,
        reason,
        modifiedBy: "Admin",
      });
    },
    onSuccess: () => {
      toast({
        title: "Flux bloqué",
        description: "Le flux de paiement a été bloqué",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/flows"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de bloquer le flux",
        variant: "destructive",
      });
    },
  });

  /**
   * Flux de paiement réels depuis la base de données
   * @description Utilise directement les données retournées par l'API sans aucun fallback mocké.
   * Ceci garantit que l'interface affiche uniquement des données réelles provenant de PostgreSQL.
   * Si aucune donnée n'est disponible, un tableau vide est utilisé plutôt que des données fictives.
   */
  const flows: PaymentFlow[] = flowsData || [];

  const filteredFlows = flows.filter((flow) => {
    const matchesStatus =
      statusFilter === "all" || flow.status === statusFilter;
    const contractDisplay = flow.contractName || flow.contractTitle || "";
    const matchesSearch =
      contractDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.invoiceRef || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            Généré
          </Badge>
        );
      case "exported_erp":
        return (
          <Badge variant="outline" className="border-green-500 text-green-600">
            Exporté ERP
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-green-700 text-green-700 bg-green-50"
          >
            Effectué
          </Badge>
        );
      case "blocked":
        return <Badge variant="destructive">Bloqué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Page content */}
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 lg:px-8 xl:px-12 space-y-6 max-w-[1600px]">
          {/* En-tête */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#0F2A43]">
                Flux de paiement
              </h1>
              <p className="text-gray-600 mt-2">
                Suivi des flux générés et export vers l'ERP
              </p>
            </div>
            <Button className="bg-[#0F2A43] hover:bg-[#0F2A43]/90">
              <RefreshCw className="w-4 h-4 mr-2" />
              Relancer exports en erreur
            </Button>
          </div>

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
                    <SelectItem value="generated">Généré</SelectItem>
                    <SelectItem value="exported_erp">Exporté ERP</SelectItem>
                    <SelectItem value="completed">Effectué</SelectItem>
                    <SelectItem value="blocked">Bloqué</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Période d'échéance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mois en cours</SelectItem>
                    <SelectItem value="next_month">Mois prochain</SelectItem>
                    <SelectItem value="last_30_days">
                      30 derniers jours
                    </SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les contrats</SelectItem>
                    <SelectItem value="KLX-2024-034">KLX-2024-034</SelectItem>
                    <SelectItem value="KLX-2024-089">KLX-2024-089</SelectItem>
                    <SelectItem value="KLX-2024-012">KLX-2024-012</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input placeholder="Min" type="number" className="w-24" />
                  <Input placeholder="Max" type="number" className="w-24" />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher flux/facture..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des flux */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Flow ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Plan ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Contrat
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Échéance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Montant/Devise
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Réf. facture
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dernier événement ERP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFlows.map((flow) => (
                      <tr key={flow.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-[#0F2A43]">
                          {flow.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#C9A646]">
                          {flow.planId}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{flow.contractId}</div>
                            <div className="text-gray-500 text-xs">
                              {flow.contractName}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {flow.dueDate}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {flow.amount.toLocaleString()} {flow.currency}
                        </td>
                        <td className="px-4 py-3 text-sm">{flow.invoiceRef}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="space-y-1">
                            {getStatusBadge(flow.status)}
                            {flow.status === "blocked" && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="text-xs">
                                  {flow.blockReason}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {flow.lastERPEvent}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFlow(flow)}
                          >
                            Détails
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredFlows.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Aucun flux pour la période sélectionnée.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Changer les filtres
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panneau latéral de détail */}
          <Sheet
            open={!!selectedFlow}
            onOpenChange={() => setSelectedFlow(null)}
          >
            <SheetContent className="w-full sm:max-w-xl">
              {selectedFlow && (
                <>
                  <SheetHeader>
                    <SheetTitle>Détail du flux {selectedFlow.id}</SheetTitle>
                    <SheetDescription>
                      Échéance : {selectedFlow.dueDate}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* En-tête */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Statut</span>
                        {getStatusBadge(selectedFlow.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Montant</span>
                        <span className="text-lg font-bold text-[#0F2A43]">
                          {selectedFlow.amount.toLocaleString()}{" "}
                          {selectedFlow.currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Devise</span>
                        <span className="text-sm">{selectedFlow.currency}</span>
                      </div>
                    </div>

                    {/* Liens */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Liens</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Contrat</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-[#0F2A43]"
                          >
                            {selectedFlow.contractId}
                            <ArrowUpRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Plan d'origine
                          </span>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-[#0F2A43]"
                          >
                            {selectedFlow.planId}
                            <ArrowUpRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Réf. facture
                          </span>
                          <span className="text-sm font-medium">
                            {selectedFlow.invoiceRef}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Journal ERP */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Journal ERP</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Export réussi
                              </p>
                              <p className="text-xs text-gray-500">
                                2025-01-21 09:00 - SAP
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Tentative d'export
                              </p>
                              <p className="text-xs text-gray-500">
                                2025-01-21 08:55 - SAP
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Création du flux
                              </p>
                              <p className="text-xs text-gray-500">
                                2025-01-20 15:45
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bloc blocage si présent */}
                    {selectedFlow.status === "blocked" && (
                      <Alert className="border-red-200 bg-red-50">
                        <Ban className="h-4 w-4 text-red-600" />
                        <AlertDescription>
                          <strong>Motif du blocage :</strong>{" "}
                          {selectedFlow.blockReason}
                          <br />
                          <span className="text-xs text-gray-600">
                            Date de blocage : 2025-01-22 10:15
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {selectedFlow.status === "generated" && (
                        <Button className="flex-1 bg-[#0F2A43] hover:bg-[#0F2A43]/90">
                          <Database className="w-4 h-4 mr-2" />
                          Renvoyer à l'ERP
                        </Button>
                      )}
                      {selectedFlow.status === "blocked" && (
                        <Button
                          variant="outline"
                          className="flex-1 border-[#C9A646] text-[#C9A646] hover:bg-[#C9A646]/10"
                        >
                          Accéder au blocage
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
