import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  TrendingUp,
  Calculator,
  History,
  FileText,
  Search,
  RefreshCw,
  Check,
  X,
  Download,
  AlertCircle,
  Calendar
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
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface IndexationFormula {
  id: string;
  code: string;
  name: string;
  formula: string;
  description: string;
  indices: string[];
}

interface EconomicIndex {
  code: string;
  name: string;
  value: number;
  date: Date;
  source: string;
  status: "definitive" | "provisional";
}

interface Indexation {
  id: string;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  indexationDate: Date;
  formula: string;
  oldAmount: number;
  newAmount: number;
  variation: number;
  status: "to_calculate" | "pending" | "validated" | "rejected";
  indices: {
    code: string;
    valueN0: number;
    valueN: number;
  }[];
}

const formulas: IndexationFormula[] = [
  {
    id: "2A",
    code: "Type 2.A",
    name: "ICHT/FMOA sur base initiale",
    formula: "Montant_n = Montant_0 × (0,15 + 0,55 × (ICHT_rev/ICHT_0) + 0,3 × (FMOA_rev/FMOA_0))",
    description: "Indexation basée sur le montant initial avec indices ICHT et FMOA",
    indices: ["ICHT", "FMOA"]
  },
  {
    id: "2B",
    code: "Type 2.B",
    name: "ICHT/FMOA sur base précédente",
    formula: "Montant_n = Montant_{n-1} × (0,15 + 0,55 × (ICHT_rev/ICHT_0) + 0,3 × (FMOA_rev/FMOA_0))",
    description: "Indexation basée sur le montant précédent avec indices ICHT et FMOA",
    indices: ["ICHT", "FMOA"]
  },
  {
    id: "3",
    code: "Type 3",
    name: "CPI",
    formula: "Montant_n = Montant_0 × (1 + (CPI/CPI_0))",
    description: "Indexation basée sur l'indice des prix à la consommation",
    indices: ["CPI"]
  },
  {
    id: "ICHT",
    code: "ICHT Simple",
    name: "ICHT seul",
    formula: "P = P₀ × (ICHTREV / ICHT₀)",
    description: "Indexation simple basée sur l'indice ICHT",
    indices: ["ICHT"]
  }
];

const testData = [
  {
    park: "PARC AUXERROIS",
    code: "AUX89",
    indexDate: "24/09/20XX",
    formula: "ICHT Simple",
    icht0: 115.7,
    p0: 128000,
    cap: 0,
    threshold: 0
  },
  {
    park: "PARC FIGANIÈRES",
    code: "FIG83",
    indexDate: "01/09/20XX",
    formula: "Type 2.A",
    icht0: 113.4,
    fmoa0: 91.57,
    p0: 437000,
    cap: 0,
    threshold: 0
  },
  {
    park: "PARC SCAER LE MERDY",
    code: "SCM29",
    indexDate: "01/09/20XX",
    formula: "Type 3",
    pPrev: 52919.20,
    cap: 0,
    threshold: 2
  },
  {
    park: "PARC GRÉOUX 1",
    code: "GLB04",
    indexDate: "01/01/20XX",
    formula: "Type 2.A",
    icht0: 128.2,
    fmoa0: 97.93,
    p0: 141480,
    cap: 2,
    threshold: 0
  }
];

