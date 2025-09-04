import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, Upload, Download, Trash2, AlertCircle, Eye, FileImage,
  FileSpreadsheet, File, X, ZoomIn, ZoomOut, Maximize2, Edit
} from "lucide-react";
import { ConfirmModal } from "@/components/common/confirm-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types pour les documents et contrats
interface Document {
  id: string;
  file_name?: string;
  document_type?: string;
  contract_id?: string;
  created_at: string;
  uploaded_by?: string;
  file_size?: string;
  status?: string;
  is_mandatory?: boolean;
}

interface Contract {
  id: string;
  contract_number?: string;
  contract_name?: string;
}

export default function Documents() {
  const { toast } = useToast();
  
  // Récupération des documents depuis l'API
  const { data: documentsData = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Récupération des utilisateurs pour les sélecteurs
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
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
    name: "",
    category: "administrative",
    contractId: "",
    description: "",
    file: null as File | null
  });
  
  // Nouveaux états pour les modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    type: "",
    label: "",
    description: "",
    contractNumber: "",
    mandatory: false
  });

  // Documents depuis les vraies données avec enrichissement
  const documents = documentsData.length > 0 ? documentsData.map((doc: Document) => {
    const contract = contracts.find((c: Contract) => c.id === doc.contract_id);
    const fileExt = doc.file_name ? doc.file_name.split('.').pop()?.toUpperCase() : 'PDF';
    
    return {
      id: doc.id,
      fileName: doc.file_name || `document_${doc.id.substring(0, 8)}.pdf`,
      type: doc.document_type || "Document",
      format: fileExt,
      contractNumber: contract?.contract_number || `CNT-${doc.contract_id?.substring(0, 8) || 'NA'}`,
      contractTitle: contract?.contract_name || "Sans titre",
      uploadDate: new Date(doc.created_at),
      uploadedBy: doc.uploaded_by || "Système",
      size: doc.file_size || "N/A",
      status: doc.status || "ok",
      mandatory: doc.is_mandatory || false
    };
  }) : [
    // Données d'exemple si pas de documents en base
    {
      id: "example-1",
      fileName: "exemple_contrat.pdf",
      type: "Contrat",
      format: "PDF",
      contractNumber: "CNT-EXEMPLE",
      contractTitle: "Contrat exemple",
      uploadDate: new Date(),
      uploadedBy: "Système",
      size: "1.5 MB",
      status: "ok",
      mandatory: true
    }
  ];

  const filteredDocuments = documents.filter((doc: any) => {
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

  // Mutation pour enregistrer le document après upload
  const saveDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      return await apiRequest("PUT", "/api/documents/upload", documentData);
    },
    onSuccess: () => {
      toast({
        title: "Document uploadé",
        description: "Le document a été ajouté avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setShowAddModal(false);
      setUploadForm({ 
        type: "", 
        name: "", 
        category: "administrative",
        contractId: "",
        description: "", 
        file: null 
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le document",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploaded = result.successful[0];
      await saveDocumentMutation.mutateAsync({
        documentURL: uploaded.uploadURL,
        contractId: uploadForm.contractId,
        name: uploadForm.name || uploaded.name,
        type: uploadForm.type,
        category: uploadForm.category,
        size: uploaded.size,
        mimeType: uploaded.type,
        description: uploadForm.description,
        metadata: {
          originalName: uploaded.name,
          uploadedAt: new Date().toISOString(),
        },
      });
    }
  };

  const handleShowDetails = (doc: any) => {
    setSelectedDocument(doc);
    setShowDetailsPanel(true);
  };

  const handlePreview = (doc: any) => {
    setSelectedDocument(doc);
    setShowPreview(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
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
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={`${user.firstName} ${user.lastName}`}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
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
                        filteredDocuments.map((doc: any) => (
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditForm({
                                      type: doc.type,
                                      label: doc.fileName,
                                      description: (doc as any).description || '',
                                      contractNumber: doc.contractNumber,
                                      mandatory: doc.mandatory || false
                                    });
                                    setShowEditModal(true);
                                  }}
                                  data-testid={`button-edit-${doc.id}`}
                                >
                                  <Edit className="w-4 h-4" />
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDocumentToDelete(doc);
                                    setShowDeleteModal(true);
                                  }}
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
                  <DialogDescription>
                    Téléchargez un document et associez-le à un contrat
                  </DialogDescription>
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
                    <Label htmlFor="contract-select" className="required">
                      Contrat associé <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={uploadForm.contractId} 
                      onValueChange={(value) => setUploadForm({...uploadForm, contractId: value})}
                    >
                      <SelectTrigger id="contract-select">
                        <SelectValue placeholder="Sélectionner un contrat" />
                      </SelectTrigger>
                      <SelectContent>
                        {contracts.map((contract: any) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.number} - {contract.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-name">Nom du document</Label>
                    <Input
                      id="doc-name"
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                      placeholder="Nom du document"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-category">Catégorie</Label>
                    <Select 
                      value={uploadForm.category} 
                      onValueChange={(value) => setUploadForm({...uploadForm, category: value})}
                    >
                      <SelectTrigger id="doc-category">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="legal">Juridique</SelectItem>
                        <SelectItem value="financial">Financier</SelectItem>
                        <SelectItem value="technical">Technique</SelectItem>
                        <SelectItem value="administrative">Administratif</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={52428800} // 50MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Téléverser le document
                  </ObjectUploader>
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
                      <DialogDescription>
                        Visualisez le document avant de le télécharger
                      </DialogDescription>
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

            {/* Modal de confirmation de suppression */}
            <ConfirmModal
              open={showDeleteModal}
              onOpenChange={setShowDeleteModal}
              title="Supprimer le document"
              description={`Êtes-vous sûr de vouloir supprimer le document "${documentToDelete?.fileName}" ? Cette action est irréversible.`}
              confirmText="Supprimer"
              cancelText="Annuler"
              variant="destructive"
              onConfirm={() => {
                console.log('Suppression du document:', documentToDelete);
                setDocumentToDelete(null);
                setShowDeleteModal(false);
              }}
            />

            {/* Modal de modification des métadonnées */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogContent data-testid="edit-document-modal">
                <DialogHeader>
                  <DialogTitle>Modifier les métadonnées du document</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations associées à ce document
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-type">Type de document</Label>
                    <Select 
                      value={editForm.type}
                      onValueChange={(v) => setEditForm({...editForm, type: v})}
                    >
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contrat">Contrat</SelectItem>
                        <SelectItem value="Avenant">Avenant</SelectItem>
                        <SelectItem value="Justificatif">Justificatif</SelectItem>
                        <SelectItem value="Annexe">Annexe</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-label">Libellé</Label>
                    <Input 
                      id="edit-label"
                      value={editForm.label}
                      onChange={(e) => setEditForm({...editForm, label: e.target.value})}
                      placeholder="Libellé du document"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea 
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      placeholder="Description du document"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contract">Contrat associé</Label>
                    <Input 
                      id="edit-contract"
                      value={editForm.contractNumber}
                      onChange={(e) => setEditForm({...editForm, contractNumber: e.target.value})}
                      placeholder="Numéro du contrat"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id="edit-mandatory"
                      checked={editForm.mandatory}
                      onChange={(e) => setEditForm({...editForm, mandatory: e.target.checked})}
                    />
                    <Label htmlFor="edit-mandatory" className="cursor-pointer">
                      Document obligatoire
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={() => {
                    console.log('Modification métadonnées:', editForm);
                    setShowEditModal(false);
                  }}>
                    Enregistrer les modifications
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
    </div>
  );
}