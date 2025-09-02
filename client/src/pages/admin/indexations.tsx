import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Calculator, CheckCircle, XCircle, AlertTriangle, 
  TrendingUp, RefreshCw, FileText, Download,
  Search, Filter, Save, X, Info, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Données réelles selon le document "MÉCANISME D'INDEXATION – DONNÉES DE TEST"
const testIndexations = [
  {
    id: 1,
    contractCode: "AUX89",
    contractName: "PARC AUXERROIS",
    indexationDate: "24/09/2024",
    formula: "P = P₀ × (ICHTREV / ICHT₀)",
    originalIndex: { ICHT0: 115.7 },
    originalAmount: 128000,
    currentIndex: { ICHTREV: 118.2 },
    newAmount: 130775,  // Calcul réel : 128000 × (118.2 / 115.7)
    variation: "+2.17%",
    cap: "0%",
    threshold: "0%",
    status: "to_calculate",
    dateIndice: "01/09/2024"
  },
  {
    id: 2,
    contractCode: "FIG83",
    contractName: "PARC FIGANIÈRES",
    indexationDate: "01/09/2024",
    formula: "P = P₀ × (0,15 + 0,55 × (ICHTREV / ICHT₀) + 0,3 × (FMOAREV / FMOA₀))",
    originalIndex: { ICHT0: 113.4, FMOA0: 91.57 },
    originalAmount: 437000,
    currentIndex: { ICHTREV: 118.2, FMOAREV: 94.3 },
    newAmount: 453224,  // Calcul avec formule Type 2.A
    variation: "+3.71%",
    cap: "0%",
    threshold: "0%",
    status: "to_validate",
    dateIndice: "01/09/2024"
  },
  {
    id: 3,
    contractCode: "SCM29",
    contractName: "PARC SCAER LE MERDY",
    indexationDate: "01/09/2024",
    formula: "P = P₋₁ × (1 + CPI)",
    previousAmount: 52919.20,  // P₋₁ au lieu de originalAmount
    currentIndex: { CPI: 1.023 },  // 2.3% d'augmentation
    newAmount: 54136.34,
    variation: "+2.3%",
    cap: "0%",
    threshold: "2%",
    status: "validated",
    dateIndice: "01/09/2024"
  },
  {
    id: 4,
    contractCode: "GLB04",
    contractName: "PARC GRÉOUX 1",
    indexationDate: "01/01/2024",
    formula: "P = P₀ × (0,15 + 0,55 × (ICHTREV / ICHT₀) + 0,3 × (FMOAREV / FMOA₀))",
    originalIndex: { ICHT0: 128.2, FMOA0: 97.93 },
    originalAmount: 141480,
    currentIndex: { ICHTREV: 130.8, FMOAREV: 99.5 },
    newAmount: 144429,
    variation: "+2.08%",
    cap: "2%",  // Plafonnement à 2%
    threshold: "0%",
    status: "to_calculate",
    dateIndice: "01/11/2023"  // N-1
  }
];

// Formules d'indexation officielles selon les spécifications
const indexationFormulas = [
  {
    id: "simple",
    name: "Simple",
    formula: "P = P₀ × (ICHTREV / ICHT₀)",
    indices: ["ICHT"],
    description: "Indexation simple basée sur l'indice ICHT uniquement"
  },
  {
    id: "type2a",
    name: "Type 2.A",
    formula: "Montant_n = Montant_0 × (0,15 + 0,55 × (ICHT_rev/ICHT_0) + 0,3 × (FMOA_rev/FMOA_0))",
    indices: ["ICHT", "FMOA"],
    description: "Formule composite avec pondération fixe sur montant initial"
  },
  {
    id: "type2b", 
    name: "Type 2.B",
    formula: "Montant_n = Montant_{n-1} × (0,15 + 0,55 × (ICHT_rev/ICHT_0) + 0,3 × (FMOA_rev/FMOA_0))",
    indices: ["ICHT", "FMOA"],
    description: "Formule composite avec pondération sur montant précédent"
  },
  {
    id: "type3",
    name: "Type 3",
    formula: "Montant_n = Montant_0 × (1 + (CPI/CPI_0))",
    indices: ["CPI"],
    description: "Indexation basée sur l'inflation (Consumer Price Index)"
  },
  {
    id: "cpi_simple",
    name: "CPI Simple",
    formula: "P = P₋₁ × (1 + CPI)",
    indices: ["CPI"],
    description: "Indexation sur montant précédent avec taux CPI"
  }
];

