import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Edit3, CheckCircle, XCircle, Search, Save, X,
  Plus, Eye, Clock, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminAmendments() {
  const [activeView, setActiveView] = useState("to_validate");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [buFilter, setBuFilter] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedAmendment, setSelectedAmendment] = useState<any>(null);
  const [validationDecision, setValidationDecision] = useState<"validate" | "reject" | "">("");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const submenuItems = [
    { label: "À valider", value: "to_validate", active: activeView === "to_validate" },
    { label: "Historique", value: "history", active: activeView === "history" },
    { label: "Paramètres", value: "settings", active: activeView === "settings" }
  ];

  // Données simulées pour les avenants
  const amendments = [
    {
      id: 1,
      contract: "AUX89 - PARC AUXERROIS",
      type: "Montant",
      oldValue: "128 000 €",
      newValue: "130 000 €",
      vatRate: "20%",
      status: "to_validate",
      requestDate: "25/01/2025",
      requestedBy: "Jean Martin"
    },
    {
      id: 2,
      contract: "FIG83 - PARC FIGANIÈRES",
      type: "Périodicité",
      oldValue: "Mensuelle",
      newValue: "Trimestrielle",
      vatRate: null,
      status: "to_validate",
      requestDate: "24/01/2025",
      requestedBy: "Sophie Laurent"
    },
    {
      id: 3,
      contract: "SCM29 - PARC SCAER LE MERDY",
      type: "Date d'indexation",
      oldValue: "01/09/2024",
      newValue: "01/01/2025",
      vatRate: null,
      status: "validated",
      requestDate: "20/01/2025",
      requestedBy: "Marie Dupont",
      validatedBy: "Pierre Durand",
      validationDate: "21/01/2025"
    },
    {
      id: 4,
      contract: "GLB04 - PARC GRÉOUX 1",
      type: "Clause",
      oldValue: "Révision annuelle",
      newValue: "Révision semestrielle",
      vatRate: null,
      status: "rejected",
      requestDate: "19/01/2025",
      requestedBy: "Jean Martin",
      rejectedBy: "Sophie Laurent",
      rejectionDate: "20/01/2025",
      rejectionReason: "Impact financier non évalué"
    }
  ];

  const handleValidate = (amendment: any) => {
    setSelectedAmendment(amendment);
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
      title: validationDecision === "validate" ? "Avenant validé" : "Avenant rejeté",
      description: `L'avenant du contrat ${selectedAmendment.contract} a été ${validationDecision === "validate" ? "validé" : "rejeté"}.`
    });
    
    setShowValidationModal(false);
    setValidationDecision("");
    setRejectionReason("");
  };

  return (
    <AdminLayout 
      title="Avenants (Admin)"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {activeView === "to_validate" && (
          <>
            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>Type de modification</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="montant">Montant</SelectItem>
                        <SelectItem value="clause">Clause</SelectItem>
                        <SelectItem value="duree">Durée</SelectItem>
                        <SelectItem value="periodicite">Périodicité</SelectItem>
                        <SelectItem value="indexation">Date d'indexation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Contrat</Label>
                    <Select value={contractFilter} onValueChange={setContractFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les contrats" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les contrats</SelectItem>
                        <SelectItem value="AUX89">AUX89 - PARC AUXERROIS</SelectItem>
                        <SelectItem value="FIG83">FIG83 - PARC FIGANIÈRES</SelectItem>
                        <SelectItem value="SCM29">SCM29 - PARC SCAER</SelectItem>
                        <SelectItem value="GLB04">GLB04 - PARC GRÉOUX</SelectItem>
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
                        <SelectItem value="today">Aujourd'hui</SelectItem>
                        <SelectItem value="week">Cette semaine</SelectItem>
                        <SelectItem value="month">Ce mois</SelectItem>
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
                    setContractFilter("");
                    setPeriodFilter("");
                    setBuFilter("");
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

            {/* Tableau des avenants à valider */}
            <Card>
              <CardHeader>
                <CardTitle>Avenants à valider</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Type modif</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Demandé le</TableHead>
                      <TableHead>Par</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {amendments
                      .filter(a => a.status === "to_validate")
                      .map((amendment) => (
                      <TableRow key={amendment.id}>
                        <TableCell>{amendment.contract}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{amendment.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-muted-foreground line-through text-sm">
                              {amendment.oldValue}
                            </div>
                            <div className="font-medium">{amendment.newValue}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {amendment.vatRate && (
                            <Badge variant="secondary">{amendment.vatRate}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{amendment.requestDate}</TableCell>
                        <TableCell>{amendment.requestedBy}</TableCell>
                        <TableCell>
                          <Badge variant="warning">À valider</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleValidate(amendment)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
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
              <CardTitle>Historique des avenants</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Modification</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Traité par</TableHead>
                    <TableHead>Motif (si rejet)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amendments
                    .filter(a => a.status === "validated" || a.status === "rejected")
                    .map((amendment) => (
                    <TableRow key={amendment.id}>
                      <TableCell>
                        {amendment.validationDate || amendment.rejectionDate}
                      </TableCell>
                      <TableCell>{amendment.contract}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{amendment.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-muted-foreground line-through text-sm">
                            {amendment.oldValue}
                          </div>
                          <div className="font-medium">{amendment.newValue}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={amendment.status === "validated" ? "default" : "destructive"}>
                          {amendment.status === "validated" ? "Validé" : "Rejeté"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {amendment.validatedBy || amendment.rejectedBy}
                      </TableCell>
                      <TableCell>
                        {amendment.rejectionReason && (
                          <span className="text-sm text-muted-foreground">
                            {amendment.rejectionReason}
                          </span>
                        )}
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
              <CardTitle>Paramètres des avenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Types de modifications autorisées</h3>
                  <div className="space-y-2">
                    {["Montant", "Clause", "Durée", "Périodicité de facturation", "Terme de facturation", "Date d'indexation"].map((type) => (
                      <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                        <span>{type}</span>
                        <Badge variant="default">Activé</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Règles de validation</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Possibilité de modifier plusieurs clauses en même temps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Affichage de l'ancienne valeur grisée et de la nouvelle</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Pour les avenants de montants, affichage du taux de TVA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Motif de rejet obligatoire</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de validation */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation de l'avenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAmendment && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{selectedAmendment.contract}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Type : {selectedAmendment.type}
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground line-through">
                    Ancienne valeur : {selectedAmendment.oldValue}
                  </p>
                  <p className="text-sm font-medium">
                    Nouvelle valeur : {selectedAmendment.newValue}
                  </p>
                </div>
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
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Motif obligatoire"
                  rows={3}
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