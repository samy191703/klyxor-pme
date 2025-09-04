import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  FolderOpen, FileText, Upload, Download, Eye, 
  Trash2, Clock, Search, Filter, Save, X,
  Plus, Info, File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDocuments() {
  const [activeView, setActiveView] = useState("ged");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const submenuItems = [
    { label: "GED par contrat", value: "ged", active: activeView === "ged" },
    { label: "Historique documents", value: "history", active: activeView === "history" }
  ];

  // Données simulées pour les documents
  const documents = [
    {
      id: 1,
      contract: "AUX89 - PARC AUXERROIS",
      name: "Contrat_AUX89_signe.pdf",
      type: "Contrat",
      size: "2.4 MB",
      uploadDate: "15/01/2024",
      uploadedBy: "Marie Dupont",
      version: 1
    },
    {
      id: 2,
      contract: "AUX89 - PARC AUXERROIS",
      name: "Avenant_01_AUX89.pdf",
      type: "Avenant",
      size: "856 KB",
      uploadDate: "20/06/2024",
      uploadedBy: "Jean Martin",
      version: 1
    },
    {
      id: 3,
      contract: "FIG83 - PARC FIGANIÈRES",
      name: "Contrat_FIG83_signe.pdf",
      type: "Contrat",
      size: "3.1 MB",
      uploadDate: "01/09/2023",
      uploadedBy: "Sophie Laurent",
      version: 2
    },
    {
      id: 4,
      contract: "FIG83 - PARC FIGANIÈRES",
      name: "Rapport_indexation_FIG83_2024.xlsx",
      type: "Rapport",
      size: "124 KB",
      uploadDate: "01/09/2024",
      uploadedBy: "System",
      version: 1
    }
  ];

  const documentHistory = [
    {
      id: 1,
      action: "Upload",
      document: "Contrat_AUX89_signe.pdf",
      contract: "AUX89",
      user: "Marie Dupont",
      date: "15/01/2024 09:30",
      details: "Version initiale"
    },
    {
      id: 2,
      action: "Modification",
      document: "Contrat_FIG83_signe.pdf",
      contract: "FIG83",
      user: "Sophie Laurent",
      date: "10/01/2024 14:15",
      details: "Mise à jour v2"
    },
    {
      id: 3,
      action: "Téléchargement",
      document: "Avenant_01_AUX89.pdf",
      contract: "AUX89",
      user: "Pierre Durand",
      date: "25/01/2025 11:00",
      details: "Export pour validation"
    }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedContract) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un contrat.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Document ajouté",
      description: `Le document ${selectedFile.name} a été ajouté au contrat ${selectedContract}.`
    });
    
    setShowUploadModal(false);
    setSelectedContract("");
    setSelectedFile(null);
  };

  return (
    <AdminLayout 
      title="Documents & GED (Admin)"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {activeView === "ged" && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Les pièces jointes ne sont pas obligatoires à la validation. 
                Elles peuvent être récupérées automatiquement depuis un système tiers.
              </AlertDescription>
            </Alert>

            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <Label>Type de document</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="contrat">Contrat</SelectItem>
                        <SelectItem value="avenant">Avenant</SelectItem>
                        <SelectItem value="rapport">Rapport</SelectItem>
                        <SelectItem value="facture">Facture</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
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
                        <SelectItem value="year">Cette année</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Recherche</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nom du document..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setContractFilter("");
                    setTypeFilter("");
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

            {/* Liste des documents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>GED par contrat</CardTitle>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Nom du document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Date d'ajout</TableHead>
                      <TableHead>Ajouté par</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.contract}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{doc.size}</TableCell>
                        <TableCell>{doc.uploadDate}</TableCell>
                        <TableCell>{doc.uploadedBy}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">v{doc.version}</Badge>
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
          </>
        )}

        {activeView === "history" && (
          <Card>
            <CardHeader>
              <CardTitle>Historique des documents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            entry.action === "Upload" ? "default" :
                            entry.action === "Modification" ? "secondary" :
                            "outline"
                          }
                        >
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.document}</TableCell>
                      <TableCell>{entry.contract}</TableCell>
                      <TableCell>{entry.user}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal d'upload */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>
              Téléchargez un document et associez-le à un contrat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sélectionner le contrat <span className="text-red-500">*</span></Label>
              <Select value={selectedContract} onValueChange={setSelectedContract}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un contrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUX89">AUX89 - PARC AUXERROIS</SelectItem>
                  <SelectItem value="FIG83">FIG83 - PARC FIGANIÈRES</SelectItem>
                  <SelectItem value="SCM29">SCM29 - PARC SCAER LE MERDY</SelectItem>
                  <SelectItem value="GLB04">GLB04 - PARC GRÉOUX 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fichier à déposer</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Fichier sélectionné : {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Les pièces jointes ne sont pas obligatoires pour la validation du contrat.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUploadModal(false);
              setSelectedContract("");
              setSelectedFile(null);
            }}>
              Annuler
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Déposer le document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}