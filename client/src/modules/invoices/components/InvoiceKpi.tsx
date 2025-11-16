// src/components/InvoiceKpi.tsx
import { useQuery } from "@tanstack/react-query";
import { fetchInvoiceKpis } from "../api/invoice.api";
import { Card, CardContent } from "@mui/material";

interface InvoiceKpis {
  totalInvoices: number;
  byStatus: {
    draft: number;
    inpaid: number;
    paid: number;
    cancelled: number;
    paid_parsely: number;
  };
  byType: {
    NORMAL: number;
    ADJUSTEMENT: number;
    AVOIR: number;
  };
}

export default function InvoiceKpi() {
  const { data, isLoading, isError, error } = useQuery<InvoiceKpis>({
    queryKey: ["invoice-kpis"],
    queryFn: fetchInvoiceKpis,
  });

  if (isLoading)
    return <div className="text-center py-6">Chargement des KPIs...</div>;

  if (isError)
    return (
      <div className="text-center py-6 text-red-600">
        Erreur lors du chargement des KPIs: {(error as Error).message}
      </div>
    );

  const statusColors: Record<string, string> = {
    draft: "bg-blue-100 text-blue-700",
    inpaid: "bg-red-100 text-red-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
    paid_parsely: "bg-purple-100 text-purple-700",
  };

  const typeColors: Record<string, string> = {
    NORMAL: "bg-yellow-100 text-yellow-700",
    ADJUSTEMENT: "bg-orange-100 text-orange-700",
    AVOIR: "bg-pink-100 text-pink-700",
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Ligne 1: Total Invoices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{data?.totalInvoices}</div>
            <div className="text-gray-700">Total Factures</div>
          </CardContent>
        </Card>

        {data &&
          Object.entries(data.byStatus).map(([status, count]) => (
            <Card key={status}>
              <CardContent
                className={`p-4 text-center ${statusColors[status] ?? ""}`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="capitalize">{status.replace("_", " ")}</div>
              </CardContent>
            </Card>
          ))}

        {data &&
          Object.entries(data.byType).map(([type, count]) => (
            <Card key={type}>
              <CardContent
                className={`p-4 text-center ${typeColors[type] ?? ""}`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="capitalize">{type}</div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
