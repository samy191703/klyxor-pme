import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/widgets/status-badge";
import { Eye, Check, X, Share, Download, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ValidationRequest, Deadline, Alert, ImportLog } from "@shared/schema";

type TabType = "validate" | "deadlines" | "alerts" | "imports";

export default function WorkQueues() {
  const [activeTab, setActiveTab] = useState<TabType>("validate");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: validationRequests = [] } = useQuery<ValidationRequest[]>({
    queryKey: ["/api/validation-requests"],
  });

  const { data: deadlines = [] } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: importLogs = [] } = useQuery<ImportLog[]>({
    queryKey: ["/api/import-logs"],
  });

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case "validate":
        return validationRequests.filter(r => r.status === "pending").length;
      case "deadlines":
        return deadlines.filter(d => d.daysRemaining <= 30).length;
      case "alerts":
        return alerts.filter(a => !a.isRead).length;
      case "imports":
        return importLogs.length;
      default:
        return 0;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "contract": return "Contrat";
      case "indexation": return "Indexation";
      case "amendment": return "Avenant";
      case "termination": return "Résiliation";
      case "manual_amount": return "Montant";
      default: return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case "contract": return "primary";
      case "indexation": return "success";
      case "amendment": return "warning";
      case "termination": return "destructive";
      case "manual_amount": return "secondary";
      default: return "secondary";
    }
  };

  const getAlertIcon = (type: string) => {
    return <div className={`w-2 h-2 rounded-full ${
      type === "critical" ? "bg-red-500" : 
      type === "warning" ? "bg-yellow-500" : 
      "bg-blue-500"
    }`} />;
  };

  const filteredValidationRequests = validationRequests.filter(r => 
    r.status === "pending" && (typeFilter === "all" || r.type === typeFilter)
  );

  const renderValidateTab = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Éléments à valider</h3>
        <div className="flex items-center space-x-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-validation-type">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="contract">Contrats</SelectItem>
              <SelectItem value="indexation">Indexations</SelectItem>
              <SelectItem value="amendment">Avenants</SelectItem>
              <SelectItem value="termination">Résiliations</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Âge</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead>Valideur</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredValidationRequests.map((request) => (
              <TableRow key={request.id} className="hover:bg-gray-50" data-testid={`validation-row-${request.id}`}>
                <TableCell>
                  <StatusBadge
                    variant={getTypeVariant(request.type)}
                    text={getTypeLabel(request.type)}
                  />
                </TableCell>
                <TableCell className="font-medium">{request.reference}</TableCell>
                <TableCell className="text-gray-700">{request.subject}</TableCell>
                <TableCell>
                  <Badge variant={request.age > 1 ? "destructive" : request.age > 0 ? "warning" : "secondary"}>
                    {request.age > 0 ? `${request.age} jour${request.age > 1 ? 's' : ''}` : 'Nouveau'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-700">{request.requestedBy}</TableCell>
                <TableCell className="text-gray-700">{request.assignedTo}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" data-testid={`button-view-validation-${request.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      <Share className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Affichage de 1 à {filteredValidationRequests.length} sur {filteredValidationRequests.length} éléments
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Précédent
          </Button>
          <Button variant="default" size="sm">1</Button>
          <Button variant="outline" size="sm" disabled>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDeadlinesTab = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Prochaines échéances</h3>
        <div className="flex items-center space-x-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les périodes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="j30">J-30</SelectItem>
              <SelectItem value="j7">J-7</SelectItem>
              <SelectItem value="j1">J-1</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrat</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date échéance</TableHead>
              <TableHead>J-</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deadlines.slice(0, 10).map((deadline) => (
              <TableRow key={deadline.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{deadline.contractNumber}</TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {deadline.type === "end_contract" ? "Fin contrat" : deadline.type}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(deadline.date).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                  <Badge variant={deadline.daysRemaining <= 7 ? "destructive" : deadline.daysRemaining <= 30 ? "warning" : "secondary"}>
                    J-{deadline.daysRemaining}
                  </Badge>
                </TableCell>
                <TableCell>{deadline.businessUnit}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderAlertsTab = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Centre d'alertes</h3>
        <div className="flex items-center space-x-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les alertes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les alertes</SelectItem>
              <SelectItem value="critical">Critiques</SelectItem>
              <SelectItem value="warning">Avertissements</SelectItem>
              <SelectItem value="info">Informations</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Check className="w-4 h-4 mr-2" />
            Marquer comme lu
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.slice(0, 10).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start space-x-3 p-4 border rounded-lg ${
              alert.type === "critical" ? "bg-red-50 border-red-200" :
              alert.type === "warning" ? "bg-yellow-50 border-yellow-200" :
              "bg-blue-50 border-blue-200"
            }`}
            data-testid={`alert-${alert.id}`}
          >
            {getAlertIcon(alert.type)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{alert.title}</h4>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(alert.createdAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              <button className="text-xs text-primary hover:text-blue-700 mt-2">
                Voir le détail
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderImportsTab = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Historique des imports</h3>
        <Button variant="default" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Nouvel import
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Fichier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Lignes OK/KO</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {importLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-gray-50">
                <TableCell>{new Date(log.createdAt).toLocaleDateString('fr-FR')} {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                <TableCell>{log.author}</TableCell>
                <TableCell className="font-medium">{log.fileName}</TableCell>
                <TableCell>
                  <StatusBadge
                    variant={log.status === "error" ? "destructive" : log.status === "success" ? "success" : "warning"}
                    text={log.status === "error" ? "Erreur" : log.status === "success" ? "Succès" : "Partiel"}
                  />
                </TableCell>
                <TableCell>{log.successRows} / {log.errorRows}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {log.status === "error" && (
                      <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 py-4">
          {[
            { key: "validate", label: "À valider" },
            { key: "deadlines", label: "Échéances" },
            { key: "alerts", label: "Alertes" },
            { key: "imports", label: "Imports" },
          ].map((tab) => {
            const count = getTabCount(tab.key as TabType);
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                className={`pb-2 font-medium transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab(tab.key as TabType)}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
                {count > 0 && (
                  <Badge 
                    className={`ml-2 ${
                      tab.key === "alerts" && count > 0 ? "bg-red-500" : 
                      isActive ? "bg-warning" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <CardContent className="p-6">
        {activeTab === "validate" && renderValidateTab()}
        {activeTab === "deadlines" && renderDeadlinesTab()}
        {activeTab === "alerts" && renderAlertsTab()}
        {activeTab === "imports" && renderImportsTab()}
      </CardContent>
    </Card>
  );
}
