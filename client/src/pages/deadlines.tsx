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
import { Calendar, Clock, Download, Eye, Bell } from "lucide-react";
import type { Deadline } from "@shared/schema";

export default function Deadlines() {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: deadlines = [], isLoading } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });

  const filteredDeadlines = deadlines.filter(deadline => {
    const matchesSearch = deadline.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = 
      periodFilter === "all" || 
      (periodFilter === "j30" && deadline.daysRemaining <= 30 && deadline.daysRemaining > 7) ||
      (periodFilter === "j7" && deadline.daysRemaining <= 7 && deadline.daysRemaining > 1) ||
      (periodFilter === "j1" && deadline.daysRemaining <= 1);
    const matchesType = typeFilter === "all" || deadline.type === typeFilter;
    
    return matchesSearch && matchesPeriod && matchesType;
  });

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getDaysVariant = (days: number) => {
    if (days <= 1) return "destructive";
    if (days <= 7) return "warning";
    if (days <= 30) return "secondary";
    return "outline";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "end_contract": return "Fin de contrat";
      case "anniversary": return "Anniversaire";
      case "amendment": return "Avenant";
      default: return type;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="deadlines-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Échéances et rappels</h1>
              <p className="text-gray-600">Gestion des échéances contractuelles et des notifications</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-8 h-8 text-red-500" />
                    <Badge variant="destructive">Urgent</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {deadlines.filter(d => d.daysRemaining <= 1).length}
                  </div>
                  <p className="text-sm text-gray-600">Échéances J-1</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-orange-500" />
                    <Badge variant="warning">Attention</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {deadlines.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 1).length}
                  </div>
                  <p className="text-sm text-gray-600">Échéances J-7</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-blue-500" />
                    <Badge variant="secondary">À venir</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {deadlines.filter(d => d.daysRemaining <= 30 && d.daysRemaining > 7).length}
                  </div>
                  <p className="text-sm text-gray-600">Échéances J-30</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Bell className="w-8 h-8 text-green-500" />
                    <Badge variant="success">Envoyées</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {deadlines.filter(d => d.notificationSent).length}
                  </div>
                  <p className="text-sm text-gray-600">Notifications envoyées</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filtres et actions</span>
                  <Button variant="outline" size="sm" data-testid="button-export-deadlines">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter CSV
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Rechercher par numéro de contrat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                    data-testid="input-search-deadlines"
                  />
                  
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-period">
                      <SelectValue placeholder="Toutes les périodes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les périodes</SelectItem>
                      <SelectItem value="j1">J-1 (Urgent)</SelectItem>
                      <SelectItem value="j7">J-7 (Cette semaine)</SelectItem>
                      <SelectItem value="j30">J-30 (Ce mois)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-type">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="end_contract">Fin de contrat</SelectItem>
                      <SelectItem value="anniversary">Anniversaire</SelectItem>
                      <SelectItem value="amendment">Avenant</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="default">
                    <Bell className="w-4 h-4 mr-2" />
                    Relancer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Deadlines Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Prochaines échéances ({filteredDeadlines.length})
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
                        <div className="w-20 h-6 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredDeadlines.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucune échéance ne correspond aux critères</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contrat</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date échéance</TableHead>
                          <TableHead>J-</TableHead>
                          <TableHead>Business Unit</TableHead>
                          <TableHead>Notification</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeadlines.map((deadline) => (
                          <TableRow key={deadline.id} data-testid={`row-deadline-${deadline.id}`}>
                            <TableCell className="font-medium">
                              {deadline.contractNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getTypeLabel(deadline.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(deadline.date)}</TableCell>
                            <TableCell>
                              <Badge variant={getDaysVariant(deadline.daysRemaining)}>
                                J-{deadline.daysRemaining}
                              </Badge>
                            </TableCell>
                            <TableCell>{deadline.businessUnit}</TableCell>
                            <TableCell>
                              {deadline.notificationSent ? (
                                <Badge variant="success">Envoyée</Badge>
                              ) : (
                                <Badge variant="secondary">En attente</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" data-testid={`button-view-deadline-${deadline.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!deadline.notificationSent && (
                                  <Button variant="ghost" size="sm" data-testid={`button-notify-${deadline.id}`}>
                                    <Bell className="w-4 h-4" />
                                  </Button>
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