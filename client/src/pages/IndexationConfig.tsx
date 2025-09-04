import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings, 
  Save, 
  AlertCircle, 
  Calendar,
  Calculator,
  TrendingUp,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import type { Contract } from "@shared/schema";

interface IndexationSettings {
  frequency: string;
  formula: string;
  cap: number;
  threshold: number;
  calculationMode: string;
  nextDate: string;
  indexTakingDate?: string;
}

export default function IndexationConfig() {
  const { toast } = useToast();
  const { canConfigureIndexation } = usePermissions();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [settings, setSettings] = useState<IndexationSettings>({
    frequency: "annual",
    formula: "ICHT",
    cap: 5,
    threshold: 0,
    calculationMode: "P0",
    nextDate: format(new Date(), "yyyy-MM-dd"),
  });

  // Récupération des contrats
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Récupération des formules d'indexation disponibles
  const { data: formulas = [] } = useQuery({
    queryKey: ["/api/indexation-formulas"],
  });

  // Mutation pour sauvegarder les paramètres
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!selectedContractId) throw new Error("Aucun contrat sélectionné");
      
      // Récupérer l'ID de la formule depuis la liste (si disponible)
      const selectedFormula = formulas?.find(f => f.code === settings.formula);
      
      const dataToSave = {
        indexationFrequency: settings.frequency,
        indexationFormula: settings.formula,
        indexationFormulaId: selectedFormula?.id || null,
        indexationCap: Number(settings.cap),
        indexationThreshold: Number(settings.threshold),
        calculationMode: settings.calculationMode,
        nextIndexationDate: settings.nextDate ? new Date(settings.nextDate).toISOString() : null,
        indexTakingDate: settings.indexTakingDate ? new Date(settings.indexTakingDate).toISOString() : null,
      };
      
      console.log("Saving settings:", dataToSave);
      
      const response = await apiRequest("PATCH", `/api/contracts/${selectedContractId}`, dataToSave);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Save successful:", data);
      toast({
        title: "Configuration sauvegardée ✅",
        description: "Les paramètres d'indexation ont été mis à jour avec succès",
      });
      // Recharger les contrats pour avoir les nouvelles données
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (error: any) => {
      console.error("Save error:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: error.message || "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    },
  });

  // Charger les paramètres du contrat sélectionné
  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setSettings({
        frequency: contract.indexationFrequency || "annual",
        formula: contract.indexationFormula || "ICHT",
        cap: Number(contract.indexationCap) || 5,
        threshold: Number(contract.indexationThreshold) || 0,
        calculationMode: contract.calculationMode || "P0",
        nextDate: contract.nextIndexationDate 
          ? format(new Date(contract.nextIndexationDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        indexTakingDate: contract.indexTakingDate
          ? format(new Date(contract.indexTakingDate), "yyyy-MM-dd")
          : undefined,
      });
    }
  };

  // Calculer la prochaine date d'indexation selon la fréquence
  const calculateNextDate = (frequency: string) => {
    const now = new Date();
    switch (frequency) {
      case "monthly":
        now.setMonth(now.getMonth() + 1);
        break;
      case "quarterly":
        now.setMonth(now.getMonth() + 3);
        break;
      case "semi-annual":
        now.setMonth(now.getMonth() + 6);
        break;
      case "annual":
        now.setFullYear(now.getFullYear() + 1);
        break;
    }
    return format(now, "yyyy-MM-dd");
  };

  if (contractsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Vérifier si l'utilisateur peut configurer les indexations
  if (!canConfigureIndexation()) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour configurer les indexations.
            Seuls les administrateurs et les gestionnaires peuvent accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuration d'indexation</h1>
          <p className="text-muted-foreground">Paramétrez l'indexation automatique de vos contrats</p>
        </div>
      </div>

      {/* Sélection du contrat */}
      <Card>
        <CardHeader>
          <CardTitle>Sélection du contrat</CardTitle>
          <CardDescription>Choisissez le contrat à configurer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contract-select">Contrat</Label>
              <Select value={selectedContractId || ""} onValueChange={handleContractSelect}>
                <SelectTrigger id="contract-select">
                  <SelectValue placeholder="Sélectionner un contrat" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.title} - {contract.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContract && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Informations du contrat:</strong><br />
                  Parc: {selectedContract.parkCode}<br />
                  Type: {selectedContract.type}<br />
                  Montant actuel: {selectedContract.amount}€<br />
                  Prochaine indexation: {selectedContract.nextIndexationDate 
                    ? format(new Date(selectedContract.nextIndexationDate), "dd/MM/yyyy", { locale: fr })
                    : "Non définie"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedContractId && (
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Paramètres généraux</TabsTrigger>
            <TabsTrigger value="advanced">Paramètres avancés</TabsTrigger>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
          </TabsList>

          {/* Paramètres généraux */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
                <CardDescription>Configuration de base de l'indexation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Fréquence d'indexation</Label>
                    <Select 
                      value={settings.frequency} 
                      onValueChange={(value) => {
                        setSettings({
                          ...settings, 
                          frequency: value,
                          nextDate: calculateNextDate(value)
                        });
                      }}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                        <SelectItem value="quarterly">Trimestrielle</SelectItem>
                        <SelectItem value="semi-annual">Semestrielle</SelectItem>
                        <SelectItem value="annual">Annuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="formula">Formule d'indexation</Label>
                    <Select 
                      value={settings.formula} 
                      onValueChange={(value) => setSettings({...settings, formula: value})}
                    >
                      <SelectTrigger id="formula">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ICHT">ICHT - Indice du coût horaire du travail</SelectItem>
                        <SelectItem value="ICC">ICC - Indice du coût de la construction</SelectItem>
                        <SelectItem value="ILC">ILC - Indice des loyers commerciaux</SelectItem>
                        <SelectItem value="IRL">IRL - Indice de référence des loyers</SelectItem>
                        <SelectItem value="BT01">BT01 - Bâtiment</SelectItem>
                        <SelectItem value="FM0A">FM0A - Frais et services</SelectItem>
                        <SelectItem value="CPI">CPI - Consumer Price Index</SelectItem>
                        <SelectItem value="custom">Formule personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="next-date">Prochaine date d'indexation</Label>
                    <Input
                      id="next-date"
                      type="date"
                      value={settings.nextDate}
                      onChange={(e) => setSettings({...settings, nextDate: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="calculation-mode">Mode de calcul</Label>
                    <Select 
                      value={settings.calculationMode} 
                      onValueChange={(value) => setSettings({...settings, calculationMode: value})}
                    >
                      <SelectTrigger id="calculation-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P0">P₀ - Valeur initiale</SelectItem>
                        <SelectItem value="Pn-1">Pₙ₋₁ - Valeur précédente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paramètres avancés */}
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres avancés</CardTitle>
                <CardDescription>Limites et seuils d'indexation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cap">Cap (plafond) en %</Label>
                    <Input
                      id="cap"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.cap}
                      onChange={(e) => setSettings({...settings, cap: parseFloat(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Augmentation maximale autorisée
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="threshold">Seuil (plancher) en %</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.threshold}
                      onChange={(e) => setSettings({...settings, threshold: parseFloat(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Augmentation minimale garantie
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Exemple d'application:</strong><br />
                    • Si la variation calculée est de 7% avec un cap de 5%, l'augmentation sera limitée à 5%<br />
                    • Si la variation calculée est de 1% avec un seuil de 2%, l'augmentation sera de 2%
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulation */}
          <TabsContent value="simulation">
            <Card>
              <CardHeader>
                <CardTitle>Simulation d'indexation</CardTitle>
                <CardDescription>Testez les paramètres avant de les appliquer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {simulationResult ? (
                  <Alert className="border-green-200 bg-green-50">
                    <Calculator className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong className="text-green-900">Résultat de la simulation :</strong><br /><br />
                      
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between">
                          <span>Montant actuel :</span>
                          <span className="font-medium">{simulationResult.oldAmount?.toLocaleString('fr-FR')} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nouveau montant :</span>
                          <span className="font-bold text-green-600">{simulationResult.newAmount?.toLocaleString('fr-FR')} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Variation :</span>
                          <span className={`font-bold ${simulationResult.variation > 0 ? 'text-green-600' : simulationResult.variation < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {simulationResult.variation > 0 && '+'}{simulationResult.variation?.toFixed(2)}%
                          </span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between text-sm">
                          <span>Facteur brut :</span>
                          <span>{simulationResult.factorBrut?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Facteur ajusté :</span>
                          <span>{simulationResult.factorAdjusted?.toFixed(4)}</span>
                        </div>
                        {simulationResult.cappedApplied && (
                          <div className="text-sm text-orange-600">⚠️ Cap appliqué ({settings.cap}%)</div>
                        )}
                        {simulationResult.thresholdApplied && (
                          <div className="text-sm text-blue-600">ℹ️ Seuil appliqué ({settings.threshold}%)</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Calculator className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Simulation basée sur les paramètres actuels:</strong><br /><br />
                      
                      Montant actuel: {selectedContract?.amount || 0}€<br />
                      Formule: {settings.formula}<br />
                      Mode de calcul: {settings.calculationMode}<br />
                      Cap: {settings.cap}% | Seuil: {settings.threshold}%<br /><br />
                      
                      Cliquez sur le bouton ci-dessous pour lancer une simulation complète.
                    </AlertDescription>
                  </Alert>
                )}

                {isSimulating ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={!selectedContractId || isSimulating}
                    onClick={async () => {
                      if (!selectedContractId) return;
                      
                      setIsSimulating(true);
                      setSimulationResult(null);
                      
                      try {
                        const response = await apiRequest("POST", "/api/indexations/calculate", {
                          contractId: selectedContractId,
                          indexationDate: settings.indexationDate || new Date(),
                          indexTakingDate: settings.indexTakingDate,
                          testMode: true
                        });
                        
                        const result = await response.json();
                        setSimulationResult(result);
                        
                        toast({
                          title: "Simulation terminée",
                          description: `Nouvelle valeur estimée : ${result.newAmount?.toLocaleString('fr-FR')} € (${result.variation > 0 ? '+' : ''}${result.variation?.toFixed(2)}%)`,
                        });
                      } catch (error: any) {
                        console.error("Simulation error:", error);
                        toast({
                          title: "Erreur de simulation",
                          description: error.message || "Impossible de calculer l'indexation. Vérifiez les paramètres.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSimulating(false);
                      }
                    }}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {isSimulating ? "Calcul en cours..." : "Lancer une simulation complète"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Bouton de sauvegarde */}
      {selectedContractId && (
        <div className="flex justify-end">
          <Button 
            size="lg" 
            onClick={() => saveSettings.mutate()}
            disabled={saveSettings.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder la configuration
          </Button>
        </div>
      )}
    </div>
  );
}