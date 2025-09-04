import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  CreditCard, FileText, DollarSign, AlertCircle, 
  CheckCircle, XCircle, Clock, Search, Filter,
  Save, X, Download, Eye, Send, FileCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminBilling() {
  const [activeView, setActiveView] = useState("plans");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [periodicityFilter, setPeriodicityFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const { toast } = useToast();

  const submenuItems = [
    { label: "Plans de facturation", value: "plans", active: activeView === "plans" },
    { label: "Flux de paiement", value: "flows", active: activeView === "flows" },
    { label: "Preuves de paiement", value: "proofs", active: activeView === "proofs" },
    { label: "Paramètres", value: "settings", active: activeView === "settings" }
  ];

  /**
   * Hook pour récupérer les plans de facturation depuis l'API
   * @description Récupère dynamiquement les plans de facturation depuis la base PostgreSQL.
   * Ces plans définissent la périodicité et les montants de facturation pour chaque contrat.
   * 
   * @returns {Array} billingPlans - Plans de facturation avec périodicité, montants et échéances
   * @returns {boolean} plansLoading - Indicateur de chargement
   * 
   * @note Remplace l'ancien tableau statique par des données réelles de la base
   */
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/billing/plans"],
    refetchInterval: 30000, // Mise à jour automatique pour refléter les modifications
  });

  /**
   * Hook pour récupérer les flux de paiement depuis l'API
   * @description Récupère les flux de paiement avec leurs statuts SAP et blocages éventuels.
   * Permet le suivi en temps réel de l'intégration avec les systèmes ERP.
   * 
   * @returns {Array} paymentFlows - Flux de paiement avec statuts d'export SAP
   * @returns {boolean} flowsLoading - État de chargement
   * 
   * @note Les données proviennent directement de PostgreSQL, garantissant la synchronisation ERP
   */
  const { data: paymentFlows = [], isLoading: flowsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/billing/flows"],
    refetchInterval: 30000, // Suivi en temps réel des exports SAP
  });

  /**
   * Hook pour récupérer les preuves de paiement depuis l'API
   * @description Récupère les preuves de paiement générées et leur statut d'envoi.
   * Ces preuves sont essentielles pour la traçabilité comptable et la conformité.
   * 
   * @returns {Array} paymentProofs - Preuves avec type de paiement, canal d'envoi et statut
   * @returns {boolean} proofsLoading - Indicateur de chargement
   * 
   * @note Données 100% réelles depuis PostgreSQL, aucune donnée simulée
   */
  const { data: paymentProofs = [], isLoading: proofsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/billing/proofs"],
    refetchInterval: 30000, // Vérification régulière des nouvelles preuves
  });

  return (
    <AdminLayout 
      title="Facturation (Admin)"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {activeView === "plans" && (
          <>
            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="OMSA">OMSA</SelectItem>
                        <SelectItem value="LTSA">LTSA</SelectItem>
                        <SelectItem value="OMGC">OMGC</SelectItem>
                        <SelectItem value="Bail">Bail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Périodicité</Label>
                    <Select value={periodicityFilter} onValueChange={setPeriodicityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="mensuelle">Mensuelle</SelectItem>
                        <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                        <SelectItem value="semestrielle">Semestrielle</SelectItem>
                        <SelectItem value="annuelle">Annuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Terme</Label>
                    <Select value={termFilter} onValueChange={setTermFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="avance">Avance</SelectItem>
                        <SelectItem value="echu">Échu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Période</Label>
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="current_month">Mois en cours</SelectItem>
                        <SelectItem value="next_month">Mois prochain</SelectItem>
                        <SelectItem value="current_quarter">Trimestre en cours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Recherche</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setTypeFilter("");
                    setPeriodicityFilter("");
                    setTermFilter("");
                    setPeriodFilter("");
                    setSearchTerm("");
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                  <Button size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les filtres
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Plans de facturation */}
            <Card>
              <CardHeader>
                <CardTitle>Plans de facturation</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Les plans de facturation sont générés automatiquement à la validation du contrat. 
                    Les plans non validés sont récupérés depuis un système externe.
                  </AlertDescription>
                </Alert>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Montant périodique</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead>Terme</TableHead>
                      <TableHead>Statut plan</TableHead>
                      <TableHead>Prochaine échéance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>{plan.contract}</TableCell>
                        <TableCell className="font-medium">{plan.periodicAmount.toLocaleString()} €</TableCell>
                        <TableCell>{plan.periodicity}</TableCell>
                        <TableCell>{plan.term}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.status === "Validé" ? "default" : "secondary"}>
                              {plan.status}
                            </Badge>
                            {plan.source === "Récupéré automatiquement" && (
                              <Badge variant="outline" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{plan.nextDue}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {activeView === "flows" && (
          <Card>
            <CardHeader>
              <CardTitle>Flux de paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Export ERP/SAP</TableHead>
                    <TableHead>Blocage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentFlows.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell>{flow.contract}</TableCell>
                      <TableCell>{flow.dueDate}</TableCell>
                      <TableCell className="font-medium">{flow.amount.toLocaleString()} €</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            flow.status === "sent" ? "default" :
                            flow.status === "blocked" ? "destructive" :
                            "secondary"
                          }
                        >
                          {flow.status === "sent" ? "Envoyé" :
                           flow.status === "blocked" ? "Bloqué" :
                           "En attente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={flow.erpStatus === "exported" ? "default" : "outline"}>
                          {flow.erpStatus === "exported" ? "Exporté" :
                           flow.erpStatus === "ready" ? "Prêt" :
                           "En attente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {flow.blockReason && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{flow.blockReason}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {flow.status === "blocked" && (
                            <Button size="sm" variant="outline">
                              Débloquer
                            </Button>
                          )}
                          {flow.status === "pending" && (
                            <Button size="sm" variant="outline">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === "proofs" && (
          <Card>
            <CardHeader>
              <CardTitle>Preuves de paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Journal des preuves de paiement générées et envoyées. 
                  Les canaux d'envoi peuvent être configurés dans un système tiers.
                </AlertDescription>
              </Alert>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Type de preuve</TableHead>
                    <TableHead>Canal d'envoi</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentProofs.map((proof) => (
                    <TableRow key={proof.id}>
                      <TableCell>{proof.contract}</TableCell>
                      <TableCell>{proof.date}</TableCell>
                      <TableCell className="font-medium">{proof.amount.toLocaleString()} €</TableCell>
                      <TableCell>{proof.proofType}</TableCell>
                      <TableCell>{proof.channel}</TableCell>
                      <TableCell>
                        <Badge variant={proof.status === "sent" ? "default" : "secondary"}>
                          {proof.status === "sent" ? "Envoyé" : "Généré"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de facturation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Configuration par type de contrat</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Baux</h4>
                      <p className="text-sm text-muted-foreground">
                        Vues disponibles : Plans de facturation, Flux de paiement, Preuves de paiement, Paramètres
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">LTSA / OMGC / OMSA</h4>
                      <p className="text-sm text-muted-foreground">
                        Vues disponibles : Plans de facturation, Flux de paiement, Paramètres
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        (Preuves de paiement non disponibles)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Paramètres généraux</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Génération automatique des plans</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Les plans de facturation sont générés automatiquement à la validation du contrat
                      </p>
                      <Badge variant="default">Activé</Badge>
                    </div>
                    <div>
                      <Label>Intégration SAP/ERP</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Export automatique vers le système ERP
                      </p>
                      <Badge variant="default">Configuré</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}