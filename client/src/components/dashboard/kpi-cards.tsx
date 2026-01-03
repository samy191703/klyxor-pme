import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  TrendingUp,
  Calendar,
  Clock,
  XCircle,
  Edit,
  FileX,
  AlertTriangle,
} from "lucide-react";

interface KPICardsProps {
  kpis: {
    contractsToValidate: number;
    indexationsToValidate: number;
    dueDatesJ30: number;
    dueDatesJ7: number;
    dueDatesJ1: number;
    delayedWorkflows: number;
    pendingTerminations: number;
    amendmentsToValidate: number;
    missingDocuments: number;
    importErrors: number;
  };
}

const kpiConfig = [
  {
    key: "contractsToValidate" as keyof KPICardsProps["kpis"],
    title: "Contrats à valider",
    description: "Contrats en attente de validation",
    icon: FileText,
    color: "warning",
  },
  {
    key: "indexationsToValidate" as keyof KPICardsProps["kpis"],
    title: "Indexations à valider",
    description: "Calculs automatiques à approuver",
    icon: TrendingUp,
    color: "info",
  },
  {
    key: "dueDatesJ30" as keyof KPICardsProps["kpis"],
    title: "Échéances J-30",
    description: "Contrats arrivant à échéance",
    icon: Calendar,
    color: "warning",
  },
  {
    key: "delayedWorkflows" as keyof KPICardsProps["kpis"],
    title: "Workflows > 24h",
    description: "Étapes en retard",
    icon: Clock,
    color: "error",
  },
  {
    key: "pendingTerminations" as keyof KPICardsProps["kpis"],
    title: "Résiliations en attente",
    description: "Demandes non validées",
    icon: XCircle,
    color: "error",
  },
  {
    key: "amendmentsToValidate" as keyof KPICardsProps["kpis"],
    title: "Avenants à valider",
    description: "Modifications en attente",
    icon: Edit,
    color: "warning",
  },
  {
    key: "missingDocuments" as keyof KPICardsProps["kpis"],
    title: "Documents manquants",
    description: "Pièces jointes obligatoires",
    icon: FileX,
    color: "error",
  },
  {
    key: "importErrors" as keyof KPICardsProps["kpis"],
    title: "Imports en erreur",
    description: "Imports ayant échoué",
    icon: AlertTriangle,
    color: "error",
  },
];

const getColorClasses = (color: string) => {
  switch (color) {
    case "warning":
      return {
        iconBg: "bg-warning/10",
        iconText: "text-warning",
        numberText: "text-warning",
      };
    case "info":
      return {
        iconBg: "bg-info/10",
        iconText: "text-info",
        numberText: "text-info",
      };
    case "error":
      return {
        iconBg: "bg-error/10",
        iconText: "text-error",
        numberText: "text-error",
      };
    case "success":
      return {
        iconBg: "bg-success/10",
        iconText: "text-success",
        numberText: "text-success",
      };
    default:
      return {
        iconBg: "bg-gray-100",
        iconText: "text-gray-600",
        numberText: "text-gray-900",
      };
  }
};

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiConfig.map((config) => {
        const Icon = config.icon;
        const colors = getColorClasses(config.color);
        const value = kpis[config.key];

        return (
          <Card
            key={config.key}
            className="hover:shadow-md transition-shadow cursor-pointer"
            data-testid={`kpi-card-${config.key}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${colors.iconText} w-6 h-6`} />
                </div>
                <span className={`text-2xl font-bold ${colors.numberText}`} data-testid={`kpi-value-${config.key}`}>
                  {value}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{config.title}</h3>
              <p className="text-sm text-gray-600">{config.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