export function AdminIndexations() {
  const [activeTab, setActiveTab] = useState("calculate");
  const [filters, setFilters] = useState({
    period: "",
    contractType: "",
    formula: "",
    businessUnit: "",
    responsible: "",
    search: ""
  });

  const { data: indexations, isLoading } = useQuery({
    queryKey: ["/api/admin/indexations", activeTab, filters]
  });

  const { data: economicIndices } = useQuery({
    queryKey: ["/api/admin/economic-indices"],
    refetchInterval: 3600000 // Refresh every hour
  });

  const calculateIndexationMutation = useMutation({
    mutationFn: (indexationId: string) => 
      apiRequest(`/api/admin/indexations/${indexationId}/calculate`, {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/indexations"] });
      toast({
        title: "Calcul effectué",
        description: "L'indexation a été calculée avec succès"
      });
    }
  });

  const validateIndexationMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) => 
      apiRequest(`/api/admin/indexations/${id}/validate`, {
        method: "POST",
        body: JSON.stringify({ action })
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/indexations"] });
      toast({
        title: variables.action === "approve" ? "Indexation validée" : "Indexation rejetée",
        description: variables.action === "approve" 
          ? "L'indexation a été approuvée et appliquée"
          : "L'indexation a été rejetée"
      });
    }
  });

  const refreshIndicesMutation = useMutation({
    mutationFn: () => 
      apiRequest("/api/admin/economic-indices/refresh", {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/economic-indices"] });
      toast({
        title: "Indices mis à jour",
        description: "Les indices économiques ont été récupérés depuis les sources officielles"
      });
    }
  });

  const resetFilters = () => {
    setFilters({
      period: "",
      contractType: "",
      formula: "",
      businessUnit: "",
      responsible: "",
      search: ""
    });
  };

  const renderTestDataSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          Données de test - Mécanisme d'indexation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Environnement de test</AlertTitle>
            <AlertDescription>
              Ces données sont fournies pour tester le mécanisme d'indexation sur 4 contrats types
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testData.map((data) => (
              <div key={data.code} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{data.park}</h4>
                    <p className="text-sm text-gray-500">Code: {data.code}</p>
                  </div>
                  <Badge variant="outline">{data.formula}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date d'indexation:</span>
                    <span>{data.indexDate}</span>
                  </div>
                  {data.p0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">P₀:</span>
                      <span>{data.p0.toLocaleString("fr-FR")} €</span>
                    </div>
                  )}
                  {data.icht0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ICHT₀:</span>
                      <span>{data.icht0}</span>
                    </div>
                  )}
                  {data.fmoa0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">FMOA₀:</span>
                      <span>{data.fmoa0}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">CAP:</span>
                    <span>{data.cap}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SEUIL:</span>
                    <span>{data.threshold}%</span>
                  </div>
                </div>
                <Button className="w-full mt-3" size="sm">
                  Tester l'indexation
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des indexations</h1>
          <p className="text-gray-600 mt-1">Calcul, validation et suivi des indexations contractuelles</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="calculate">À calculer</TabsTrigger>
            <TabsTrigger value="validate">À valider</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="formulas">Formules</TabsTrigger>
            <TabsTrigger value="indices">Indices (sources)</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          {/* À calculer */}
          <TabsContent value="calculate" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Période d'indexation</Label>
                    <Input type="month" value={filters.period} 
                      onChange={(e) => setFilters({...filters, period: e.target.value})} />
                  </div>
                  <div>
                    <Label>Type de contrat</Label>
                    <Select value={filters.contractType}
                      onValueChange={(value) => setFilters({...filters, contractType: value})}>
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
                    <Label>Formule d'indexation</Label>
                    <Select value={filters.formula}
                      onValueChange={(value) => setFilters({...filters, formula: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les formules" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {formulas.map(f => (
                          <SelectItem key={f.id} value={f.code}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label>BU</Label>
                    <Select value={filters.businessUnit}
                      onValueChange={(value) => setFilters({...filters, businessUnit: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les BU" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="ENGIE Solutions France">ENGIE Solutions France</SelectItem>
                        <SelectItem value="ENGIE Green">ENGIE Green</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Responsable</Label>
                    <Input placeholder="Nom du responsable" value={filters.responsible}
                      onChange={(e) => setFilters({...filters, responsible: e.target.value})} />
                  </div>
                  <div>
                    <Label>Recherche</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="N° contrat..." className="pl-10" value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})} />
                    </div>
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

            {/* Test Data Section */}
            {renderTestDataSection()}

            {/* Indexations Table */}
            <Card>
              <CardContent className="p-0">
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
                    {indexations?.filter((i: Indexation) => i.status === "to_calculate")
                      .map((indexation: Indexation) => (
                      <TableRow key={indexation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{indexation.contractNumber}</p>
                            <p className="text-sm text-gray-500">{indexation.contractTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(indexation.indexationDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{indexation.formula}</Badge>
                        </TableCell>
                        <TableCell>
                          {indexation.indices.map(idx => (
                            <div key={idx.code} className="text-sm">
                              <span className="font-medium">{idx.code}:</span> {idx.valueN0} → {idx.valueN}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>{indexation.oldAmount.toLocaleString("fr-FR")} €</TableCell>
                        <TableCell className="font-medium">
                          {indexation.newAmount.toLocaleString("fr-FR")} €
                        </TableCell>
                        <TableCell>
                          <span className={indexation.variation > 0 ? "text-green-600" : "text-red-600"}>
                            {indexation.variation > 0 ? "+" : ""}{indexation.variation.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">À calculer</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            onClick={() => calculateIndexationMutation.mutate(indexation.id)}
                            disabled={calculateIndexationMutation.isPending}
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            Calculer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* À valider */}
          <TabsContent value="validate" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Date d'indexation</TableHead>
                      <TableHead>Formule</TableHead>
                      <TableHead>Ancien/Nouveau montant</TableHead>
                      <TableHead>Variation</TableHead>
                      <TableHead>Rapport</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indexations?.filter((i: Indexation) => i.status === "pending")
                      .map((indexation: Indexation) => (
                      <TableRow key={indexation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{indexation.contractNumber}</p>
                            <p className="text-sm text-gray-500">{indexation.contractTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(indexation.indexationDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{indexation.formula}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-gray-500">
                              {indexation.oldAmount.toLocaleString("fr-FR")} €
                            </p>
                            <p className="font-medium">
                              {indexation.newAmount.toLocaleString("fr-FR")} €
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={indexation.variation > 0 ? "text-green-600" : "text-red-600"}>
                            {indexation.variation > 0 ? "+" : ""}{indexation.variation.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="success"
                              onClick={() => validateIndexationMutation.mutate({
                                id: indexation.id,
                                action: "approve"
                              })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => validateIndexationMutation.mutate({
                                id: indexation.id,
                                action: "reject"
                              })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Formules */}
          <TabsContent value="formulas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bibliothèque de formules d'indexation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formulas.map(formula => (
                    <div key={formula.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{formula.name}</h4>
                          <Badge variant="outline" className="mt-1">{formula.code}</Badge>
                        </div>
                        <Button size="sm" variant="outline">Tester</Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{formula.description}</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        {formula.formula}
                      </div>
                      <div className="mt-2 flex gap-2">
                        {formula.indices.map(idx => (
                          <Badge key={idx} variant="secondary">{idx}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Indices économiques */}
          <TabsContent value="indices" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Indices économiques (sources officielles)</CardTitle>
                <Button onClick={() => refreshIndicesMutation.mutate()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Dernière valeur</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">ICHT</TableCell>
                      <TableCell>Indice du coût horaire du travail</TableCell>
                      <TableCell>117.8</TableCell>
                      <TableCell>01/09/2024</TableCell>
                      <TableCell>INSEE</TableCell>
                      <TableCell>
                        <Badge variant="success">Définitive</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">FMOA</TableCell>
                      <TableCell>Frais et services divers</TableCell>
                      <TableCell>94.32</TableCell>
                      <TableCell>01/09/2024</TableCell>
                      <TableCell>INSEE</TableCell>
                      <TableCell>
                        <Badge variant="success">Définitive</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">CPI</TableCell>
                      <TableCell>Consumer Price Index</TableCell>
                      <TableCell>108.5</TableCell>
                      <TableCell>01/09/2024</TableCell>
                      <TableCell>Eurostat</TableCell>
                      <TableCell>
                        <Badge variant="warning">Provisoire</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ILC</TableCell>
                      <TableCell>Indice des loyers commerciaux</TableCell>
                      <TableCell>128.7</TableCell>
                      <TableCell>Q2 2024</TableCell>
                      <TableCell>INSEE</TableCell>
                      <TableCell>
                        <Badge variant="success">Définitive</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Journal de récupération */}
            <Card>
              <CardHeader>
                <CardTitle>Journal de récupération automatique</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertTitle>Dernière synchronisation réussie</AlertTitle>
                    <AlertDescription>
                      Tous les indices ont été récupérés avec succès le {new Date().toLocaleString("fr-FR")}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rapports */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rapports d'indexation générés</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Date génération</TableHead>
                      <TableHead>Variation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indexations?.filter((i: Indexation) => i.status === "validated")
                      .map((report: Indexation) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.contractNumber}</p>
                            <p className="text-sm text-gray-500">{report.contractTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(report.indexationDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          {new Date().toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <span className={report.variation > 0 ? "text-green-600" : "text-red-600"}>
                            {report.variation > 0 ? "+" : ""}{report.variation.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">Validé</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              XLS
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}