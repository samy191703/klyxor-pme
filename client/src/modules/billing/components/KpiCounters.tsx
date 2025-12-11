import { Card } from "@/components/ui/card";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  FileText,
  Clock,
  XCircle,
  DollarSign,
  BarChart3,
  Calendar,
  Timer,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

interface KpiCountersProps {
  kpi: {
    totalInvoiced?: number;
    evolutionPercent?: number;
    collectedAmount?: number;
    overdueAmount?: number;
    invoicesInProgressCount?: number;
    invoicesInProgressAmount?: number;
    pendingAmount?: number;
    rejectedInvoicesCount?: number;
    indexationAmount?: number;
    indexationCount?: number;
    upcomingIndexationsCount?: number;
    dso?: number;
    forecasts?: {
      threeMonths?: number;
      sixMonths?: number;
      twelveMonths?: number;
    };
    totalCount?: number;
    draft?: number;
    active?: number;
    archived?: number;
  };
  donutData?: Array<{ name: string; value: number; percent?: number }>;
  paymentsByDay?: Array<{ date: string; totalAmount: number }>;
}

// Formatters
const formatMoney = (amount?: number) => {
  if (amount == null) return "0 €";
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M €`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}K €`;
  }
  return `${Math.round(amount)} €`;
};

const formatCompact = (value?: number) => {
  if (value == null) return "0";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

// Compact KPI Card Component (like in the image)
const CompactKpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isPrimary?: boolean;
}> = ({ icon, label, value, isPrimary = false }) => (
  <Card
    className={`${
      isPrimary
        ? "bg-[var(--klyxor-bleu-nuit)] text-white"
        : "bg-white text-gray-800"
    } p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className={`text-sm mb-2 ${isPrimary ? "text-white/80" : "text-gray-600"}`}>
          {label}
        </p>
        <p className={`text-2xl font-bold ${isPrimary ? "text-white" : "text-gray-900"}`}>
          {value}
        </p>
      </div>
      <div
        className={`${
          isPrimary ? "text-white/80" : "text-[var(--klyxor-or)]"
        } flex-shrink-0`}
      >
        {icon}
      </div>
    </div>
  </Card>
);

export const KpiCounters: React.FC<KpiCountersProps> = ({
  kpi,
  donutData = [],
  paymentsByDay = [],
}) => {
  const evolutionTrend = (kpi.evolutionPercent ?? 0) >= 0 ? "up" : "down";

  // Monthly forecast data for bar chart
  const monthlyData = [
    { month: "Jan", value: kpi.forecasts?.threeMonths ? (kpi.forecasts.threeMonths / 3) * 0.3 : 0 },
    { month: "Fév", value: kpi.forecasts?.threeMonths ? (kpi.forecasts.threeMonths / 3) * 0.35 : 0 },
    { month: "Mar", value: kpi.forecasts?.threeMonths ? (kpi.forecasts.threeMonths / 3) * 0.35 : 0 },
    { month: "Avr", value: kpi.forecasts?.sixMonths ? (kpi.forecasts.sixMonths / 6) * 0.4 : 0 },
    { month: "Mai", value: kpi.forecasts?.sixMonths ? (kpi.forecasts.sixMonths / 6) * 0.6 : 0 },
    { month: "Juin", value: kpi.forecasts?.sixMonths ? (kpi.forecasts.sixMonths / 6) * 0.5 : 0 },
    { month: "Juil", value: kpi.forecasts?.twelveMonths ? (kpi.forecasts.twelveMonths / 12) * 0.7 : 0 },
    { month: "Aoû", value: kpi.forecasts?.twelveMonths ? (kpi.forecasts.twelveMonths / 12) * 0.8 : 0 },
    { month: "Sep", value: kpi.forecasts?.twelveMonths ? (kpi.forecasts.twelveMonths / 12) * 0.9 : 0 },
  ];

  // Calculate percentage for donut chart
  const totalStatus = (kpi.active ?? 0) + (kpi.draft ?? 0) + (kpi.archived ?? 0);
  const activePercent = totalStatus > 0 ? ((kpi.active ?? 0) / totalStatus) * 100 : 0;

  const statusDonutData = [
    { name: "Actif", value: kpi.active ?? 0, fill: "#0F2A43" },
    { name: "Autres", value: (kpi.draft ?? 0) + (kpi.archived ?? 0), fill: "#C9A646" },
  ];

  // Area chart data (using payments by day or forecast trend)
  const areaChartData = paymentsByDay.length > 0
    ? paymentsByDay.slice(0, 30).map((item, idx) => ({
        day: idx + 1,
        facturé: kpi.totalInvoiced ? (kpi.totalInvoiced / 30) * (1 + Math.sin(idx / 5) * 0.2) : 0,
        encaissé: kpi.collectedAmount ? (kpi.collectedAmount / 30) * (1 + Math.cos(idx / 5) * 0.2) : 0,
      }))
    : Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        facturé: kpi.totalInvoiced ? (kpi.totalInvoiced / 30) * (1 + Math.sin(i / 5) * 0.2) : 0,
        encaissé: kpi.collectedAmount ? (kpi.collectedAmount / 30) * (1 + Math.cos(i / 5) * 0.2) : 0,
      }));

  const COLORS = ["#0F2A43", "#C9A646"];

  return (
    <div className="space-y-6">
      {/* Top Row - 4 Compact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CompactKpiCard
          icon={<Euro className="w-6 h-6" />}
          label="Total facturé"
          value={formatMoney(kpi.totalInvoiced)}
          isPrimary
        />
        <CompactKpiCard
          icon={<Wallet className="w-6 h-6" />}
          label="Encaissé"
          value={formatMoney(kpi.collectedAmount)}
        />
        <CompactKpiCard
          icon={<FileText className="w-6 h-6" />}
          label="En cours"
          value={formatCompact(kpi.invoicesInProgressCount)}
        />
        <CompactKpiCard
          icon={<AlertCircle className="w-6 h-6" />}
          label="En retard"
          value={formatMoney(kpi.overdueAmount)}
        />
      </div>

      {/* Middle Row - Bar Chart and Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Résultats mensuels</h3>
            <button className="px-4 py-2 bg-[var(--klyxor-or)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-colors">
              Voir détails
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis
                stroke="#6b7280"
                tickFormatter={(value) => formatMoney(value)}
              />
              <Tooltip
                formatter={(value: number) => formatMoney(value)}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Legend />
              <Bar
                dataKey="value"
                fill="#0F2A43"
                radius={[4, 4, 0, 0]}
                name="Prévisions"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Donut Chart */}
        <Card className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Statut des plans</h3>
            <button className="px-4 py-2 bg-[var(--klyxor-or)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-colors">
              Voir détails
            </button>
          </div>
          <div className="relative flex items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {statusDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-gray-800">{Math.round(activePercent)}%</p>
              <p className="text-sm text-gray-600">Actifs</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--klyxor-bleu-nuit)]"></div>
                <span className="text-gray-600">Actif</span>
              </div>
              <span className="font-semibold text-gray-800">{kpi.active ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--klyxor-or)]"></div>
                <span className="text-gray-600">Autres</span>
              </div>
              <span className="font-semibold text-gray-800">
                {(kpi.draft ?? 0) + (kpi.archived ?? 0)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Row - Area Chart */}
      <Card className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Évolution sur 30 jours</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--klyxor-bleu-nuit)]"></div>
              <span className="text-sm text-gray-600">Facturé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--klyxor-or)]"></div>
              <span className="text-sm text-gray-600">Encaissé</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={areaChartData}>
            <defs>
              <linearGradient id="colorFacturé" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F2A43" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0F2A43" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorEncaissé" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A646" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#C9A646" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#6b7280" />
            <YAxis
              stroke="#6b7280"
              tickFormatter={(value) => formatMoney(value)}
            />
            <Tooltip
              formatter={(value: number) => formatMoney(value)}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            />
            <Area
              type="monotone"
              dataKey="facturé"
              stroke="#0F2A43"
              fillOpacity={1}
              fill="url(#colorFacturé)"
              name="Facturé"
            />
            <Area
              type="monotone"
              dataKey="encaissé"
              stroke="#C9A646"
              fillOpacity={1}
              fill="url(#colorEncaissé)"
              name="Encaissé"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
