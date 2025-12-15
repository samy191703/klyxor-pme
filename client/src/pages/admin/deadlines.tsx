import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Calendar, Clock, Bell, Mail, MessageSquare,
  Search, Filter, Save, X, AlertTriangle, Info
} from "lucide-react";

export default function AdminDeadlines() {
  const [activeView, setActiveView] = useState("global");
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [buFilter, setBuFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");

  const submenuItems = [
    { label: "Liste globale", value: "global", active: activeView === "global" },
    { label: "Paramètres de pré-alerte", value: "settings", active: activeView === "settings" }
  ];

  // KPI échéances
  const kpi = {
    j30: 15,
    j7: 6,
    j1: 2
  };

  // Données simulées pour les échéances
  const deadlines = [
    {
      id: 1,
      contract: "AUX89 - PARC AUXERROIS",
      type: "Fin contrat",
      date: "31/12/2026",
      daysRemaining: 365,
      alertChannel: "email",
      lastSent: "01/01/2025",
      responsible: "Marie Dupont"
    },
    {
      id: 2,
      contract: "FIG83 - PARC FIGANIÈRES",
      type: "Indexation",
      date: "01/09/2024",
      daysRemaining: 30,
      alertChannel: "email",
      lastSent: "25/01/2025",
      responsible: "Jean Martin"
    },
    {
      id: 3,
      contract: "SCM29 - PARC SCAER LE MERDY",
      type: "Révision tarifaire",
      date: "08/02/2024",
      daysRemaining: 7,
      alertChannel: "sms",
      lastSent: "26/01/2025",
      responsible: "Sophie Laurent"
    },
    {
      id: 4,
      contract: "GLB04 - PARC GRÉOUX 1",
      type: "Paiement",
      date: "15/02/2024",
      daysRemaining: 15,
      alertChannel: "email",
      lastSent: "24/01/2025",
      responsible: "Pierre Durand"
    },
    {
      id: 5,
      contract: "AUX89 - PARC AUXERROIS",
      type: "Renouvellement tacite",
      date: "01/02/2024",
      daysRemaining: 1,
      alertChannel: "all",
      lastSent: "27/01/2025",
      responsible: "Marie Dupont"
    }
  ];

  const alertSettings = [
    { type: "Fin contrat", j90: true, j60: true, j30: true, j15: true, j7: true, j1: true },
    { type: "Indexation", j90: false, j60: true, j30: true, j15: true, j7: true, j1: false },
    { type: "Révision tarifaire", j90: false, j60: false, j30: true, j15: true, j7: true, j1: true },
    { type: "Paiement", j90: false, j60: false, j30: true, j15: true, j7: true, j1: true },
    { type: "Renouvellement tacite", j90: true, j60: true, j30: true, j15: true, j7: true, j1: true }
  ];

  const getAlertIcon = (channel: string) => {
    switch(channel) {
      case "email": return <Mail className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "all": return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getDaysVariant = (days: number) => {
    if (days <= 1) return "destructive";
    if (days <= 7) return "warning";
    if (days <= 30) return "secondary";
    return "outline";
  };

  return (
    <AdminLayout 
      title="Échéances (Admin)"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {activeView === "global" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Échéances J-30
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.j30}</div>
                  <p className="text-xs text-muted-foreground mt-1">Dans le mois</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Échéances J-7
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{kpi.j7}</div>
                  <p className="text-xs text-muted-foreground mt-1">Cette semaine</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Échéances J-1
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{kpi.j1}</div>
                  <p className="text-xs text-muted-foreground mt-1">Demain</p>
                </CardContent>
              </Card>
            </div>

            {/* Info bandeau */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Les notifications sont générées automatiquement selon les paramètres de pré-alerte configurés. 
                Les alertes sont envoyées aux responsables désignés et aux parties prenantes concernées.
              </AlertDescription>
            </Alert>

            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <SelectItem value="quarter">Ce trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="fin_contrat">Fin contrat</SelectItem>
                        <SelectItem value="indexation">Indexation</SelectItem>
                        <SelectItem value="revision">Révision tarifaire</SelectItem>
                        <SelectItem value="paiement">Paiement</SelectItem>
                        <SelectItem value="renouvellement">Renouvellement tacite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>BU</Label>
                    <Select value={buFilter} onValueChange={setBuFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les BU" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les BU</SelectItem>
                        <SelectItem value="engie-solutions">ENGIE Solutions</SelectItem>
                        <SelectItem value="engie-green">ENGIE Green</SelectItem>
                        <SelectItem value="engie-gem">ENGIE GEM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Responsable</Label>
                    <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="marie">Marie Dupont</SelectItem>
                        <SelectItem value="jean">Jean Martin</SelectItem>
                        <SelectItem value="sophie">Sophie Laurent</SelectItem>
                        <SelectItem value="pierre">Pierre Durand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Recherche</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setPeriodFilter("");
                    setTypeFilter("");
                    setBuFilter("");
                    setResponsibleFilter("");
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

            {/* Tableau des échéances */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des échéances</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Type d'échéance</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>J-</TableHead>
                      <TableHead>Canal d'alerte</TableHead>
                      <TableHead>Dernier envoi</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadlines.map((deadline) => (
                      <TableRow key={deadline.id}>
                        <TableCell>{deadline.contract}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{deadline.type}</Badge>
                        </TableCell>
                        <TableCell>{deadline.date}</TableCell>
                        <TableCell>
                          <Badge variant={getDaysVariant(deadline.daysRemaining)}>
                            J-{deadline.daysRemaining}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAlertIcon(deadline.alertChannel)}
                            <span className="text-sm">{deadline.alertChannel}</span>
                          </div>
                        </TableCell>
                        <TableCell>{deadline.lastSent}</TableCell>
                        <TableCell>{deadline.responsible}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {activeView === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de pré-alerte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Les notifications sont générées automatiquement selon ces paramètres. 
                    Les modifications s'appliquent à tous les contrats concernés.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-lg font-medium mb-4">Configuration des alertes par type d'échéance</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type d'échéance</TableHead>
                        <TableHead className="text-center">J-90</TableHead>
                        <TableHead className="text-center">J-60</TableHead>
                        <TableHead className="text-center">J-30</TableHead>
                        <TableHead className="text-center">J-15</TableHead>
                        <TableHead className="text-center">J-7</TableHead>
                        <TableHead className="text-center">J-1</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertSettings.map((setting) => (
                        <TableRow key={setting.type}>
                          <TableCell className="font-medium">{setting.type}</TableCell>
                          <TableCell className="text-center">
                            <input type="checkbox" defaultChecked={setting.j90} />
                          </TableCell>
                          <TableCell className="text-center">
                            <input type="checkbox" defaultChecked={setting.j60} />
                          </TableCell>
                          <TableCell className="text-center">
                            <input type="checkbox" defaultChecked={setting.j30} />
                          </TableCell>
                          <TableCell className="text-center">
                            <input type="checkbox" defaultChecked={setting.j15} />
                          </TableCell>
                          <TableCell className="text-center">
                            <input type="checkbox" defaultChecked={setting.j7} />
                          </TableCell>
                          <TableCell className="text-center">
                            <input type="checkbox" defaultChecked={setting.j1} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Canaux de notification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Email</h4>
                      <p className="text-sm text-muted-foreground">
                        Notifications envoyées par email aux responsables et parties prenantes
                      </p>
                      <Badge className="mt-2" variant="default">Activé</Badge>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">SMS</h4>
                      <p className="text-sm text-muted-foreground">
                        Alertes critiques envoyées par SMS (J-7 et J-1)
                      </p>
                      <Badge className="mt-2" variant="default">Activé</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les paramètres
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}