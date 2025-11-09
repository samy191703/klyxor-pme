// components/KpiCharts.tsx
import { Card, CardContent } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface KpiChartsProps {
  paymentsByDay: Array<{ date: string; totalAmount: number }>;
  donutData: Array<{ name: string; value: number; percent?: number }>;
  COLORS: string[];
}

export const KpiCharts: React.FC<KpiChartsProps> = ({
  paymentsByDay,
  donutData,
  COLORS,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      
      {/* Courbe paiements du mois */}
      <Card>
        <CardContent>
          <h3 className="text-gray-700 font-semibold mb-2">
            Montants prévus ce mois (HT)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={paymentsByDay}>
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(value)
                }
              />
              <Line
                type="monotone"
                dataKey="totalAmount"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Donut statut */}
      <Card>
        <CardContent>
          <h3 className="text-gray-700 font-semibold mb-3">
            Répartition par statut
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Tooltip
                formatter={(value: number, _name, props) => {
                  const p = props.payload.percent?.toFixed(1) ?? 0;
                  return [`${value} (${p}%)`, ""];
                }}
              />
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
              >
                {donutData.map((_entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
};
