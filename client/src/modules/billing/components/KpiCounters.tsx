// components/KpiCounters.tsx
import { Card, CardContent } from "@mui/material";
import { BILLING_STATUS_LABELS } from "../domain/constants";
import { BILLING_TYPE_LABELS } from "@shared/enums/billing.enum";

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{kpi.totalCount}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpi.draft}</div>
            <div className="text-sm text-gray-600">
              {BILLING_STATUS_LABELS.draft}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{kpi.active}</div>
            <div className="text-sm text-gray-600">
              {BILLING_STATUS_LABELS.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{kpi.archived}</div>
            <div className="text-sm text-gray-600">
              {BILLING_STATUS_LABELS.archived}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ligne 2 */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpi.A_ECHOIR}</div>
            <div className="text-sm text-gray-600">
              {BILLING_TYPE_LABELS.A_ECHOIR}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpi.TERME_ECHU}</div>
            <div className="text-sm text-gray-600">
              {BILLING_TYPE_LABELS.TERME_ECHU}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
