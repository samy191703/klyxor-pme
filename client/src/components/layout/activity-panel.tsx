import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Clock, Upload, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ActivityLog } from "@shared/schema";

export default function ActivityPanel() {
  const { data: logs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "approved":
        return <Check className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <X className="w-4 h-4 text-red-600" />;
      case "upload":
        return <Upload className="w-4 h-4 text-blue-600" />;
      case "deadline":
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "approved":
        return "bg-green-50";
      case "rejected":
        return "bg-red-50";
      case "upload":
        return "bg-blue-50";
      case "deadline":
        return "bg-orange-50";
      default:
        return "bg-gray-50";
    }
  };

  const getActionText = (log: ActivityLog) => {
    switch (log.action) {
      case "approved":
        return `a validé le ${log.entityType} ${log.entityReference}`;
      case "rejected":
        return `a rejeté le ${log.entityType} ${log.entityReference}`;
      default:
        return `${log.action} ${log.entityReference}`;
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto" data-testid="activity-panel">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Flux d'activité</h2>
          <Button variant="ghost" size="sm" data-testid="button-close-panel">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4 mb-8">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-start space-x-3" data-testid={`activity-${log.id}`}>
              <div className={`w-8 h-8 ${getActionColor(log.action)} rounded-full flex items-center justify-center flex-shrink-0`}>
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{log.userName}</span>{" "}
                  {getActionText(log)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(log.createdAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Statistiques rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Contrats actifs</span>
                <span className="text-sm font-medium text-gray-900" data-testid="text-active-contracts">1,247</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Montant total</span>
                <span className="text-sm font-medium text-gray-900" data-testid="text-total-amount">€2.4M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taux de validation</span>
                <span className="text-sm font-medium text-green-600" data-testid="text-validation-rate">94.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
