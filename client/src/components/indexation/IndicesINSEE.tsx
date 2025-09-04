import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw, Activity, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface EconomicIndex {
  id: string;
  seriesId: string;
  code: string;
  name: string;
  date: string;
  value: string;
  year: number;
  month: number;
  base: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export function IndicesINSEE() {
  const [selectedINSEECode, setSelectedINSEECode] = useState<string>("IPC");

  // Requêtes pour les indices INSEE
  const { data: indicesINSEE = [], isLoading: isLoadingINSEE } = useQuery<EconomicIndex[]>({
    queryKey: ["/api/economic-indices"],
  });

  const { data: latestIPC } = useQuery<EconomicIndex>({
    queryKey: [`/api/economic-indices/latest/IPC`],
    enabled: indicesINSEE.length > 0,
  });

  const { data: latestICHT } = useQuery<EconomicIndex>({
    queryKey: [`/api/economic-indices/latest/ICHT`],
    enabled: indicesINSEE.length > 0,
  });

  const { data: latestIPPAP } = useQuery<EconomicIndex>({
    queryKey: [`/api/economic-indices/latest/IPPAP`],
    enabled: indicesINSEE.length > 0,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/economic-indices/sync"),
    onSuccess: async (response) => {
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Synchronisation réussie",
          description: `${data.count} indices ont été mis à jour`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/economic-indices"] });
      } else {
        toast({
          title: "Erreur de synchronisation",
          description: data.error || "Impossible de synchroniser les indices",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la synchronisation",
        variant: "destructive",
      });
    },
  });

  const getIndicesByCode = (code: string) => {
    return indicesINSEE
      .filter(index => index.code === code)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const prepareChartData = (code: string) => {
    const data = getIndicesByCode(code)
      .slice(0, 12)
      .reverse()
      .map(index => ({
        date: format(new Date(index.date), "MMM yyyy", { locale: fr }),
        valeur: parseFloat(index.value),
        mois: `${index.month}/${index.year}`,
      }));
    return data;
  };

  const calculateVariation = (current: string, previous: string) => {
    const curr = parseFloat(current);
    const prev = parseFloat(previous);
    const variation = ((curr - prev) / prev) * 100;
    return variation.toFixed(2);
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return "text-red-600";
    if (variation < 0) return "text-green-600";
    return "text-gray-600";
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  if (isLoadingINSEE) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Indices économiques INSEE</h3>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          size="sm"
          data-testid="button-sync-insee"
        >
          {syncMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Synchronisation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser INSEE
            </>
          )}
        </Button>
      </div>

      {indicesINSEE.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucun indice INSEE disponible. Cliquez sur "Synchroniser INSEE" pour récupérer les derniers indices.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Cartes récapitulatives */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {latestIPC && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>IPC</span>
                    <Badge variant="outline" className="text-xs">Base {latestIPC.base}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{latestIPC.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(latestIPC.date), "MMMM yyyy", { locale: fr })}
                  </p>
                  {indicesINSEE.filter(i => i.code === "IPC").length > 1 && (
                    <div className={`flex items-center mt-2 ${getVariationColor(
                      parseFloat(calculateVariation(
                        latestIPC.value,
                        indicesINSEE.filter(i => i.code === "IPC")[1].value
                      ))
                    )}`}>
                      {getVariationIcon(parseFloat(calculateVariation(
                        latestIPC.value,
                        indicesINSEE.filter(i => i.code === "IPC")[1].value
                      )))}
                      <span className="ml-1 text-xs">
                        {calculateVariation(
                          latestIPC.value,
                          indicesINSEE.filter(i => i.code === "IPC")[1].value
                        )}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {latestICHT && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>ICHT</span>
                    <Badge variant="outline" className="text-xs">Base {latestICHT.base}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{latestICHT.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(latestICHT.date), "MMMM yyyy", { locale: fr })}
                  </p>
                  {indicesINSEE.filter(i => i.code === "ICHT").length > 1 && (
                    <div className={`flex items-center mt-2 ${getVariationColor(
                      parseFloat(calculateVariation(
                        latestICHT.value,
                        indicesINSEE.filter(i => i.code === "ICHT")[1].value
                      ))
                    )}`}>
                      {getVariationIcon(parseFloat(calculateVariation(
                        latestICHT.value,
                        indicesINSEE.filter(i => i.code === "ICHT")[1].value
                      )))}
                      <span className="ml-1 text-xs">
                        {calculateVariation(
                          latestICHT.value,
                          indicesINSEE.filter(i => i.code === "ICHT")[1].value
                        )}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {latestIPPAP && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>IPPAP</span>
                    <Badge variant="outline" className="text-xs">Base {latestIPPAP.base}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{latestIPPAP.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(latestIPPAP.date), "MMMM yyyy", { locale: fr })}
                  </p>
                  {indicesINSEE.filter(i => i.code === "IPPAP").length > 1 && (
                    <div className={`flex items-center mt-2 ${getVariationColor(
                      parseFloat(calculateVariation(
                        latestIPPAP.value,
                        indicesINSEE.filter(i => i.code === "IPPAP")[1].value
                      ))
                    )}`}>
                      {getVariationIcon(parseFloat(calculateVariation(
                        latestIPPAP.value,
                        indicesINSEE.filter(i => i.code === "IPPAP")[1].value
                      )))}
                      <span className="ml-1 text-xs">
                        {calculateVariation(
                          latestIPPAP.value,
                          indicesINSEE.filter(i => i.code === "IPPAP")[1].value
                        )}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Graphique et tableau */}
          <Tabs value={selectedINSEECode} onValueChange={setSelectedINSEECode}>
            <TabsList className="grid w-full grid-cols-3 max-w-[300px]">
              <TabsTrigger value="IPC">IPC</TabsTrigger>
              <TabsTrigger value="ICHT">ICHT</TabsTrigger>
              <TabsTrigger value="IPPAP">IPPAP</TabsTrigger>
            </TabsList>

            {["IPC", "ICHT", "IPPAP"].map((code) => (
              <TabsContent key={code} value={code} className="space-y-4">
                {/* Graphique */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Activity className="mr-2 h-4 w-4" />
                      Évolution de l'indice {code}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={prepareChartData(code)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="valeur" 
                          stroke="#8884d8" 
                          name={`Indice ${code}`}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tableau */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      Historique des valeurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Valeur</TableHead>
                          <TableHead>Base</TableHead>
                          <TableHead>Variation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getIndicesByCode(code).slice(0, 8).map((index, idx) => {
                          const prevIndex = getIndicesByCode(code)[idx + 1];
                          const variation = prevIndex 
                            ? parseFloat(calculateVariation(index.value, prevIndex.value))
                            : 0;
                          
                          return (
                            <TableRow key={index.id} data-testid={`row-index-${index.id}`}>
                              <TableCell className="text-sm">
                                {format(new Date(index.date), "MMMM yyyy", { locale: fr })}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {index.value}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">Base {index.base}</Badge>
                              </TableCell>
                              <TableCell>
                                {prevIndex && (
                                  <div className={`flex items-center ${getVariationColor(variation)}`}>
                                    {getVariationIcon(variation)}
                                    <span className="ml-1 text-sm">{variation.toFixed(2)}%</span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </>
  );
}