// Sources d'indices officielles avec liens INSEE
const indexSources = [
  { 
    key: "ICHT", 
    name: "Indice du coût horaire du travail - Tous salariés - Industries mécaniques et électriques", 
    lastValue: 118.2, 
    lastUpdate: "01/01/2025", 
    source: "INSEE", 
    status: "ok",
    url: "https://www.insee.fr/fr/statistiques/serie/001565183",
    frequency: "Trimestrielle"
  },
  { 
    key: "FMOA", 
    name: "Frais et services divers - Indice des prix à la production", 
    lastValue: 94.3, 
    lastUpdate: "01/01/2025", 
    source: "INSEE", 
    status: "ok",
    url: "https://www.insee.fr/fr/statistiques/serie/010534796",
    frequency: "Mensuelle"
  },
  { 
    key: "CPI", 
    name: "Consumer Price Index - Indice des prix à la consommation", 
    lastValue: 1.023, 
    lastUpdate: "01/01/2025", 
    source: "INSEE", 
    status: "error",
    url: "https://www.insee.fr/fr/statistiques/serie/001763852",
    frequency: "Mensuelle"
  }
];

export default function AdminIndexations() {
  const [activeView, setActiveView] = useState("to_calculate");
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [formulaFilter, setFormulaFilter] = useState("");
  const [buFilter, setBuFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedIndexation, setSelectedIndexation] = useState<any>(null);
  const [validationDecision, setValidationDecision] = useState<"validate" | "reject" | "">("");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const submenuItems = [
    { label: "À calculer", value: "to_calculate", active: activeView === "to_calculate" },
    { label: "À valider", value: "to_validate", active: activeView === "to_validate" },
    { label: "Historique", value: "history", active: activeView === "history" },
    { label: "Formules", value: "formulas", active: activeView === "formulas" },
    { label: "Indices (sources)", value: "indices", active: activeView === "indices" },
    { label: "Rapports", value: "reports", active: activeView === "reports" }
  ];

  const handleCalculate = (indexation: any) => {
    toast({
      title: "Calcul lancé",
      description: `L'indexation du contrat ${indexation.contractCode} est en cours de calcul.`
    });
  };

  const handleValidate = (indexation: any) => {
    setSelectedIndexation(indexation);
    setShowValidationModal(true);
  };

  const handleValidationSubmit = () => {
    if (validationDecision === "reject" && !rejectionReason) {
      toast({
        title: "Erreur",
        description: "Le motif de rejet est obligatoire.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: validationDecision === "validate" ? "Indexation validée" : "Indexation rejetée",
      description: `L'indexation du contrat ${selectedIndexation.contractCode} a été ${validationDecision === "validate" ? "validée" : "rejetée"}.`
    });
    
    setShowValidationModal(false);
    setValidationDecision("");
    setRejectionReason("");
  };

  const handleRefreshIndex = (index: any) => {
    toast({
      title: "Récupération lancée",
      description: `Tentative de récupération de l'indice ${index.key} depuis ${index.source}.`
    });
  };

  return (
    <AdminLayout 
      title="Indexations (Admin)"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {(activeView === "to_calculate" || activeView === "to_validate") && (
          <>
            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <Label>Période d'indexation</Label>
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les périodes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les périodes</SelectItem>
                        <SelectItem value="current_month">Mois en cours</SelectItem>
                        <SelectItem value="next_month">Mois prochain</SelectItem>
                        <SelectItem value="current_quarter">Trimestre en cours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type contrat</Label>
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
                    <Label>Formule</Label>
                    <Select value={formulaFilter} onValueChange={setFormulaFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les formules" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les formules</SelectItem>
                        {indexationFormulas.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>BU</Label>
                    <Select value={buFilter} onValueChange={setBuFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les BU" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les BU</SelectItem>
                        <SelectItem value="engie-solutions">ENGIE Solutions</SelectItem>
                        <SelectItem value="engie-green">ENGIE Green</SelectItem>
                        <SelectItem value="engie-gem">ENGIE GEM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Responsable</Label>
                    <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les responsables" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="marie">Marie Dupont</SelectItem>
                        <SelectItem value="jean">Jean Martin</SelectItem>
                        <SelectItem value="sophie">Sophie Laurent</SelectItem>
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
                    setPeriodFilter("");
                    setTypeFilter("");
                    setFormulaFilter("");
                    setBuFilter("");
                    setResponsibleFilter("");
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

            {/* Tableau des indexations */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeView === "to_calculate" ? "Indexations à calculer" : "Indexations à valider"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Date d'indexation</TableHead>
                      <TableHead>Formule appliquée</TableHead>
                      <TableHead>Indices N-0/N</TableHead>
                      <TableHead>Ancien montant</TableHead>
                      <TableHead>Nouveau montant</TableHead>
                      <TableHead>Variation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testIndexations
                      .filter(i => activeView === "to_calculate" ? i.status === "to_calculate" : i.status === "to_validate")
                      .map((indexation) => (
                      <TableRow key={indexation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{indexation.contractCode}</div>
                            <div className="text-sm text-muted-foreground">{indexation.contractName}</div>
                          </div>
                        </TableCell>
                        <TableCell>{indexation.indexationDate}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-xs font-mono">{indexation.formula}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {Object.entries(indexation.originalIndex || {}).map(([key, value]) => (
                              <div key={key}>{key}: {value}</div>
                            ))}
                            {indexation.currentIndex && (
                              <>
                                <div className="border-t mt-1 pt-1">
                                  {Object.entries(indexation.currentIndex).map(([key, value]) => (
                                    <div key={key}>{key}: {value}</div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{indexation.originalAmount.toLocaleString()} €</TableCell>
                        <TableCell className="font-medium">
                          {indexation.newAmount ? indexation.newAmount.toLocaleString() + " €" : "À calculer"}
                        </TableCell>
                        <TableCell>
                          {indexation.variation && (
                            <Badge variant={indexation.variation.includes("+") ? "default" : "secondary"}>
                              {indexation.variation}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              indexation.status === "to_calculate" ? "secondary" :
                              indexation.status === "to_validate" ? "warning" :
                              "default"
                            }
                          >
                            {indexation.status === "to_calculate" ? "À calculer" :
                             indexation.status === "to_validate" ? "À valider" :
                             "Validé"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {indexation.status === "to_calculate" ? (
                              <Button size="sm" variant="outline" onClick={() => handleCalculate(indexation)}>
                                <Calculator className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleValidate(indexation)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {activeView === "history" && (
          <Card>
            <CardHeader>
              <CardTitle>Historique des indexations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Ancien montant</TableHead>
                    <TableHead>Nouveau montant</TableHead>
                    <TableHead>Variation</TableHead>
                    <TableHead>Validé par</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>01/09/2024</TableCell>
                    <TableCell>SCM29 - PARC SCAER LE MERDY</TableCell>
                    <TableCell>52 919,20 €</TableCell>
                    <TableCell>54 136,34 €</TableCell>
                    <TableCell><Badge>+2.3%</Badge></TableCell>
                    <TableCell>Marie Dupont</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === "formulas" && (
          <Card>
            <CardHeader>
              <CardTitle>Bibliothèque de formules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {indexationFormulas.map((formula) => (
                  <div key={formula.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{formula.name}</h3>
                        <p className="text-sm font-mono mt-2 text-muted-foreground">{formula.formula}</p>
                        <div className="flex gap-2 mt-2">
                          {formula.indices.map(index => (
                            <Badge key={index} variant="outline">{index}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Tester
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "indices" && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Les indices sont récupérés automatiquement depuis les sources officielles. 
                En cas d'échec, vous pouvez relancer manuellement la récupération.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Sources d'indices économiques</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clé</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Dernière valeur</TableHead>
                      <TableHead>Mise à jour</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indexSources.map((index) => (
                      <TableRow key={index.key}>
                        <TableCell className="font-mono">{index.key}</TableCell>
                        <TableCell>{index.name}</TableCell>
                        <TableCell className="font-medium">{index.lastValue}</TableCell>
                        <TableCell>{index.lastUpdate}</TableCell>
                        <TableCell>{index.source}</TableCell>
                        <TableCell>
                          <Badge variant={index.status === "ok" ? "default" : "destructive"}>
                            {index.status === "ok" ? "OK" : "Erreur"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRefreshIndex(index)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Journal de récupération</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Échec récupération CPI</p>
                          <p className="text-sm">Erreur HTTP 503 - Service INSEE indisponible</p>
                          <p className="text-xs text-muted-foreground">Il y a 2 heures</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Relancer
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeView === "reports" && (
          <Card>
            <CardHeader>
              <CardTitle>Rapports d'indexation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 1, contract: "AUX89", period: "Q3 2024", date: "24/09/2024", variation: "+1.99%" },
                  { id: 2, contract: "FIG83", period: "Q3 2024", date: "01/09/2024", variation: "+3.64%" },
                  { id: 3, contract: "SCM29", period: "Q3 2024", date: "01/09/2024", variation: "+2.3%" }
                ].map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Rapport {report.contract} - {report.period}</p>
                      <p className="text-sm text-muted-foreground">
                        Généré le {report.date} • Variation : {report.variation}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        XLSX
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de validation */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation de l'indexation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIndexation && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{selectedIndexation.contractCode} - {selectedIndexation.contractName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nouveau montant : {selectedIndexation.newAmount?.toLocaleString()} € ({selectedIndexation.variation})
                </p>
              </div>
            )}
            <div>
              <Label>Décision</Label>
              <Select value={validationDecision} onValueChange={(value: any) => setValidationDecision(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une décision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="validate">Valider</SelectItem>
                  <SelectItem value="reject">Rejeter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {validationDecision === "reject" && (
              <div>
                <Label>Motif de rejet <span className="text-red-500">*</span></Label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Motif obligatoire"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidationSubmit}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}