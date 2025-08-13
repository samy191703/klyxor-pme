import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/status-badge";
import { XCircle, Eye, Check, X } from "lucide-react";

export default function Terminations() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock data for terminations
  const terminations = [
    {
      id: "res-1",
      contractNumber: "CNT-2023-078",
      effectDate: new Date("2024-03-31"),
      reason: "Non-renouvellement à échéance",
      status: "pending",
      requestor: "Sophie Laurent",
      createdAt: new Date("2024-02-01")
    },
    {
      id: "res-2",
      contractNumber: "CNT-2023-045",
      effectDate: new Date("2024-06-30"),
      reason: "Résiliation amiable",
      status: "validated",
      requestor: "Jean Dupont",
      createdAt: new Date("2024-01-15")
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated": return "success";
      case "pending": return "warning";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated": return "Validée";
      case "pending": return "À valider";
      case "rejected": return "Rejetée";
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
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="terminations-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Résiliations</h1>
              <p className="text-gray-600">Gestion des demandes de résiliation de contrats</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8 text-warning" />
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {terminations.filter(t => t.status === "pending").length}
                  </div>
                  <p className="text-sm text-gray-600">Résiliations à valider</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8 text-success" />
                    <Badge variant="success">Traitées</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {terminations.filter(t => t.status === "validated").length}
                  </div>
                  <p className="text-sm text-gray-600">Résiliations validées</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8 text-red-600" />
                    <Badge variant="destructive">Impact</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {terminations.length}
                  </div>
                  <p className="text-sm text-gray-600">Contrats concernés</p>
                </CardContent>
              </Card>
            </div>

            {/* Terminations Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Demandes de résiliation ({terminations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrat</TableHead>
                        <TableHead>Date d'effet</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Demandeur</TableHead>
                        <TableHead>Date demande</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {terminations.map((termination) => (
                        <TableRow key={termination.id} data-testid={`row-termination-${termination.id}`}>
                          <TableCell className="font-medium">
                            {termination.contractNumber}
                          </TableCell>
                          <TableCell>{formatDate(termination.effectDate)}</TableCell>
                          <TableCell>{termination.reason}</TableCell>
                          <TableCell>
                            <StatusBadge
                              variant={getStatusVariant(termination.status)}
                              text={getStatusLabel(termination.status)}
                            />
                          </TableCell>
                          <TableCell>{termination.requestor}</TableCell>
                          <TableCell>{formatDate(termination.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-termination-${termination.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {termination.status === "pending" && (
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