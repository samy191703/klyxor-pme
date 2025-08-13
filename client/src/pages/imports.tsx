import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

export default function Imports() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock data for import logs
  const importLogs = [
    {
      id: "imp-1",
      fileName: "contrats_q1_2024.xlsx",
      type: "Contrats",
      date: new Date("2024-02-01T10:30:00"),
      status: "success",
      recordsTotal: 250,
      recordsImported: 248,
      recordsFailed: 2,
      user: "Marie Martin"
    },
    {
      id: "imp-2",
      fileName: "indexations_janvier.csv",
      type: "Indexations",
      date: new Date("2024-01-31T14:15:00"),
      status: "partial",
      recordsTotal: 100,
      recordsImported: 95,
      recordsFailed: 5,
      user: "Pierre Durand"
    },
    {
      id: "imp-3",
      fileName: "avenants_batch.xlsx",
      type: "Avenants",
      date: new Date("2024-01-30T09:00:00"),
      status: "failed",
      recordsTotal: 50,
      recordsImported: 0,
      recordsFailed: 50,
      user: "Sophie Laurent"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success">Succès</Badge>;
      case "partial":
        return <Badge variant="warning">Partiel</Badge>;
      case "failed":
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "partial":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Imports & Interfaces</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="imports-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Import / Export de données</h1>
              <p className="text-gray-600">Gestion des imports en masse et exports de données</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {importLogs.length}
                  </div>
                  <p className="text-sm text-gray-600">Imports ce mois</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <Badge variant="success">Succès</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {importLogs.filter(i => i.status === "success").length}
                  </div>
                  <p className="text-sm text-gray-600">Imports réussis</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {importLogs.reduce((sum, i) => sum + i.recordsImported, 0)}
                  </div>
                  <p className="text-sm text-gray-600">Enregistrements importés</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8 text-red-500" />
                    <Badge variant="destructive">Erreurs</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {importLogs.reduce((sum, i) => sum + i.recordsFailed, 0)}
                  </div>
                  <p className="text-sm text-gray-600">Enregistrements échoués</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Actions d'import/export</span>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-download-template">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger modèle
                    </Button>
                    <Button variant="default" size="sm" data-testid="button-import-data">
                      <Upload className="w-4 h-4 mr-2" />
                      Nouvel import
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Import Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Historique des imports ({importLogs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fichier</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date/Heure</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Importés</TableHead>
                        <TableHead>Échoués</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-import-${log.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(log.status)}
                              {getStatusBadge(log.status)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{log.fileName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.type}</Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(log.date)}</TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell>{log.recordsTotal}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {log.recordsImported}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {log.recordsFailed}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-log-${log.id}`}>
                                Voir détails
                              </Button>
                              {log.recordsFailed > 0 && (
                                <Button variant="ghost" size="sm" className="text-orange-600">
                                  Voir erreurs
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