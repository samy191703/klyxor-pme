import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Calendar,
  FileText,
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminLayout } from "./AdminLayout";

interface BillingPlan {
  id: string;
  contractNumber: string;
  contractTitle: string;
  contractType: string;
  amount: number;
  periodicity: string;
  paymentTerm: string;
  status: string;
  nextDueDate: Date;
}

interface PaymentFlow {
  id: string;
  contractNumber: string;
  dueDate: Date;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed" | "blocked";
  sapExportStatus?: string;
  blockageReason?: string;
}

interface PaymentProof {
  id: string;
  contractNumber: string;
  period: string;
  generatedDate: Date;
  status: "generated" | "sent" | "error";
  channel?: string;
}

export function AdminBilling() {
  const [activeTab, setActiveTab] = useState("plans");
  const [filters, setFilters] = useState({
    type: "",
    periodicity: "",
    term: "",
    period: "",
    search: ""
  });

  const { data: billingPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/admin/billing/plans", filters]
  });

  const { data: paymentFlows, isLoading: flowsLoading } = useQuery({
    queryKey: ["/api/admin/billing/flows"]
  });

  const { data: paymentProofs } = useQuery({
    queryKey: ["/api/admin/billing/proofs"]
  });

  const resetFilters = () => {
    setFilters({
      type: "",
      periodicity: "",
      term: "",
      period: "",
      search: ""
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Actif</Badge>;
      case "pending":
        return <Badge variant="warning">En attente</Badge>;
      case "blocked":
        return <Badge variant="destructive">Bloqué</Badge>;
      case "completed":
        return <Badge variant="success">Complété</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de la facturation</h1>
          <p className="text-gray-600 mt-1">Plans de facturation, flux de paiement et preuves</p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Information importante</AlertTitle>
          <AlertDescription>
            Les plans de facturation sont générés automatiquement à la validation du contrat. 
            Ils peuvent être récupérés depuis un système externe et s'actualisent selon les indexations.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans">Plans de facturation</TabsTrigger>
            <TabsTrigger value="flows">Flux de paiement</TabsTrigger>
            <TabsTrigger value="proofs">Preuves de paiement</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Plans de facturation */}
          <TabsContent value="plans" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Type de contrat</Label>
                    <Select 
                      value={filters.type}
                      onValueChange={(value) => setFilters({...filters, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="OMSA">OMSA</SelectItem>
                        <SelectItem value="LTSA">LTSA</SelectItem>
                        <SelectItem value="OMGC">OMGC</SelectItem>
                        <SelectItem value="Bail">Bail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Périodicité</Label>
                    <Select 
                      value={filters.periodicity}
                      onValueChange={(value) => setFilters({...filters, periodicity: value})}
                    >
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
                    <Select 
                      value={filters.term}
                      onValueChange={(value) => setFilters({...filters, term: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="avance">À avance</SelectItem>
                        <SelectItem value="echu">À échoir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Période</Label>
                    <Input 
                      type="month"
                      value={filters.period}
                      onChange={(e) => setFilters({...filters, period: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={resetFilters}>
                    Réinitialiser
                  </Button>
                  <Button>
                    Enregistrer les filtres
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Plans Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant périodique</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead>Terme</TableHead>
                      <TableHead>Prochaine échéance</TableHead>
                      <TableHead>Statut plan</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingPlans?.map((plan: BillingPlan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.contractNumber}</p>
                            <p className="text-sm text-gray-500">{plan.contractTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{plan.contractType}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {plan.amount.toLocaleString("fr-FR")} €
                        </TableCell>
                        <TableCell>{plan.periodicity}</TableCell>
                        <TableCell>{plan.paymentTerm === "avance" ? "Avance" : "Échu"}</TableCell>
                        <TableCell>
                          {new Date(plan.nextDueDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          {plan.status === "external" ? (
                            <Badge variant="secondary">Récupéré externe</Badge>
                          ) : (
                            getStatusBadge(plan.status)
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Voir détail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {plansLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Chargement des plans de facturation...
                  </div>
                )}
                {!plansLoading && (!billingPlans || billingPlans.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun plan de facturation trouvé
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flux de paiement */}
          <TabsContent value="flows" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Flux de paiement et exports ERP/SAP</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Date d'échéance</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut paiement</TableHead>
                      <TableHead>Export SAP</TableHead>
                      <TableHead>Blocage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentFlows?.map((flow: PaymentFlow) => (
                      <TableRow key={flow.id}>
                        <TableCell className="font-medium">
                          {flow.contractNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(flow.dueDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          {flow.amount.toLocaleString("fr-FR")} €
                        </TableCell>
                        <TableCell>
                          {flow.status === "completed" ? (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complété
                            </Badge>
                          ) : flow.status === "blocked" ? (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Bloqué
                            </Badge>
                          ) : flow.status === "processing" ? (
                            <Badge variant="warning">
                              <Clock className="h-3 w-3 mr-1" />
                              En cours
                            </Badge>
                          ) : (
                            <Badge variant="secondary">En attente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {flow.sapExportStatus === "success" ? (
                            <Badge variant="success">Exporté</Badge>
                          ) : flow.sapExportStatus === "error" ? (
                            <Badge variant="destructive">Erreur</Badge>
                          ) : (
                            <Badge variant="secondary">Non exporté</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {flow.blockageReason && (
                            <span className="text-sm text-red-600">
                              {flow.blockageReason}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Détails
                            </Button>
                            {flow.status === "blocked" && (
                              <Button size="sm" variant="default">
                                Débloquer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {flowsLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Chargement des flux de paiement...
                  </div>
                )}
                {!flowsLoading && (!paymentFlows || paymentFlows.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun flux de paiement en cours
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Paiements en attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-sm text-gray-500">Montant: 458 000 €</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Paiements bloqués
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">3</div>
                  <p className="text-sm text-gray-500">Montant: 125 000 €</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Erreurs SAP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">5</div>
                  <p className="text-sm text-gray-500">À traiter</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preuves de paiement */}
          <TabsContent value="proofs" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Module de preuves de paiement</AlertTitle>
              <AlertDescription>
                Ce module affiche les preuves de paiement générées et relivrées. 
                Les canaux d'envoi sont gérés par le système tiers si implémenté.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Journal des preuves de paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Date génération</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Canal d'envoi</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentProofs?.map((proof: PaymentProof) => (
                      <TableRow key={proof.id}>
                        <TableCell className="font-medium">
                          {proof.contractNumber}
                        </TableCell>
                        <TableCell>{proof.period}</TableCell>
                        <TableCell>
                          {new Date(proof.generatedDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          {proof.status === "generated" ? (
                            <Badge variant="success">Générée</Badge>
                          ) : proof.status === "sent" ? (
                            <Badge variant="success">Envoyée</Badge>
                          ) : (
                            <Badge variant="destructive">Erreur</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {proof.channel || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Télécharger
                            </Button>
                            <Button size="sm" variant="outline">
                              Renvoyer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {!paymentProofs || paymentProofs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucune preuve de paiement disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paramètres */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de facturation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Délai de génération des factures (jours avant échéance)</Label>
                  <Input type="number" defaultValue="30" className="w-32 mt-2" />
                </div>
                
                <div>
                  <Label>Format d'export par défaut</Label>
                  <Select defaultValue="pdf">
                    <SelectTrigger className="w-48 mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xml">XML (SAP)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Email de notification des erreurs</Label>
                  <Input type="email" defaultValue="facturation@klyxor.com" className="mt-2" />
                </div>
                
                <Button>Enregistrer les paramètres</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuration par type de contrat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>BAUX:</strong> Toutes les vues disponibles<br />
                      <strong>LTSA/OMGC/OMSA:</strong> Toutes les vues sauf preuves de paiement
                    </AlertDescription>
                  </Alert>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de contrat</TableHead>
                        <TableHead>Plans facturation</TableHead>
                        <TableHead>Flux paiement</TableHead>
                        <TableHead>Preuves paiement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">BAUX</TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">LTSA</TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><X className="h-4 w-4 text-gray-400" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">OMGC</TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><X className="h-4 w-4 text-gray-400" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">OMSA</TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><CheckCircle className="h-4 w-4 text-green-600" /></TableCell>
                        <TableCell><X className="h-4 w-4 text-gray-400" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}