import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Calendar,
  DollarSign,
  Activity,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import type { Contract, Indexation } from "@shared/schema";

export default function IndexationDashboard() {
  const { toast } = useToast();
  const { canValidateIndexation, canManageIndexation, canConfigureIndexation, canViewIndexation } = usePermissions();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Récupération des contrats
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Récupération des indexations existantes
  const { data: indexations = [], isLoading: indexationsLoading } = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  // Mutation pour créer une nouvelle indexation - DOIT ÊTRE AVANT LE RETURN CONDITIONNEL
  const createIndexation = useMutation({
    mutationFn: async (contractId: string) => {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) throw new Error("Contrat non trouvé");

      const newIndexation = {
        contractId,
        indexationDate: new Date().toISOString(),
        previousValue: Number(contract.amount) || 0,
        newValue: Number((contract.amount || 0) * 1.02), // Augmentation de 2% par défaut
        variationPercent: 2,
        status: "pending" as const,
        formulaCode: contract.indexationFormula || "ICHT",
        isAutomatic: false,
      };

      const response = await apiRequest("POST", "/api/indexations", newIndexation);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Indexation créée",
        description: "La proposition d'indexation a été créée avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/indexations"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'indexation",
        variant: "destructive",
      });
    },
  });

  // Mutation pour valider une indexation
  const validateIndexation = useMutation({
    mutationFn: async (indexationId: string) => {
      const response = await apiRequest("PATCH", `/api/indexations/${indexationId}`, {
        status: "validated",
        appliedDate: new Date().toISOString(),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Indexation validée",
        description: "L'indexation a été appliquée au contrat",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/indexations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de valider l'indexation",
        variant: "destructive",
      });
    },
  });

  const loading = contractsLoading || indexationsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Vérifier si l'utilisateur peut voir la page APRÈS tous les hooks
  if (!canViewIndexation()) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Filtrer les contrats avec formule d'indexation
  const contractsWithIndexation = contracts.filter(c => 
    c.indexationFormulaId || c.indexationFormula
  );

  // Calculer les statistiques
  const stats = {
    totalContracts: contractsWithIndexation.length,
    indexationsThisMonth: indexations.filter(i => {
      const date = new Date(i.indexationDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    nextIndexations: contractsWithIndexation.filter(c => {
      if (!c.nextIndexationDate) return false;
      const nextDate = new Date(c.nextIndexationDate);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return nextDate <= thirtyDays;
    }).length,
    averageVariation: indexations.length > 0 
      ? (indexations.reduce((sum, i) => sum + (i.variationPercent || 0), 0) / indexations.length).toFixed(2)
      : "0"
  };

  // Grouper les indexations par statut
  const pendingIndexations = indexations.filter(i => i.status === "pending");
  const validatedIndexations = indexations.filter(i => i.status === "validated");
  const rejectedIndexations = indexations.filter(i => i.status === "rejected");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Indexations</h1>
          <p className="text-muted-foreground">Gérez les indexations tarifaires de vos contrats</p>
        </div>
        <div className="flex gap-2">
          {canConfigureIndexation() && (
            <Link href="/indexation-config">
              <Button variant="outline">
                Configuration avancée
              </Button>
            </Link>
          )}
          <Link href="/indexations">
            <Button variant="outline">
              Module autonome
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contrats indexables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContracts}</div>
            <p className="text-xs text-muted-foreground">Avec formules configurées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Indexations ce mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.indexationsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Appliquées en {format(new Date(), "MMMM", { locale: fr })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>À venir (30j)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.nextIndexations}</div>
            <p className="text-xs text-muted-foreground">Indexations prévues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variation moyenne</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {stats.averageVariation}%
              </div>
              {Number(stats.averageVariation) > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : Number(stats.averageVariation) < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">Sur toutes les indexations</p>
          </CardContent>
        </Card>
      </div>

      {/* Contrats nécessitant une indexation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Contrats à indexer prochainement
          </CardTitle>
          <CardDescription>Contrats avec date d'indexation dans les 30 prochains jours</CardDescription>
        </CardHeader>
        <CardContent>
          {contractsWithIndexation.filter(c => {
            if (!c.nextIndexationDate) return false;
            const nextDate = new Date(c.nextIndexationDate);
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            return nextDate <= thirtyDays;
          }).length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun contrat n'a d'indexation prévue dans les 30 prochains jours.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {contractsWithIndexation.filter(c => {
                if (!c.nextIndexationDate) return false;
                const nextDate = new Date(c.nextIndexationDate);
                const thirtyDays = new Date();
                thirtyDays.setDate(thirtyDays.getDate() + 30);
                return nextDate <= thirtyDays;
              }).slice(0, 5).map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contract.title}</span>
                      <Badge variant="outline">{contract.number}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {contract.parkCode && <span>{contract.parkCode} • </span>}
                      Montant: {contract.amount}€ • 
                      Formule: {contract.indexationFormula || "Non définie"}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Prochaine indexation</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.nextIndexationDate && 
                          format(new Date(contract.nextIndexationDate), "dd/MM/yyyy", { locale: fr })}
                      </p>
                    </div>
                    {canManageIndexation() && (
                      <Button
                        size="sm"
                        onClick={() => createIndexation.mutate(contract.id)}
                        disabled={createIndexation.isPending}
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        Indexer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs pour les différentes vues */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({pendingIndexations.length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            Validées ({validatedIndexations.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejetées ({rejectedIndexations.length})
          </TabsTrigger>
        </TabsList>

        {/* Indexations en attente */}
        <TabsContent value="pending" className="space-y-4">
          {pendingIndexations.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aucune indexation en attente</AlertTitle>
              <AlertDescription>
                Toutes les indexations ont été traitées. Créez de nouvelles propositions depuis la liste des contrats.
              </AlertDescription>
            </Alert>
          ) : (
            pendingIndexations.map((indexation) => {
              const contract = contracts.find(c => c.id === indexation.contractId);
              return (
                <Card key={indexation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {contract?.title || "Contrat inconnu"}
                        </CardTitle>
                        <CardDescription>
                          {contract?.number} • Formule: {indexation.formulaCode}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">En attente</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Montant actuel</p>
                        <p className="font-medium">{indexation.previousValue}€</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nouveau montant</p>
                        <p className="font-medium">{indexation.newValue}€</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Variation</p>
                        <p className={cn(
                          "font-medium",
                          indexation.variationPercent > 0 ? "text-green-600" : indexation.variationPercent < 0 ? "text-red-600" : ""
                        )}>
                          {indexation.variationPercent > 0 ? "+" : ""}{indexation.variationPercent}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date d'indexation</p>
                        <p className="font-medium">
                          {format(new Date(indexation.indexationDate), "dd/MM/yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {canValidateIndexation() && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Rejeter l'indexation
                            apiRequest("PATCH", `/api/indexations/${indexation.id}`, {
                              status: "rejected",
                              appliedDate: null,
                            }).then(async (response) => {
                              await response.json();
                              toast({
                                title: "Indexation rejetée",
                                description: "L'indexation a été rejetée",
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/indexations"] });
                            });
                          }}
                        >
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => validateIndexation.mutate(indexation.id)}
                          disabled={validateIndexation.isPending}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Valider
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Indexations validées */}
        <TabsContent value="validated" className="space-y-4">
          {validatedIndexations.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Aucune indexation validée</AlertTitle>
              <AlertDescription>
                Les indexations validées apparaîtront ici.
              </AlertDescription>
            </Alert>
          ) : (
            validatedIndexations.slice(0, 10).map((indexation) => {
              const contract = contracts.find(c => c.id === indexation.contractId);
              return (
                <Card key={indexation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {contract?.title || "Contrat inconnu"}
                        </CardTitle>
                        <CardDescription>
                          {contract?.number} • Appliquée le {indexation.appliedDate && 
                            format(new Date(indexation.appliedDate), "dd/MM/yyyy", { locale: fr })}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Validée
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Variation appliquée</p>
                        <p className="font-medium text-green-600">+{indexation.variationPercent}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nouveau montant</p>
                        <p className="font-medium">{indexation.newValue}€</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Formule utilisée</p>
                        <p className="font-medium">{indexation.formulaCode}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Indexations rejetées */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedIndexations.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aucune indexation rejetée</AlertTitle>
              <AlertDescription>
                Les indexations rejetées apparaîtront ici.
              </AlertDescription>
            </Alert>
          ) : (
            rejectedIndexations.map((indexation) => {
              const contract = contracts.find(c => c.id === indexation.contractId);
              return (
                <Card key={indexation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {contract?.title || "Contrat inconnu"}
                        </CardTitle>
                        <CardDescription>
                          {contract?.number}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive">Rejetée</Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}