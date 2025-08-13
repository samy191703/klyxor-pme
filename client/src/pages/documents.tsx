import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, Upload, Download, Trash2, AlertCircle, Eye, FileImage,
  FileSpreadsheet, File, X, ZoomIn, ZoomOut, Maximize2
} from "lucide-react";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [uploadForm, setUploadForm] = useState({
    type: "",
    label: "",
    description: "",
    file: null as File | null
  });

  // Mock data for documents (GD-1)
  const documents = [
    {
      id: "doc-1",
      fileName: "contrat_signe_2024_001.pdf",
      type: "Contrat",
      format: "PDF",
      contractNumber: "CNT-2024-001",
      contractTitle: "Services informatiques",
      uploadDate: new Date("2024-01-15T10:30:00"),
      uploadedBy: "Marie Martin",
      size: "2.5 MB",
      status: "ok",
      mandatory: true
    },
    {
      id: "doc-2",
      fileName: "avenant_modification_2024.docx",
      type: "Avenant",
      format: "DOCX",
      contractNumber: "CNT-2024-001",
      contractTitle: "Services informatiques",
      uploadDate: new Date("2024-01-20T14:15:00"),
      uploadedBy: "Pierre Durand",
      size: "1.2 MB",
      status: "ok",
      mandatory: false
    },
    {
      id: "doc-3",
      fileName: "justificatif_assurance.pdf",
      type: "Justificatif",
      format: "PDF",
      contractNumber: "CNT-2024-002",
      contractTitle: "Maintenance équipements",
      uploadDate: new Date("2024-02-01T09:00:00"),
      uploadedBy: "Sophie Laurent",
      size: "856 KB",
      status: "ok",
      mandatory: true
    },
    {
      id: "doc-4",
      fileName: "tableau_indexation.xlsx",
      type: "Annexe",
      format: "XLSX",
      contractNumber: "CNT-2024-003",
      contractTitle: "Location bureaux",
      uploadDate: new Date("2024-02-05T11:30:00"),
      uploadedBy: "Jean Dupont",
      size: "3.1 MB",
      status: "ok",
      mandatory: false
    }
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    const matchesFormat = formatFilter === "all" || doc.format === formatFilter;
    const matchesAuthor = authorFilter === "all" || doc.uploadedBy === authorFilter;
    return matchesSearch && matchesType && matchesFormat && matchesAuthor;
  });

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFileIcon = (format: string) => {
    switch (format) {
      case "PDF":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "DOCX":
      case "ODT":
        return <File className="w-4 h-4 text-blue-500" />;
      case "XLSX":
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case "JPG":
      case "PNG":
        return <FileImage className="w-4 h-4 text-purple-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleAddDocument = () => {
    // Logique d'upload et de traçabilité
    console.log("Document ajouté:", uploadForm);
    setShowAddModal(false);
    setUploadForm({ type: "", label: "", description: "", file: null });
  };

  const handleShowDetails = (doc: any) => {
    setSelectedDocument(doc);
    setShowDetailsPanel(true);
  };

  const handlePreview = (doc: any) => {
    setSelectedDocument(doc);
    setShowPreview(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedFormats = ['pdf', 'docx', 'xlsx', 'odt', 'jpg', 'png'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt && !allowedFormats.includes(fileExt)) {
        alert("Format non autorisé. Formats acceptés: PDF, DOCX, XLSX, ODT, JPG, PNG");
        return;
      }
      
      setUploadForm({ ...uploadForm, file });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Gestion documentaire (GED)</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="documents-main">
          <div className="max-w-7xl mx-auto">
            {/* GD-1: En-tête de page */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            </div>

            {/* GD-1: Barre d'outils */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <Input
                      placeholder="Rechercher un document (par nom de fichier)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 min-w-[300px]"
                      data-testid="input-search-documents"
                    />
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-type-doc">
                        <SelectValue placeholder="Type de document" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="Contrat">Contrat</SelectItem>
                        <SelectItem value="Avenant">Avenant</SelectItem>
                        <SelectItem value="Justificatif">Justificatif</SelectItem>
                        <SelectItem value="Annexe">Annexe</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={formatFilter} onValueChange={setFormatFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-format">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous formats</SelectItem>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="DOCX">DOCX</SelectItem>
                        <SelectItem value="XLSX">XLSX</SelectItem>
                        <SelectItem value="ODT">ODT</SelectItem>
                        <SelectItem value="JPG">JPG</SelectItem>
                        <SelectItem value="PNG">PNG</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={authorFilter} onValueChange={setAuthorFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-author">
                        <SelectValue placeholder="Auteur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les auteurs</SelectItem>
                        <SelectItem value="Marie Martin">Marie Martin</SelectItem>
                        <SelectItem value="Pierre Durand">Pierre Durand</SelectItem>
                        <SelectItem value="Sophie Laurent">Sophie Laurent</SelectItem>
                        <SelectItem value="Jean Dupont">Jean Dupont</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      variant="default" 
                      onClick={() => setShowAddModal(true)}
                      data-testid="button-add-document"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Ajouter un document
                    </Button>
                  </div>

                  {/* Rappels UI */}
                  <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                    <span className="font-medium">Formats autorisés :</span> PDF, DOCX, XLSX, ODT, JPG, PNG
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GD-1: Zone liste (table) */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Nom du fichier</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contrat</TableHead>
                        <TableHead>Ajouté le</TableHead>
                        <TableHead>Ajouté par</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Aucun document ne correspond aux filtres
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow 
                            key={doc.id} 
                            data-testid={`row-document-${doc.id}`}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleShowDetails(doc)}
                          >
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getFileIcon(doc.format)}
                                <span className="font-medium">{doc.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{doc.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{doc.contractNumber}</div>
                                <div className="text-sm text-gray-500">{doc.contractTitle}</div>
                              </div>
                            </TableCell>
                            <TableCell>{formatDateTime(doc.uploadDate)}</TableCell>
                            <TableCell>{doc.uploadedBy}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreview(doc);
                                  }}
                                  data-testid={`button-preview-${doc.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-${doc.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pied de liste */}
                <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Affichage 1-{filteredDocuments.length} sur {filteredDocuments.length} documents
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Afficher:</span>
                    <Select defaultValue="25">
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GD-3: Modale "Ajouter un document" */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-type" className="required">
                      Type de document <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={uploadForm.type} 
                      onValueChange={(value) => setUploadForm({...uploadForm, type: value})}
                    >
                      <SelectTrigger id="doc-type">
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contrat">Contrat</SelectItem>
                        <SelectItem value="Avenant">Avenant</SelectItem>
                        <SelectItem value="Justificatif">Justificatif</SelectItem>
                        <SelectItem value="Annexe">Annexe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Fichier</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.odt,.jpg,.png"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Glisser-déposer ou <span className="text-primary font-medium">parcourir</span>
                        </p>
                        {uploadForm.file && (
                          <p className="mt-2 text-sm text-green-600">
                            Fichier sélectionné: {uploadForm.file.name}
                          </p>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Formats acceptés: PDF, DOCX, XLSX, ODT, JPG, PNG
                    </p>
                    <p className="text-xs text-gray-500">
                      Le fichier sera horodaté et non modifiable après upload. Suppression réservée à l'admin.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-label">Libellé (facultatif)</Label>
                    <Input
                      id="doc-label"
                      value={uploadForm.label}
                      onChange={(e) => setUploadForm({...uploadForm, label: e.target.value})}
                      placeholder="Libellé court du document"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-description">Description (facultatif)</Label>
                    <Textarea
                      id="doc-description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                      placeholder="Description détaillée du document"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddDocument} disabled={!uploadForm.type || !uploadForm.file}>
                    Téléverser
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* GD-4: Panneau latéral "Détails du document" */}
            <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
              <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[540px] lg:max-w-[600px] overflow-y-auto">
                {selectedDocument && (
                  <>
                    <SheetHeader>
                      <SheetTitle>
                        <div className="flex items-center space-x-2">
                          {getFileIcon(selectedDocument.format)}
                          <span>{selectedDocument.fileName}</span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Type</h3>
                        <p className="text-sm">{selectedDocument.type}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Contrat lié</h3>
                        <p className="text-sm">
                          {selectedDocument.contractNumber} - {selectedDocument.contractTitle}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Ajouté le</h3>
                        <p className="text-sm">{formatDateTime(selectedDocument.uploadDate)}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Ajouté par</h3>
                        <p className="text-sm">{selectedDocument.uploadedBy}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Button variant="link" className="p-0 h-auto text-primary">
                          Voir l'historique des actions du document/contrat
                        </Button>
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Accès selon rôle ; opérations tracées.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button onClick={() => handlePreview(selectedDocument)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Prévisualiser
                        </Button>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </Button>
                        <Button variant="destructive" className="ml-auto">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>

            {/* GD-5: Prévisualisation du document */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="w-[95vw] max-w-4xl h-[80vh] overflow-y-auto">
                {selectedDocument && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center justify-between">
                        <span>Aperçu: {selectedDocument.fileName}</span>
                        <div className="flex items-center space-x-2">
                          {(selectedDocument.format === "PDF" || selectedDocument.format === "JPG" || selectedDocument.format === "PNG") && (
                            <>
                              <Button variant="ghost" size="sm">
                                <ZoomOut className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <ZoomIn className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Maximize2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-auto mt-4">
                      {(selectedDocument.format === "PDF" || selectedDocument.format === "JPG" || selectedDocument.format === "PNG") ? (
                        <div className="bg-gray-100 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                          <div className="text-center">
                            {getFileIcon(selectedDocument.format)}
                            <p className="mt-4 text-gray-600">Aperçu du document</p>
                            <p className="text-sm text-gray-500 mt-2">
                              [Viewer PDF/Image intégré ici]
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 mb-4">
                            Aperçu non disponible pour les fichiers {selectedDocument.format}
                          </p>
                          <Button>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger pour ouvrir dans votre application
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                      <span className="font-medium">Type:</span> {selectedDocument.type} | 
                      <span className="font-medium ml-2">Contrat lié:</span> {selectedDocument.contractNumber} | 
                      <span className="font-medium ml-2">Date d'ajout:</span> {formatDateTime(selectedDocument.uploadDate)}
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}