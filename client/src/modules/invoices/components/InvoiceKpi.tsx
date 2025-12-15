// src/components/InvoiceKpi.tsx
import { useQuery } from "@tanstack/react-query";
import { fetchInvoiceKpis } from "../api/invoice.api";
import { Card, CardContent } from "@mui/material";
import { INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "@/modules/invoices/domain/constants";

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

  return (
    <div className="flex flex-col gap-4 w-full">

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data?.totalInvoices}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>

        {Object.entries(data!.byStatus).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm">
                {INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {Object.entries(data!.byType).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm">
                {INVOICE_TYPE_LABELS[type as keyof typeof INVOICE_TYPE_LABELS]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
