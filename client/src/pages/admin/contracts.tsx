import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Search, FileText, Plus, Eye, Edit2, RefreshCw,
  Calendar, Building2, TrendingUp, FileUp, AlertCircle,
  ChevronRight, Filter, Save, X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ContractFormData {
  title: string;
  type: string;
  technology?: string;
  supplier?: string;
  turbineCount?: number;
  pricePerMWh?: number;
  status: string;
  startDate: string;
  endDate: string;
  fixedAmount: number;
  variableAmount?: number;
  periodicity: string;
  paymentType: string;
  indexationFormula: string;
  indexationDate?: string;
  indexOriginDate?: string;
  indexOriginValue?: string;
  indexRevisionDate?: string;
  tariffChanges?: Array<{
    date: string;
    amount: number;
    vatRate: string;
  }>;
}

export default function AdminContracts() {
  const [activeView, setActiveView] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [buFilter, setBuFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [showContractForm, setShowContractForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractType, setContractType] = useState<string>("");
  const [formData, setFormData] = useState<Partial<ContractFormData>>({});
  const [tariffChanges, setTariffChanges] = useState<Array<any>>([]);
  const { toast } = useToast();

  // Données réelles des contrats selon les spécifications
  const contracts = [
    {
      id: 1,
      number: "AUX89",
      title: "PARC AUXERROIS",
      type: "OMSA",
      status: "active",
      periodicity: "Trimestrielle",
      startDate: "01/01/2024",
      endDate: "31/12/2026",
      nextDeadline: "Indexation",
      daysRemaining: "J-236", // 24/09/2024
      responsible: "Marie Dupont",
      technology: "Éolien",
      indexationFormula: "P = P₀ × (ICHTREV / ICHT₀)",
      initialAmount: 128000,
      icht0: 115.7
    },
    {
      id: 2,
      number: "FIG83",
      title: "PARC FIGANIÈRES",
      type: "LTSA",
      status: "pending_validation",
      periodicity: "Mensuelle",
      startDate: "01/09/2023",
      endDate: "31/08/2028",
      nextDeadline: "Indexation",
      daysRemaining: "J-218", // 01/09/2024
      responsible: "Jean Martin",
      technology: "Photovoltaïque",
      mainteneur: "Bouygues",
      indexationFormula: "P = P₀ × (0,15 + 0,55 × (ICHTREV / ICHT₀) + 0,3 × (FMOAREV / FMOA₀))",
      initialAmount: 437000,
      icht0: 113.4,
      fmoa0: 91.57
    },
    {
      id: 3,
      number: "SCM29",
      title: "PARC SCAER LE MERDY",
      type: "OMGC",
      status: "active",
      periodicity: "Trimestrielle",
      startDate: "01/03/2022",
      endDate: "28/02/2027",
      nextDeadline: "Indexation",
      daysRemaining: "J-218", // 01/09/2024
      responsible: "Sophie Laurent",
      technology: "Éolien",
      mainteneur: "Vestas",
      indexationFormula: "P = P₋₁ × (1 + CPI)",
      previousAmount: 52919.20,
      threshold: "2%"
    },
    {
      id: 4,
      number: "GLB04",
      title: "PARC GRÉOUX 1",
      type: "Bail",
      status: "active",
      periodicity: "Annuelle",
      startDate: "01/01/2023",
      endDate: "31/12/2043",
      nextDeadline: "Paiement",
      daysRemaining: "J-1", // 01/01/2024
      responsible: "Pierre Durand",
      indexationFormula: "P = P₀ × (0,15 + 0,55 × (ICHTREV / ICHT₀) + 0,3 × (FMOAREV / FMOA₀))",
      initialAmount: 141480,
      icht0: 128.2,
      fmoa0: 97.93,
      cap: "2%"
    }
  ];

  const submenuItems = [
    { label: "Liste", value: "list", active: activeView === "list" },
    { label: "Fiche contrat", value: "details", active: activeView === "details" },
    { label: "Paramètres types", value: "types", active: activeView === "types" },
    { label: "Workflows & droits", value: "workflows", active: activeView === "workflows" }
  ];

  const handleContractTypeChange = (type: string) => {
    setContractType(type);
    setFormData({ ...formData, type });
    
    // Réinitialiser les champs de changements tarifaires pour LTSA/OMGC
    if (type === "LTSA" || type === "OMGC") {
      setFormData({ ...formData, type, supplier: "Contrat d'achat" });
      setTariffChanges([{ date: "", amount: 0, vatRate: "20" }]);
    }
  };

  const addTariffChange = () => {
    setTariffChanges([...tariffChanges, { date: "", amount: 0, vatRate: "20" }]);
  };

  const updateTariffChange = (index: number, field: string, value: any) => {
    const updated = [...tariffChanges];
    updated[index] = { ...updated[index], [field]: value };
    setTariffChanges(updated);
  };

  const removeTariffChange = (index: number) => {
    setTariffChanges(tariffChanges.filter((_, i) => i !== index));
  };

  const handleOpenContract = (contract: any) => {
    setSelectedContract(contract);
    setActiveView("details");
  };

  return (
    <AdminLayout 
      title="Contrats (Admin)"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {activeView === "list" && (
          <>
            {/* Barre de filtres */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    <Label>Statut</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="pending_validation">En validation</SelectItem>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="terminated">Résilié</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>BU/Entité</Label>
                    <Select value={buFilter} onValueChange={setBuFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les BU" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les BU</SelectItem>
                        <SelectItem value="engie-solutions">ENGIE Solutions France</SelectItem>
                        <SelectItem value="engie-green">ENGIE Green</SelectItem>
                        <SelectItem value="engie-gem">ENGIE Global Energy Management</SelectItem>
                        <SelectItem value="engie-flex">ENGIE Flex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Période</Label>
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les périodes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les périodes</SelectItem>
                        <SelectItem value="current_year">Année en cours</SelectItem>
                        <SelectItem value="last_year">Année précédente</SelectItem>
                        <SelectItem value="next_year">Année prochaine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Recherche plein texte</Label>
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
                    setStatusFilter("");
                    setBuFilter("");
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

            {/* Tableau des contrats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Liste des contrats</CardTitle>
                <Button onClick={() => setShowContractForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau contrat
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°/Intitulé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead>Date début</TableHead>
                      <TableHead>Date fin</TableHead>
                      <TableHead>Prochaine échéance</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{contract.number}</div>
                            <div className="text-sm text-muted-foreground">{contract.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{contract.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={contract.status === "active" ? "default" : "secondary"}
                          >
                            {contract.status === "active" ? "Actif" : 
                             contract.status === "pending_validation" ? "En validation" : contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{contract.periodicity}</TableCell>
                        <TableCell>{contract.startDate}</TableCell>
                        <TableCell>{contract.endDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{contract.nextDeadline}</span>
                            <Badge 
                              variant={contract.daysRemaining.includes("7") || contract.daysRemaining.includes("1") ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {contract.daysRemaining}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{contract.responsible}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenContract(contract)}
                          >
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

        {activeView === "details" && selectedContract && (
          <ContractDetails contract={selectedContract} />
        )}

        {activeView === "types" && (
          <ParametresTypes />
        )}

        {activeView === "workflows" && (
          <WorkflowsAndRights />
        )}
      </div>

      {/* Dialog de création de contrat */}
      <Dialog open={showContractForm} onOpenChange={setShowContractForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
            <DialogDescription>
              Créez un nouveau contrat avec toutes les informations nécessaires
            </DialogDescription>
          </DialogHeader>
          <ContractForm 
            contractType={contractType}
            formData={formData}
            tariffChanges={tariffChanges}
            onTypeChange={handleContractTypeChange}
            onFormDataChange={setFormData}
            onAddTariffChange={addTariffChange}
            onUpdateTariffChange={updateTariffChange}
            onRemoveTariffChange={removeTariffChange}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractForm(false)}>
              Annuler
            </Button>
            <Button onClick={() => {
              toast({
                title: "Contrat créé",
                description: "Le contrat a été créé avec succès et envoyé en validation."
              });
              setShowContractForm(false);
            }}>
              Créer et soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Composant pour le formulaire de contrat
function ContractForm({ 
  contractType, 
  formData, 
  tariffChanges, 
  onTypeChange, 
  onFormDataChange, 
  onAddTariffChange, 
  onUpdateTariffChange, 
  onRemoveTariffChange 
}: any) {
  return (
    <div className="space-y-4">
      {/* Type de contrat */}
      <div>
        <Label>Type de contrat <span className="text-red-500">*</span></Label>
        <Select value={contractType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OMSA">OMSA</SelectItem>
            <SelectItem value="LTSA">LTSA</SelectItem>
            <SelectItem value="OMGC">OMGC</SelectItem>
            <SelectItem value="Bail">Bail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {contractType && (
        <>
          {/* Champs communs */}
          <div>
            <Label>Titre (nom du contrat, nom SPV...) <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.title || ""} 
              onChange={(e) => onFormDataChange({...formData, title: e.target.value})}
              placeholder="Ex: PARC AUXERROIS"
            />
          </div>

          {/* Champs spécifiques OMSA */}
          {contractType === "OMSA" && (
            <>
              <div>
                <Label>Technologie <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.technology || ""} 
                  onValueChange={(value) => onFormDataChange({...formData, technology: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une technologie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eolien">Éolien</SelectItem>
                    <SelectItem value="pv">Photovoltaïque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nombre d'éoliennes ou prix initial par MWh</Label>
                <Input 
                  type="number" 
                  value={formData.turbineCount || ""} 
                  onChange={(e) => onFormDataChange({...formData, turbineCount: e.target.value})}
                />
              </div>
            </>
          )}

          {/* Champs spécifiques LTSA/OMGC */}
          {(contractType === "LTSA" || contractType === "OMGC") && (
            <>
              <div>
                <Label>Nom du mainteneur <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.supplier || ""} 
                  onChange={(e) => onFormDataChange({...formData, supplier: e.target.value})}
                  placeholder="Ex: Bouygues"
                />
              </div>
              <div>
                <Label>Technologie <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.technology || ""} 
                  onValueChange={(value) => onFormDataChange({...formData, technology: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une technologie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eolien">Éolien</SelectItem>
                    <SelectItem value="pv">Photovoltaïque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fournisseur</Label>
                <Input value="Contrat d'achat" disabled />
              </div>
              
              {/* Changements tarifaires */}
              <div>
                <Label>Changements tarifaires</Label>
                <div className="space-y-2">
                  {tariffChanges.map((change: any, index: number) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Date</Label>
                        <Input 
                          type="date" 
                          value={change.date}
                          onChange={(e) => onUpdateTariffChange(index, "date", e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Montant</Label>
                        <Input 
                          type="number" 
                          value={change.amount}
                          onChange={(e) => onUpdateTariffChange(index, "amount", e.target.value)}
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">TVA</Label>
                        <Select 
                          value={change.vatRate}
                          onValueChange={(value) => onUpdateTariffChange(index, "vatRate", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5.5">5,5%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onRemoveTariffChange(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onAddTariffChange}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un changement tarifaire
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Champs communs à tous sauf Bail */}
          {contractType !== "Bail" && (
            <>
              <div>
                <Label>Montant fixe <span className="text-red-500">*</span></Label>
                <Input 
                  type="number" 
                  value={formData.fixedAmount || ""} 
                  onChange={(e) => onFormDataChange({...formData, fixedAmount: e.target.value})}
                  placeholder="Ex: 128000"
                />
              </div>
              <div>
                <Label>Montant variable (si existant)</Label>
                <Input 
                  type="number" 
                  value={formData.variableAmount || ""} 
                  onChange={(e) => onFormDataChange({...formData, variableAmount: e.target.value})}
                  placeholder="0 si inexistant"
                />
              </div>
            </>
          )}

          {/* Champs communs à tous */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de début <span className="text-red-500">*</span></Label>
              <Input 
                type="date" 
                value={formData.startDate || ""} 
                onChange={(e) => onFormDataChange({...formData, startDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Date de fin <span className="text-red-500">*</span></Label>
              <Input 
                type="date" 
                value={formData.endDate || ""} 
                onChange={(e) => onFormDataChange({...formData, endDate: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Périodicité des factures <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.periodicity || ""} 
              onValueChange={(value) => onFormDataChange({...formData, periodicity: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une périodicité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensuelle">Mensuelle</SelectItem>
                <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                <SelectItem value="semestrielle">Semestrielle</SelectItem>
                <SelectItem value="annuelle">Annuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Formule d'indexation</Label>
            <Select 
              value={formData.indexationFormula || ""} 
              onValueChange={(value) => onFormDataChange({...formData, indexationFormula: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pas d'indexation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pas d'indexation</SelectItem>
                <SelectItem value="simple">Simple : P = P₀ × (ICHTREV / ICHT₀)</SelectItem>
                <SelectItem value="type2a">Type 2.A : Montant_n = Montant_0 × (0,15 + 0,55 × (ICHT_rev/ICHT_0) + 0,3 × (FMOA_rev/FMOA_0))</SelectItem>
                <SelectItem value="type2b">Type 2.B : Montant_n = Montant_n-1 × (0,15 + 0,55 × (ICHT_rev/ICHT_0) + 0,3 × (FMOA_rev/FMOA_0))</SelectItem>
                <SelectItem value="type3">Type 3 : Montant_n = Montant_0 × (1 + (CPI/CPI_0))</SelectItem>
                <SelectItem value="cpi_simple">CPI Simple : P = P₋₁ × (1 + CPI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Champs d'indexation si formule sélectionnée */}
          {formData.indexationFormula && formData.indexationFormula !== "none" && (
            <>
              <div>
                <Label>Date d'indexation</Label>
                <Input 
                  type="date" 
                  value={formData.indexationDate || ""} 
                  onChange={(e) => onFormDataChange({...formData, indexationDate: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de l'indice d'origine</Label>
                  <Input 
                    type="date" 
                    value={formData.indexOriginDate || ""} 
                    onChange={(e) => onFormDataChange({...formData, indexOriginDate: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">OU remplir la valeur ci-dessous</p>
                </div>
                <div>
                  <Label>Valeur de l'indice d'origine</Label>
                  <Input 
                    type="number" 
                    value={formData.indexOriginValue || ""} 
                    onChange={(e) => onFormDataChange({...formData, indexOriginValue: e.target.value})}
                    placeholder="Ex: 115.7 pour ICHT₀"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Un seul champ requis</p>
                </div>
              </div>
              <div>
                <Label>Date de révision de l'indice</Label>
                <Input 
                  type="date" 
                  value={formData.indexRevisionDate || ""} 
                  onChange={(e) => onFormDataChange({...formData, indexRevisionDate: e.target.value})}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Composant pour les détails du contrat
function ContractDetails({ contract }: any) {
  const [activeTab, setActiveTab] = useState("amounts");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche contrat - {contract.number} {contract.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="amounts">Montants & facturation</TabsTrigger>
            <TabsTrigger value="indexation">Indexation</TabsTrigger>
            <TabsTrigger value="clauses">Clauses/avenants</TabsTrigger>
            <TabsTrigger value="deadlines">Échéances & alertes</TabsTrigger>
            <TabsTrigger value="attachments">Pièces jointes (GED)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="amounts" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant initial fixe</Label>
                <Input value={contract?.initialAmount ? `${contract.initialAmount.toLocaleString()} €` : "0 €"} disabled />
              </div>
              <div>
                <Label>Montant variable</Label>
                <Input value="0 €" disabled />
              </div>
              <div>
                <Label>Périodicité</Label>
                <Input value={contract?.periodicity || "Trimestrielle"} disabled />
              </div>
              <div>
                <Label>Plan de facturation</Label>
                <div className="flex items-center gap-2">
                  <Input value="Non validé" disabled />
                  <Badge variant="secondary">Récupéré automatiquement</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="indexation" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Formule d'indexation</Label>
                <Input value={contract?.indexationFormula || "P = P₀ × (ICHTREV / ICHT₀)"} disabled />
              </div>
              
              {/* Indices ICHT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Indice d'origine (ICHT₀)</Label>
                  <div className="flex gap-2">
                    <Input type="date" value="2024-01-01" disabled />
                    <Input value={contract?.icht0 || "115.7"} disabled />
                  </div>
                </div>
                <div>
                  <Label>Indice de révision (ICHTREV)</Label>
                  <div className="flex gap-2">
                    <Input type="date" value="2024-09-24" disabled />
                    <Input value="118.2" disabled />
                  </div>
                </div>
              </div>
              
              {/* Indices FMOA si applicable */}
              {contract?.fmoa0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Indice FMOA₀</Label>
                    <Input value={contract.fmoa0} disabled />
                  </div>
                  <div>
                    <Label>Indice FMOAREV</Label>
                    <Input value="94.3" disabled />
                  </div>
                </div>
              )}
              
              {/* Montants et calcul */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valeur d'origine (P₀)</Label>
                  <Input value={contract?.initialAmount ? `${contract.initialAmount.toLocaleString()} €` : "128 000 €"} disabled />
                </div>
                <div>
                  <Label>Valeur N (calculée)</Label>
                  <Input value="130 775 €" disabled />
                </div>
              </div>
              
              {/* CAP et Seuil si applicable */}
              {(contract?.cap || contract?.threshold) && (
                <div className="grid grid-cols-2 gap-4">
                  {contract?.cap && (
                    <div>
                      <Label>Plafonnement (CAP)</Label>
                      <Input value={contract.cap} disabled />
                    </div>
                  )}
                  {contract?.threshold && (
                    <div>
                      <Label>Seuil de déclenchement</Label>
                      <Input value={contract.threshold} disabled />
                    </div>
                  )}
                </div>
              )}
              
              {/* Résultat du calcul */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold">Calcul d'indexation:</p>
                <p className="text-sm mt-2 font-mono">{contract?.indexationFormula || "P = P₀ × (ICHTREV / ICHT₀)"}</p>
                <p className="text-sm mt-2">
                  = {contract?.initialAmount?.toLocaleString() || "128 000"} € × (118.2 / {contract?.icht0 || "115.7"}) = 130 775 €
                </p>
                <p className="text-sm mt-1 text-green-600">Variation: +2.17%</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="clauses" className="space-y-4">
            <div className="space-y-2">
              <Label>Avenants et modifications</Label>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Aucun avenant pour ce contrat</p>
              </div>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un avenant
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="deadlines" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Type d'échéance : {contract.nextDeadline}</p>
                  <p className="text-sm text-muted-foreground">Échéance dans : {contract.daysRemaining}</p>
                </div>
                <Badge variant={contract.daysRemaining.includes("7") ? "destructive" : "secondary"}>
                  {contract.daysRemaining}
                </Badge>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="attachments" className="space-y-4">
            <div className="space-y-2">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucune pièce jointe pour ce contrat
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Les pièces jointes ne sont pas obligatoires
                </p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-6 gap-2">
          <Button variant="outline">Annuler</Button>
          <Button>Soumettre à validation</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour les paramètres des types de contrat
function ParametresTypes() {
  const contractTypes = [
    { type: "OMSA", fields: ["Titre", "Technologie", "Nombre d'éoliennes", "Montants", "Périodicité", "Indexation"] },
    { type: "LTSA", fields: ["Titre", "Mainteneur", "Technologie", "Fournisseur", "Montants", "Changements tarifaires"] },
    { type: "OMGC", fields: ["Titre", "Mainteneur", "Technologie", "Fournisseur", "Montants", "Changements tarifaires"] },
    { type: "Bail", fields: ["Titre", "Périodicité", "Indexation", "Date début/fin"] }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres des types de contrat</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contractTypes.map((type) => (
            <div key={type.type} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{type.type}</h3>
              <div className="text-sm text-muted-foreground">
                Champs visibles : {type.fields.join(", ")}
              </div>
              <Button size="sm" variant="outline" className="mt-2">
                Configurer
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour les workflows et droits
function WorkflowsAndRights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflows & droits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Règles de validation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aucun contrat ne peut être actif sans validation. Le motif de rejet est obligatoire. 
                Les rôles sont séparés entre créateur et valideur.
              </p>
            </div>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Créateurs</h4>
              <ul className="text-sm space-y-1">
                <li>• Service Achats</li>
                <li>• Service Baux</li>
                <li>• Gestionnaires contrats</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Valideurs</h4>
              <ul className="text-sm space-y-1">
                <li>• Responsables BU</li>
                <li>• Direction juridique</li>
                <li>• Direction financière</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}