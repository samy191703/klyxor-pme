// client/src/pages/IndexationConfig.tsx

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Contract } from "@shared/schema";

import { KlyxorPageLayout } from "@/components/layout/KlyxorPageLayout";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { queryClient, apiRequest } from "@/lib/queryClient";

import {
  AlertCircle,
  Calculator,
  CheckCircle,
  Copy,
  Info,
  RefreshCw,
  Save,
  Shield,
} from "lucide-react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Frequency = "monthly" | "quarterly" | "semi-annual" | "annual";
type CalcMode = "P0" | "Pn-1";
type TabKey = "general" | "advanced" | "simulation";

interface IndexationFormula {
  id: string;
  code: string;
  name?: string;
  description?: string;
}

interface IndexationSettings {
  frequency: Frequency;
  formula: string;
  cap: number;
  threshold: number;
  calculationMode: CalcMode;
  nextDate: string; // yyyy-MM-dd

  // Simulation only
  indexationDate: string; // yyyy-MM-dd
  indexTakingDate?: string; // yyyy-MM-dd
}

function safeCanConfigureIndexation(permissions: any): boolean {
  const v = permissions?.canConfigureIndexation;
  if (typeof v === "function") return Boolean(v());
  return Boolean(v);
}

export default function IndexationConfig() {
  const { toast } = useToast();
  const permissions = usePermissions();
  const canAccess = safeCanConfigureIndexation(permissions);

  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [activeInnerTab, setActiveInnerTab] = useState<TabKey>("general");

  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const [settings, setSettings] = useState<IndexationSettings>({
    frequency: "annual",
    formula: "ICHT",
    cap: 5,
    threshold: 0,
    calculationMode: "P0",
    nextDate: today,
    indexationDate: today,
    indexTakingDate: undefined,
  });

  const {
    data: contracts = [],
    isLoading: contractsLoading,
    isError: contractsError,
  } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: formulas = [] } = useQuery<IndexationFormula[]>({
    queryKey: ["/api/indexation-formulas"],
  });

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId),
    [contracts, selectedContractId]
  );

  const formulasForSelect = useMemo(() => {
    if (!formulas?.length) {
      return [
        { code: "ICHT", label: "ICHT - Indice du coût horaire du travail" },
        { code: "ICC", label: "ICC - Indice du coût de la construction" },
        { code: "ILC", label: "ILC - Indice des loyers commerciaux" },
        { code: "IRL", label: "IRL - Indice de référence des loyers" },
        { code: "BT01", label: "BT01 - Bâtiment" },
        { code: "FM0A", label: "FM0A - Frais et services" },
        { code: "CPI", label: "CPI - Consumer Price Index" },
        { code: "custom", label: "Formule personnalisée" },
      ];
    }
    return formulas.map((f) => ({
      code: f.code,
      label: f.name ? `${f.code} - ${f.name}` : f.code,
    }));
  }, [formulas]);

  function calculateNextDate(freq: Frequency) {
    const d = new Date();
    switch (freq) {
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
      case "quarterly":
        d.setMonth(d.getMonth() + 3);
        break;
      case "semi-annual":
        d.setMonth(d.getMonth() + 6);
        break;
      case "annual":
      default:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return format(d, "yyyy-MM-dd");
  }

  function handleContractSelect(contractId: string) {
    setSelectedContractId(contractId);
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return;

    const nextDate = contract.nextIndexationDate
      ? format(new Date(contract.nextIndexationDate), "yyyy-MM-dd")
      : today;

    const takingDate = contract.indexTakingDate
      ? format(new Date(contract.indexTakingDate), "yyyy-MM-dd")
      : undefined;

    setSettings({
      frequency: (contract.indexationFrequency as Frequency) || "annual",
      formula: contract.indexationFormula || "ICHT",
      cap: Number(contract.indexationCap ?? 5),
      threshold: Number(contract.indexationThreshold ?? 0),
      calculationMode: (contract.calculationMode as CalcMode) || "P0",
      nextDate,
      indexationDate: today,
      indexTakingDate: takingDate,
    });

    setSimulationResult(null);
    setActiveInnerTab("general");
  }

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!selectedContractId) throw new Error("Aucun contrat sélectionné");

      const selectedFormula = formulas?.find((f) => f.code === settings.formula);

      const payload = {
        indexationFrequency: settings.frequency,
        indexationFormula: settings.formula,
        indexationFormulaId: selectedFormula?.id || null,
        indexationCap: Number(settings.cap),
        indexationThreshold: Number(settings.threshold),
        calculationMode: settings.calculationMode,
        nextIndexationDate: settings.nextDate
          ? new Date(settings.nextDate).toISOString()
          : null,
        indexTakingDate: settings.indexTakingDate
          ? new Date(settings.indexTakingDate).toISOString()
          : null,
      };

      const res = await apiRequest(
        "PATCH",
        `/api/contracts/${selectedContractId}`,
        payload
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres d'indexation ont été mis à jour.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de sauvegarde",
        description: error?.message || "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    },
  });

  if (contractsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (contractsError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Impossible de charger les contrats. Vérifiez votre connexion ou
            contactez l’administrateur.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour configurer les
            indexations. Seuls les administrateurs et gestionnaires peuvent
            accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <KlyxorPageLayout
      title="Configuration d'indexation"
      subtitle="Paramétrez l'indexation automatique de vos contrats"
      actions={() => (
        <div className="flex items-center gap-2">
          {selectedContractId && (
            <Button
              variant="outline"
              onClick={() => {
                setSimulationResult(null);
                toast({
                  title: "Simulation réinitialisée",
                  description: "Le panneau de simulation a été remis à zéro.",
                });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset simulation
            </Button>
          )}

          <Button
            onClick={() => saveSettings.mutate()}
            disabled={!selectedContractId || saveSettings.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      )}
    >
      {() => (
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sélection du contrat</CardTitle>
              <CardDescription>Choisissez le contrat à configurer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contract-select">Contrat</Label>
                  <Select value={selectedContractId} onValueChange={handleContractSelect}>
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
                      <strong>Informations du contrat :</strong>
                      <br />
                      Parc: {selectedContract.parkCode}
                      <br />
                      Type: {selectedContract.type}
                      <br />
                      Montant actuel: {selectedContract.amount}€
                      <br />
                      Prochaine indexation:{" "}
                      {selectedContract.nextIndexationDate
                        ? format(
                            new Date(selectedContract.nextIndexationDate),
                            "dd/MM/yyyy",
                            { locale: fr }
                          )
                        : "Non définie"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {!selectedContractId ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Sélectionnez un contrat pour démarrer</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Les paramètres (fréquence, formule, cap/seuil, mode de calcul) se chargent
                      automatiquement depuis le contrat.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Tabs
                value={activeInnerTab}
                onValueChange={(v) => setActiveInnerTab(v as TabKey)}
                className="space-y-4"
              >
                <TabsList>
                  <TabsTrigger value="general">Paramètres généraux</TabsTrigger>
                  <TabsTrigger value="advanced">Paramètres avancés</TabsTrigger>
                  <TabsTrigger value="simulation">Simulation</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                  <Card>
                    <CardHeader>
                      <CardTitle>Paramètres généraux</CardTitle>
                      <CardDescription>Configuration de base de l'indexation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="frequency">Fréquence d'indexation</Label>
                          <Select
                            value={settings.frequency}
                            onValueChange={(value) => {
                              const freq = value as Frequency;
                              setSettings((prev) => ({
                                ...prev,
                                frequency: freq,
                                nextDate: calculateNextDate(freq),
                              }));
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
                            onValueChange={(value) => setSettings((prev) => ({ ...prev, formula: value }))}
                          >
                            <SelectTrigger id="formula">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {formulasForSelect.map((f) => (
                                <SelectItem key={f.code} value={f.code}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="next-date">Prochaine date d'indexation</Label>
                          <Input
                            id="next-date"
                            type="date"
                            value={settings.nextDate}
                            onChange={(e) => setSettings((prev) => ({ ...prev, nextDate: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="calculation-mode">Mode de calcul</Label>
                          <Select
                            value={settings.calculationMode}
                            onValueChange={(value) =>
                              setSettings((prev) => ({ ...prev, calculationMode: value as CalcMode }))
                            }
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

                <TabsContent value="advanced">
                  <Card>
                    <CardHeader>
                      <CardTitle>Paramètres avancés</CardTitle>
                      <CardDescription>Limites et seuils d'indexation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cap">Cap (plafond) en %</Label>
                          <Input
                            id="cap"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={settings.cap}
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, cap: Number(e.target.value || 0) }))
                            }
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
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, threshold: Number(e.target.value || 0) }))
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Augmentation minimale garantie
                          </p>
                        </div>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Exemple d'application :</strong>
                          <br />• Si la variation calculée est de 7% avec un cap de 5%, l'augmentation sera limitée à 5%
                          <br />• Si la variation calculée est de 1% avec un seuil de 2%, l'augmentation sera de 2%
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="simulation">
                  <Card>
                    <CardHeader>
                      <CardTitle>Simulation d'indexation</CardTitle>
                      <CardDescription>Testez les paramètres avant de les appliquer</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="indexation-date">Date d’indexation (simulation)</Label>
                          <Input
                            id="indexation-date"
                            type="date"
                            value={settings.indexationDate}
                            onChange={(e) => setSettings((prev) => ({ ...prev, indexationDate: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="index-taking-date">Date de prise d’indice (optionnel)</Label>
                          <Input
                            id="index-taking-date"
                            type="date"
                            value={settings.indexTakingDate || ""}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                indexTakingDate: e.target.value || undefined,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {simulationResult ? (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription>
                            <strong className="text-green-900">Résultat de la simulation :</strong>
                            <br />
                            <br />
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Montant actuel :</span>
                                <span className="font-medium">
                                  {simulationResult.oldAmount?.toLocaleString("fr-FR")} €
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Nouveau montant :</span>
                                <span className="font-bold text-green-700">
                                  {simulationResult.newAmount?.toLocaleString("fr-FR")} €
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Variation :</span>
                                <span
                                  className={[
                                    "font-bold",
                                    simulationResult.variation > 0
                                      ? "text-green-700"
                                      : simulationResult.variation < 0
                                      ? "text-red-600"
                                      : "text-gray-600",
                                  ].join(" ")}
                                >
                                  {simulationResult.variation > 0 ? "+" : ""}
                                  {Number(simulationResult.variation || 0).toFixed(2)}%
                                </span>
                              </div>

                              <hr className="my-2" />

                              <div className="flex justify-between text-sm">
                                <span>Facteur brut :</span>
                                <span>{Number(simulationResult.factorBrut || 0).toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Facteur ajusté :</span>
                                <span>{Number(simulationResult.factorAdjusted || 0).toFixed(4)}</span>
                              </div>

                              {simulationResult.cappedApplied && (
                                <div className="text-sm text-orange-700">
                                  Cap appliqué ({settings.cap}%)
                                </div>
                              )}
                              {simulationResult.thresholdApplied && (
                                <div className="text-sm text-blue-700">
                                  Seuil appliqué ({settings.threshold}%)
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert>
                          <Calculator className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Simulation basée sur les paramètres actuels :</strong>
                            <br />
                            <br />
                            Montant actuel: {selectedContract?.amount || 0}€
                            <br />
                            Formule: {settings.formula}
                            <br />
                            Mode de calcul: {settings.calculationMode}
                            <br />
                            Cap: {settings.cap}% | Seuil: {settings.threshold}%
                            <br />
                            <br />
                            Lancez une simulation complète pour obtenir la variation estimée.
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
                                indexationDate: settings.indexationDate
                                  ? new Date(settings.indexationDate).toISOString()
                                  : new Date().toISOString(),
                                indexTakingDate: settings.indexTakingDate
                                  ? new Date(settings.indexTakingDate).toISOString()
                                  : null,
                                testMode: true,
                              });

                              const result = await response.json();
                              setSimulationResult(result);

                              toast({
                                title: "Simulation terminée",
                                description: `Nouvelle valeur estimée : ${result.newAmount?.toLocaleString(
                                  "fr-FR"
                                )} € (${result.variation > 0 ? "+" : ""}${Number(
                                  result.variation || 0
                                ).toFixed(2)}%)`,
                              });
                            } catch (error: any) {
                              toast({
                                title: "Erreur de simulation",
                                description:
                                  error?.message ||
                                  "Impossible de calculer l'indexation. Vérifiez les paramètres.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsSimulating(false);
                            }
                          }}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Lancer une simulation complète
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!selectedContract) return;

                    const nextDate = selectedContract.nextIndexationDate
                      ? format(new Date(selectedContract.nextIndexationDate), "yyyy-MM-dd")
                      : today;

                    const takingDate = selectedContract.indexTakingDate
                      ? format(new Date(selectedContract.indexTakingDate), "yyyy-MM-dd")
                      : undefined;

                    setSettings({
                      frequency: (selectedContract.indexationFrequency as Frequency) || "annual",
                      formula: selectedContract.indexationFormula || "ICHT",
                      cap: Number(selectedContract.indexationCap ?? 5),
                      threshold: Number(selectedContract.indexationThreshold ?? 0),
                      calculationMode: (selectedContract.calculationMode as CalcMode) || "P0",
                      nextDate,
                      indexationDate: today,
                      indexTakingDate: takingDate,
                    });

                    setSimulationResult(null);
                    toast({
                      title: "Paramètres rechargés",
                      description: "Les paramètres ont été rechargés depuis le contrat.",
                    });
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Recharger depuis contrat
                </Button>

                <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder la configuration
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </KlyxorPageLayout>
  );
}
