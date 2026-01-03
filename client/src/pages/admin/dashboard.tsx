import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  AlertTriangle, FileText, Clock, TrendingUp, 
  AlertCircle, Calendar, FileCheck, Download,
  RefreshCw, ChevronRight, Activity, FileX
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState("kpi");

  // Simulation des données KPI
  const kpiData = {
    contractsToValidate: 8,
    indexationsToValidate: 5,
    amendmentsToValidate: 3,
    terminationsInProgress: 2,
    deadlinesJ30: 15,
    deadlinesJ7: 6,
    deadlinesJ1: 2,
    indexSourceErrors: 3,
    sapErrors: 1,
    blockedWorkflows: 4
  };

  const criticalAlerts = [
    { id: 1, type: "error", message: "Échec récupération indice ICHT - Source INSEE indisponible", date: "Il y a 2h", unread: true },
    { id: 2, type: "warning", message: "Workflow validation contrat AUX89 bloqué > 24h", date: "Il y a 5h", unread: true },
    { id: 3, type: "error", message: "Erreur envoi SAP - Contrat FIG83", date: "Il y a 8h", unread: false },
    { id: 4, type: "warning", message: "Indexation PARC SCAER en attente validation urgente", date: "Il y a 1j", unread: false }
  ];

  const blockingTasks = [
    { id: 1, type: "Validation contrat", reference: "GLB04", daysBlocked: 3, effectDate: "01/01/2024", priority: "high" },
    { id: 2, type: "Validation indexation", reference: "AUX89", daysBlocked: 2, effectDate: "24/09/2024", priority: "high" },
    { id: 3, type: "Avenant montant", reference: "FIG83", daysBlocked: 1, effectDate: "01/09/2024", priority: "medium" },
    { id: 4, type: "Validation résiliation", reference: "SCM29", daysBlocked: 4, effectDate: "31/12/2023", priority: "high" }
  ];

  const recentReports = [
    { id: 1, name: "Rapport indexation Q3 2024", date: "27/01/2025", type: "indexation", format: "PDF" },
    { id: 2, name: "Export contrats actifs", date: "26/01/2025", type: "export", format: "XLSX" },
    { id: 3, name: "Rapport validation mensuel", date: "25/01/2025", type: "validation", format: "PDF" },
    { id: 4, name: "Analyse indices économiques", date: "24/01/2025", type: "indices", format: "PDF" }
  ];

  const submenuItems = [
    { label: "KPI globaux", value: "kpi", active: activeView === "kpi" },
    { label: "Tâches bloquantes", value: "blocking", active: activeView === "blocking" },
    { label: "Alertes critiques", value: "alerts", active: activeView === "alerts" },
    { label: "Derniers exports", value: "exports", active: activeView === "exports" }
  ];

  return (
    <AdminLayout 
      title="Administration — Vue globale"
      submenuItems={submenuItems}
      onSubmenuClick={setActiveView}
    >
      <div className="space-y-6">
        {activeView === "kpi" && (
          <>
            {/* KPI Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Contrats à valider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.contractsToValidate}</div>
                  <Button size="sm" variant="link" className="p-0 mt-2">
                    Ouvrir filet de validation <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Indexations à valider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.indexationsToValidate}</div>
                  <Button size="sm" variant="link" className="p-0 mt-2">
                    Ouvrir filet de validation <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avenants à valider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.amendmentsToValidate}</div>
                  <Button size="sm" variant="link" className="p-0 mt-2">
                    Ouvrir filet de validation <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Résiliations en cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.terminationsInProgress}</div>
                  <Button size="sm" variant="link" className="p-0 mt-2">
                    Voir détails <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Échéances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Échéances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">J-30</div>
                    <div className="text-2xl font-bold text-yellow-600">{kpiData.deadlinesJ30}</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">J-7</div>
                    <div className="text-2xl font-bold text-orange-600">{kpiData.deadlinesJ7}</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">J-1</div>
                    <div className="text-2xl font-bold text-red-600">{kpiData.deadlinesJ1}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Erreurs techniques */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Erreurs sources indices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-2xl font-bold">{kpiData.indexSourceErrors}</span>
                    </div>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Relancer récupération
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Envois SAP en erreur</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileX className="h-5 w-5 text-red-500" />
                      <span className="text-2xl font-bold">{kpiData.sapErrors}</span>
                    </div>
                    <Button size="sm" variant="outline">
                      Journal technique
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeView === "alerts" && (
          <Card>
            <CardHeader>
              <CardTitle>Alertes critiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalAlerts.map(alert => (
                  <Alert key={alert.id} className={alert.unread ? "border-l-4 border-l-primary" : ""}>
                    <AlertTriangle className={`h-4 w-4 ${alert.type === 'error' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <AlertDescription>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={alert.unread ? "font-semibold" : ""}>{alert.message}</p>
                          <p className="text-sm text-muted-foreground mt-1">{alert.date}</p>
                        </div>
                        {alert.unread && <Badge variant="secondary">Non lu</Badge>}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "blocking" && (
          <Card>
            <CardHeader>
              <CardTitle>Tâches bloquantes (workflows &gt; 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blockingTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                        Priorité {task.priority === "high" ? "haute" : "moyenne"}
                      </Badge>
                      <div>
                        <p className="font-medium">{task.type} - {task.reference}</p>
                        <p className="text-sm text-muted-foreground">
                          Bloqué depuis {task.daysBlocked} jours • Date d'effet : {task.effectDate}
                        </p>
                      </div>
                    </div>
                    <Button size="sm">
                      Traiter <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "exports" && (
          <Card>
            <CardHeader>
              <CardTitle>Derniers rapports d'indexation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">{report.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{report.format}</Badge>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}