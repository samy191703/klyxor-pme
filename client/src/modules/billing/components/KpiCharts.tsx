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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length && label) {
      const value = payload[0].value;
      const day = new Date(label).getDate(); 

      return (
        <div
          style={{
            background: "white",
            padding: "10px",
            borderRadius: "6px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          }}
        >
          <div><strong>Jour :</strong> {day}</div>
          <div>
            <strong>Montant total :</strong>{" "}
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(value)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      
      <Card>
        <CardContent>
          <h3 className="text-gray-700 font-semibold mb-2">
            Montants prévus ce mois (HT)
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={paymentsByDay}>
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />

              <YAxis
                domain={[
                  (dataMin: number) => dataMin * 0.9,
                  (dataMax: number) => dataMax * 1.1    
                ]}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("fr-FR", {
                    maximumFractionDigits: 0,
                  }).format(v)
                }
              />

              <XAxis dataKey="date" />

              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="totalAmount"
                stroke={COLORS[0]}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
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
