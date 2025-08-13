import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/status-badge";
import { TrendingUp, Download, Eye, Check, X, Calculator } from "lucide-react";
import type { Indexation } from "@shared/schema";

export default function Indexations() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const { data: indexations = [], isLoading } = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  const filteredIndexations = indexations.filter(indexation => {
    const matchesStatus = statusFilter === "all" || indexation.status === statusFilter;
    return matchesStatus;
  });

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
  };

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
      case "validated": return "Validé";
      case "pending": return "À valider";
      case "rejected": return "Rejeté";
      default: return status;
    }
  };

  const getDeltaVariant = (percentage: string) => {
    const value = parseFloat(percentage);
    if (value > 5) return "destructive";
    if (value > 2) return "warning";
    return "secondary";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="indexations-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Indexations et rapports</h1>
              <p className="text-gray-600">Gestion des indexations automatiques et génération de rapports</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-warning" />
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {indexations.filter(i => i.status === "pending").length}
                  </div>
                  <p className="text-sm text-gray-600">Indexations à valider</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calculator className="w-8 h-8 text-info" />
                    <span className="text-sm text-gray-600">Moyenne</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {indexations.length > 0 
                      ? (indexations.reduce((sum, i) => sum + parseFloat(i.deltaPercentage), 0) / indexations.length).toFixed(2) + '%'
                      : '0%'
                    }
                  </div>
                  <p className="text-sm text-gray-600">Variation moyenne</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-success" />
                    <Badge variant="success">Validées</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {indexations.filter(i => i.status === "validated").length}
                  </div>
                  <p className="text-sm text-gray-600">Indexations validées</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Runs du jour</span>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-export-indexations">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </Button>
                    <Button variant="default" size="sm" data-testid="button-simulate">
                      <Calculator className="w-4 h-4 mr-2" />
                      Simuler
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-status-indexation">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">À valider</SelectItem>
                      <SelectItem value="validated">Validé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-period-indexation">
                      <SelectValue placeholder="Toutes les périodes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les périodes</SelectItem>
                      <SelectItem value="q1">Q1 2024</SelectItem>
                      <SelectItem value="q4">Q4 2023</SelectItem>
                      <SelectItem value="q3">Q3 2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Indexations Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Indexations détectées ({filteredIndexations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="w-32 h-6 bg-gray-200 rounded"></div>
                        <div className="flex-1 h-6 bg-gray-200 rounded"></div>
                        <div className="w-24 h-6 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredIndexations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucune indexation détectée pour aujourd'hui</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contrat</TableHead>
                          <TableHead>Période</TableHead>
                          <TableHead>Formule</TableHead>
                          <TableHead>Montant actuel</TableHead>
                          <TableHead>Montant proposé</TableHead>
                          <TableHead>Delta</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIndexations.map((indexation) => (
                          <TableRow key={indexation.id} data-testid={`row-indexation-${indexation.id}`}>
                            <TableCell className="font-medium">
                              {indexation.contractId}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(indexation.periodFrom)}</div>
                                <div className="text-gray-500">→ {formatDate(indexation.periodTo)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{indexation.formula}</TableCell>
                            <TableCell>{formatAmount(indexation.oldAmount)}</TableCell>
                            <TableCell className="font-medium">{formatAmount(indexation.newAmount)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{formatAmount(indexation.deltaAmount)}</div>
                                <Badge variant={getDeltaVariant(indexation.deltaPercentage)}>
                                  +{indexation.deltaPercentage}%
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                variant={getStatusVariant(indexation.status)}
                                text={getStatusLabel(indexation.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" data-testid={`button-view-indexation-${indexation.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {indexation.status === "pending" && (
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
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}