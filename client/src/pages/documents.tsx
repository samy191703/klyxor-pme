import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, Download, Trash2, AlertCircle } from "lucide-react";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for documents
  const documents = [
    {
      id: "doc-1",
      contractNumber: "CNT-2024-001",
      type: "Contrat signé",
      fileName: "contrat_signe_2024_001.pdf",
      size: "2.5 MB",
      uploadDate: new Date("2024-01-15"),
      uploadedBy: "Marie Martin",
      status: "ok",
      mandatory: true
    },
    {
      id: "doc-2",
      contractNumber: "CNT-2024-002",
      type: "Annexe technique",
      fileName: "annexe_technique.pdf",
      size: "1.2 MB",
      uploadDate: new Date("2024-01-20"),
      uploadedBy: "Pierre Durand",
      status: "ok",
      mandatory: false
    },
    {
      id: "doc-3",
      contractNumber: "CNT-2024-003",
      type: "Contrat signé",
      fileName: "-",
      size: "-",
      uploadDate: null,
      uploadedBy: "-",
      status: "missing",
      mandatory: true
    }
  ];

  const filteredDocuments = documents.filter(doc => 
    doc.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  const getStatusBadge = (status: string, mandatory: boolean) => {
    if (status === "missing" && mandatory) {
      return <Badge variant="destructive">Obligatoire manquante</Badge>;
    } else if (status === "ok") {
      return <Badge variant="success">OK</Badge>;
    }
    return <Badge variant="secondary">Optionnel</Badge>;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="documents-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents et GED</h1>
              <p className="text-gray-600">Gestion électronique des documents contractuels</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {documents.filter(d => d.status === "ok").length}
                  </div>
                  <p className="text-sm text-gray-600">Documents archivés</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <Badge variant="destructive">Manquant</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {documents.filter(d => d.status === "missing" && d.mandatory).length}
                  </div>
                  <p className="text-sm text-gray-600">Pièces obligatoires manquantes</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {documents.reduce((acc, d) => {
                      if (d.size !== "-") {
                        const sizeInMB = parseFloat(d.size.replace(" MB", ""));
                        return acc + sizeInMB;
                      }
                      return acc;
                    }, 0).toFixed(1)} MB
                  </div>
                  <p className="text-sm text-gray-600">Espace utilisé</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(documents.map(d => d.contractNumber)).size}
                  </div>
                  <p className="text-sm text-gray-600">Contrats documentés</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Gestion documentaire</span>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-export-docs">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter liste
                    </Button>
                    <Button variant="default" size="sm" data-testid="button-upload-doc">
                      <Upload className="w-4 h-4 mr-2" />
                      Ajouter document
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Rechercher par numéro de contrat ou nom de fichier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                  data-testid="input-search-documents"
                />
              </CardContent>
            </Card>

            {/* Documents Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Documents ({filteredDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrat</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Fichier</TableHead>
                        <TableHead>Taille</TableHead>
                        <TableHead>Date/Auteur</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell className="font-medium">
                            {doc.contractNumber}
                          </TableCell>
                          <TableCell>{doc.type}</TableCell>
                          <TableCell className="text-sm">
                            {doc.fileName !== "-" ? (
                              <span className="text-blue-600 hover:underline cursor-pointer">
                                {doc.fileName}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>{doc.size}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatDate(doc.uploadDate)}</div>
                              <div className="text-gray-500">{doc.uploadedBy}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(doc.status, doc.mandatory)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {doc.status === "ok" && (
                                <>
                                  <Button variant="ghost" size="sm" data-testid={`button-download-${doc.id}`}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {doc.status === "missing" && doc.mandatory && (
                                <Button variant="outline" size="sm" className="text-orange-600">
                                  <Upload className="w-4 h-4 mr-1" />
                                  Ajouter
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}