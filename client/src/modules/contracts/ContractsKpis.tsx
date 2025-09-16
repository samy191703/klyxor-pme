import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, XCircle, FileCheck } from "lucide-react";

export default function ContractsKpis({
  kpis,
  loading,
}: {
  kpis: Record<string, number>;
  loading?: boolean;
}) {
  const sk = (v: number) => (loading ? "—" : String(v));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 lg:mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
          <div className="text-3xl font-bold">{sk(kpis?.drafts || 0)}</div>
          <p className="text-sm text-gray-600">Brouillonoooos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-3xl font-bold">{sk(kpis?.toValidate || 0)}</div>
          <p className="text-sm text-gray-600">À validxer</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{sk(kpis?.active || 0)}</div>
          <p className="text-sm text-gray-600">Actifs</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="text-3xl font-bold">{sk(kpis?.terminated || 0)}</div>
          <p className="text-sm text-gray-600">Résiliés</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <FileCheck className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{sk(kpis?.closed || 0)}</div>
          <p className="text-sm text-gray-600">Clôturés</p>
        </CardContent>
      </Card>
    </div>
  );
}
