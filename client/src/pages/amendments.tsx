import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/status-badge";
import { Edit, Plus, Eye, Check, X } from "lucide-react";

export default function Amendments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock data for amendments
  const amendments = [
    {
      id: "av-1",
      contractNumber: "CNT-2024-001",
      type: "Modification montant",
      fields: "Montant, Durée",
      status: "pending",
      author: "Marie Martin",
      createdAt: new Date("2024-02-01"),
      oldValue: "250 000 €",
      newValue: "275 000 €"
    },
    {
      id: "av-2",
      contractNumber: "CNT-2023-045",
      type: "Extension durée",
      fields: "Date fin",
      status: "validated",
      author: "Pierre Durand",
      createdAt: new Date("2024-01-15"),
      oldValue: "31/12/2024",
      newValue: "31/12/2025"
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated": return "success";
      case "pending": return "warning";
      case "draft": return "secondary";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated": return "Validé";
      case "pending": return "À valider";
      case "draft": return "Brouillon";
      case "cancelled": return "Annulé";
      default: return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="amendments-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Avenants</h1>
              <p className="text-gray-600">Gestion des modifications contractuelles</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Edit className="w-8 h-8 text-warning" />
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {amendments.filter(a => a.status === "pending").length}
                  </div>
                  <p className="text-sm text-gray-600">Avenants à valider</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Edit className="w-8 h-8 text-info" />
                    <Badge variant="secondary">Brouillons</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {amendments.filter(a => a.status === "draft").length}
                  </div>
                  <p className="text-sm text-gray-600">En préparation</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Edit className="w-8 h-8 text-success" />
                    <Badge variant="success">Validés</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {amendments.filter(a => a.status === "validated").length}
                  </div>
                  <p className="text-sm text-gray-600">Avenants appliqués</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions & Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Gestion des avenants</span>
                  <Button variant="default" size="sm" data-testid="button-create-amendment">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un avenant
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Amendments Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Liste des avenants ({amendments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrat</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Champs modifiés</TableHead>
                        <TableHead>Avant → Après</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amendments.map((amendment) => (
                        <TableRow key={amendment.id} data-testid={`row-amendment-${amendment.id}`}>
                          <TableCell className="font-medium">
                            {amendment.contractNumber}
                          </TableCell>
                          <TableCell>{amendment.type}</TableCell>
                          <TableCell>{amendment.fields}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-gray-500">{amendment.oldValue}</span>
                              <span className="mx-2">→</span>
                              <span className="font-medium text-green-600">{amendment.newValue}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              variant={getStatusVariant(amendment.status)}
                              text={getStatusLabel(amendment.status)}
                            />
                          </TableCell>
                          <TableCell>{amendment.author}</TableCell>
                          <TableCell>{formatDate(amendment.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-amendment-${amendment.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {amendment.status === "pending" && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
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