// components/KpiCounters.tsx
import { Card, CardContent } from "@mui/material";

interface KpiCountersProps {
  kpi: {
    totalCount: number;
    draft: number;
    active: number;
    archived: number;
    A_ECHOIR: number;
    TERME_ECHU: number;
  };
}

export const KpiCounters: React.FC<KpiCountersProps> = ({ kpi }) => {
  return (
    <div className="space-y-3 mb-2">
      {/* Ligne 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{kpi.totalCount}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpi.draft}</div>
            <div className="text-sm text-gray-600">Brouillon</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{kpi.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{kpi.archived}</div>
            <div className="text-sm text-gray-600">Archived</div>
          </CardContent>
        </Card>
      </div>

      {/* Ligne 2 */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpi.A_ECHOIR}</div>
            <div className="text-sm text-gray-600">A Échoir</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpi.TERME_ECHU}</div>
            <div className="text-sm text-gray-600">Terme Échu</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
