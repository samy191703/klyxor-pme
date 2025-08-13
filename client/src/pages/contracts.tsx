import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/status-badge";
import { Search, Filter, Download, Eye, Edit, FileText } from "lucide-react";
import type { Contract } from "@shared/schema";

export default function Contracts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("all");

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesBU = businessUnitFilter === "all" || contract.businessUnit === businessUnitFilter;
    
    return matchesSearch && matchesStatus && matchesBU;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "pending_validation": return "warning";
      case "draft": return "secondary";
      case "terminated": return "destructive";
      case "closed": return "outline";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Actif";
      case "pending_validation": return "À valider";
      case "draft": return "Brouillon";
      case "terminated": return "Résilié";
      case "closed": return "Clôturé";
      default: return status;
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
  };

  const getDaysUntilExpiry = (endDate: Date | string | null) => {
    if (!endDate) return null;
    const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const businessUnits = [...new Set(contracts.map(c => c.businessUnit))];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="contracts-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des contrats</h1>
              <p className="text-gray-600">Filtrer, consulter et gérer les contrats</p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filtres et recherche</span>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-export">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter CSV
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Rechercher par numéro de contrat, titre ou tiers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search"
                      />
                    </div>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-status">
                      <SelectValue placeholder="Tous les états" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les états</SelectItem>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="pending_validation">À valider</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="terminated">Résilié</SelectItem>
                      <SelectItem value="closed">Clôturé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={businessUnitFilter} onValueChange={setBusinessUnitFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-business-unit">
                      <SelectValue placeholder="Toutes les BU" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les BU</SelectItem>
                      {businessUnits.map(bu => (
                        <SelectItem key={bu} value={bu}>{bu}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Contrats ({filteredContracts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="w-24 h-6 bg-gray-200 rounded"></div>
                        <div className="flex-1 h-6 bg-gray-200 rounded"></div>
                        <div className="w-20 h-6 bg-gray-200 rounded"></div>
                        <div className="w-16 h-6 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredContracts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun contrat ne correspond aux critères de recherche</p>
                    <Button variant="outline" className="mt-4" onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setBusinessUnitFilter("all");
                    }}>
                      Réinitialiser les filtres
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numéro</TableHead>
                          <TableHead>Titre/Parties</TableHead>
                          <TableHead>État</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>BU</TableHead>
                          <TableHead>Échéance</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContracts.map((contract) => {
                          const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                          
                          return (
                            <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                              <TableCell className="font-medium">
                                {contract.number}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{contract.title}</div>
                                  <div className="text-sm text-gray-500">{contract.type}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge 
                                  variant={getStatusVariant(contract.status)}
                                  text={getStatusLabel(contract.status)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatAmount(contract.amount, contract.currency)}
                                </div>
                                {contract.indexationFrequency && (
                                  <div className="text-sm text-gray-500">
                                    Index: {contract.indexationFrequency}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{contract.businessUnit}</TableCell>
                              <TableCell>
                                {contract.endDate ? (
                                  <div>
                                    <div className="text-sm">{formatDate(contract.endDate)}</div>
                                    {daysUntilExpiry !== null && (
                                      <Badge variant={daysUntilExpiry <= 7 ? "destructive" : daysUntilExpiry <= 30 ? "warning" : "secondary"}>
                                        J-{daysUntilExpiry}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={contract.hasRequiredDocuments ? "success" : "destructive"}>
                                  {contract.hasRequiredDocuments ? "OK" : "Manquante"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="sm" data-testid={`button-view-${contract.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {contract.status === "draft" && (
                                    <Button variant="ghost" size="sm" data-testid={`button-edit-${contract.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" data-testid={`button-export-${contract.id}`}>
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
