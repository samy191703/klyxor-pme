import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  TrendingUp,
  FileEdit,
  AlertTriangle,
  Calendar,
  Clock,
  AlertCircle,
  FileWarning,
  Upload,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminLayout } from "./AdminLayout";
import { Link } from "wouter";

interface KPI {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  link: string;
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  referenceId?: string;
}

interface BlockedTask {
  id: string;
  type: string;
  reference: string;
  blockedSince: Date;
  priority: "high" | "medium" | "low";
  assignedTo: string;
}

interface IndexationReport {
  id: string;
  contractNumber: string;
  contractTitle: string;
  date: Date;
  status: "provisoire" | "validé" | "rejeté";
  variation: number;
}

export function AdminDashboard() {
  // Fetch KPIs
  const { data: kpis } = useQuery({
    queryKey: ["/api/admin/kpis"]
  });

  // Fetch alerts
  const { data: alerts } = useQuery({
    queryKey: ["/api/admin/alerts"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch blocked tasks
  const { data: blockedTasks } = useQuery({
    queryKey: ["/api/admin/blocked-tasks"]
  });

  // Fetch recent indexation reports
  const { data: recentReports } = useQuery({
    queryKey: ["/api/admin/recent-reports"]
  });

  const kpiCards: KPI[] = [
    {
      label: "Contrats à valider",
      value: kpis?.contractsToValidate || 0,
      icon: FileText,
      color: "text-blue-600",
      link: "/admin/contracts/validate"
    },
    {
      label: "Indexations à valider",
      value: kpis?.indexationsToValidate || 0,
      icon: TrendingUp,
      color: "text-green-600",
      link: "/admin/indexations/validate"
    },
    {
      label: "Avenants à valider",
      value: kpis?.amendmentsToValidate || 0,
      icon: FileEdit,
      color: "text-purple-600",
      link: "/admin/amendments/validate"
    },
    {
      label: "Résiliations en cours",
      value: kpis?.terminationsInProgress || 0,
      icon: XCircle,
      color: "text-red-600",
      link: "/admin/contracts/terminations"
    }
  ];

  const deadlineKpis = [
    { label: "J-30", value: kpis?.dueDatesJ30 || 0, color: "bg-yellow-100 text-yellow-800" },
    { label: "J-7", value: kpis?.dueDatesJ7 || 0, color: "bg-orange-100 text-orange-800" },
    { label: "J-1", value: kpis?.dueDatesJ1 || 0, color: "bg-red-100 text-red-800" }
  ];

  const technicalKpis = [
    { label: "Erreurs sources indices", value: kpis?.indexSourceErrors || 0, icon: AlertCircle },
    { label: "Envois SAP en erreur", value: kpis?.sapErrors || 0, icon: FileWarning }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration — Vue globale</h1>
          <p className="text-gray-600 mt-1">Tableau de bord et supervision du système KLYXOR</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} href={kpi.link}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {kpi.label}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Deadline KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Échéances à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {deadlineKpis.map((deadline) => (
                <div key={deadline.label} className="flex-1">
                  <div className="text-center p-4 rounded-lg bg-gray-50">
                    <Badge className={deadline.color}>
                      {deadline.label}
                    </Badge>
                    <div className="text-2xl font-bold mt-2">{deadline.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Alerts Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Alertes critiques
              </CardTitle>
              <Link href="/admin/notifications">
                <Button variant="outline" size="sm">Voir tout</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {alerts?.slice(0, 5).map((alert: Alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        !alert.isRead ? "bg-yellow-50 border-yellow-200" : "bg-white"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(alert.timestamp).toLocaleString("fr-FR")}
                          </p>
                        </div>
                        {!alert.isRead && (
                          <Badge variant="outline" className="text-xs">Non lu</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!alerts || alerts.length === 0) && (
                    <p className="text-center text-gray-500 py-4">Aucune alerte critique</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Blocked Tasks Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Tâches bloquantes ({">"} 24h)
              </CardTitle>
              <Link href="/admin/tasks">
                <Button variant="outline" size="sm">Voir tout</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {blockedTasks?.slice(0, 5).map((task: BlockedTask) => (
                    <div key={task.id} className="p-3 rounded-lg border bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{task.type}</p>
                          <p className="text-xs text-gray-600 mt-1">{task.reference}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Assigné à: {task.assignedTo}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority === "high" ? "Urgent" : 
                             task.priority === "medium" ? "Moyen" : "Faible"}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Bloqué depuis {Math.floor((Date.now() - new Date(task.blockedSince).getTime()) / (1000 * 60 * 60))}h
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!blockedTasks || blockedTasks.length === 0) && (
                    <p className="text-center text-gray-500 py-4">Aucune tâche bloquante</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Technical KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {technicalKpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {kpi.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{kpi.value}</div>
                  <Button variant="outline" size="sm" className="mt-2">
                    Ouvrir journal technique
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Indexation Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Derniers rapports d'indexation
            </CardTitle>
            <Link href="/admin/indexations/reports">
              <Button variant="outline" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Contrat</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Statut</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Variation</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports?.slice(0, 5).map((report: IndexationReport) => (
                    <tr key={report.id} className="border-b">
                      <td className="py-2">
                        <div>
                          <p className="text-sm font-medium">{report.contractNumber}</p>
                          <p className="text-xs text-gray-500">{report.contractTitle}</p>
                        </div>
                      </td>
                      <td className="py-2 text-sm">
                        {new Date(report.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2">
                        <Badge variant={
                          report.status === "validé" ? "success" :
                          report.status === "rejeté" ? "destructive" :
                          "secondary"
                        }>
                          {report.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-sm">
                        <span className={report.variation > 0 ? "text-green-600" : "text-red-600"}>
                          {report.variation > 0 ? "+" : ""}{report.variation.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Voir</Button>
                          <Button size="sm" variant="outline">PDF</Button>
                          <Button size="sm" variant="outline">XLS</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!recentReports || recentReports.length === 0) && (
                <p className="text-center text-gray-500 py-4">Aucun rapport récent</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}