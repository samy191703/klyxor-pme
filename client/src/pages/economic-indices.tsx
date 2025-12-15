import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw, Calendar, Activity } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
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

export default function EconomicIndices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCode, setSelectedCode] = useState<string>("IPC");

  // Récupération de tous les indices
  const { data: indices = [], isLoading } = useQuery<EconomicIndex[]>({
    queryKey: ["/api/economic-indices"],
  });

  // Récupération du dernier indice par code
  const { data: latestIPC } = useQuery<EconomicIndex>({
    queryKey: [`/api/economic-indices/latest/IPC`],
    enabled: indices.length > 0,
  });

  const { data: latestICHT } = useQuery<EconomicIndex>({
    queryKey: [`/api/economic-indices/latest/ICHT`],
    enabled: indices.length > 0,
  });

  const { data: latestIPPAP } = useQuery<EconomicIndex>({
    queryKey: [`/api/economic-indices/latest/IPPAP`],
    enabled: indices.length > 0,
  });

  // Mutation pour synchroniser les indices
  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/economic-indices/sync"),
    onSuccess: (data) => {
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

  // Filtrer les indices par code
  const getIndicesByCode = (code: string) => {
    return indices
      .filter(index => index.code === code)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Préparer les données pour le graphique
  const prepareChartData = (code: string) => {
    const data = getIndicesByCode(code)
      .slice(0, 12) // Derniers 12 mois
      .reverse()
      .map(index => ({
        date: format(new Date(index.date), "MMM yyyy", { locale: fr }),
        valeur: parseFloat(index.value),
        mois: `${index.month}/${index.year}`,
      }));
    return data;
  };

  // Calculer la variation
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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Indices Économiques INSEE</h1>
          <p className="text-muted-foreground mt-2">
            Suivi des indices IPC, ICHT et IPPAP pour les calculs d'indexation
          </p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-indices"
        >
          {syncMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Synchronisation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser
            </>
          )}
        </Button>
      </div>

      {indices.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aucun indice disponible</AlertTitle>
          <AlertDescription>
            Cliquez sur "Synchroniser" pour récupérer les derniers indices INSEE.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Cartes récapitulatives */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {latestIPC && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>IPC</span>
                    <Badge variant="outline">Base {latestIPC.base}</Badge>
                  </CardTitle>
                  <CardDescription>Indice des Prix à la Consommation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestIPC.value}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(latestIPC.date), "MMMM yyyy", { locale: fr })}
                  </p>
                  {indices.filter(i => i.code === "IPC").length > 1 && (
                    <div className={`flex items-center mt-2 ${getVariationColor(
                      parseFloat(calculateVariation(
                        latestIPC.value,
                        indices.filter(i => i.code === "IPC")[1].value
                      ))
                    )}`}>
                      {getVariationIcon(parseFloat(calculateVariation(
                        latestIPC.value,
                        indices.filter(i => i.code === "IPC")[1].value
                      )))}
                      <span className="ml-1 text-sm">
                        {calculateVariation(
                          latestIPC.value,
                          indices.filter(i => i.code === "IPC")[1].value
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
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>ICHT</span>
                    <Badge variant="outline">Base {latestICHT.base}</Badge>
                  </CardTitle>
                  <CardDescription>Indice du Coût Horaire du Travail</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestICHT.value}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(latestICHT.date), "MMMM yyyy", { locale: fr })}
                  </p>
                  {indices.filter(i => i.code === "ICHT").length > 1 && (
                    <div className={`flex items-center mt-2 ${getVariationColor(
                      parseFloat(calculateVariation(
                        latestICHT.value,
                        indices.filter(i => i.code === "ICHT")[1].value
                      ))
                    )}`}>
                      {getVariationIcon(parseFloat(calculateVariation(
                        latestICHT.value,
                        indices.filter(i => i.code === "ICHT")[1].value
                      )))}
                      <span className="ml-1 text-sm">
                        {calculateVariation(
                          latestICHT.value,
                          indices.filter(i => i.code === "ICHT")[1].value
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
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>IPPAP</span>
                    <Badge variant="outline">Base {latestIPPAP.base}</Badge>
                  </CardTitle>
                  <CardDescription>Indice de Prix de Production</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestIPPAP.value}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(latestIPPAP.date), "MMMM yyyy", { locale: fr })}
                  </p>
                  {indices.filter(i => i.code === "IPPAP").length > 1 && (
                    <div className={`flex items-center mt-2 ${getVariationColor(
                      parseFloat(calculateVariation(
                        latestIPPAP.value,
                        indices.filter(i => i.code === "IPPAP")[1].value
                      ))
                    )}`}>
                      {getVariationIcon(parseFloat(calculateVariation(
                        latestIPPAP.value,
                        indices.filter(i => i.code === "IPPAP")[1].value
                      )))}
                      <span className="ml-1 text-sm">
                        {calculateVariation(
                          latestIPPAP.value,
                          indices.filter(i => i.code === "IPPAP")[1].value
                        )}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabs pour les détails */}
          <Tabs value={selectedCode} onValueChange={setSelectedCode}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="IPC">IPC</TabsTrigger>
              <TabsTrigger value="ICHT">ICHT</TabsTrigger>
              <TabsTrigger value="IPPAP">IPPAP</TabsTrigger>
            </TabsList>

            {["IPC", "ICHT", "IPPAP"].map((code) => (
              <TabsContent key={code} value={code} className="space-y-6">
                {/* Graphique d'évolution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="mr-2 h-5 w-5" />
                      Évolution de l'indice {code}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
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

                {/* Tableau des valeurs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
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
                        {getIndicesByCode(code).slice(0, 12).map((index, idx) => {
                          const prevIndex = getIndicesByCode(code)[idx + 1];
                          const variation = prevIndex 
                            ? parseFloat(calculateVariation(index.value, prevIndex.value))
                            : 0;
                          
                          return (
                            <TableRow key={index.id} data-testid={`row-index-${index.id}`}>
                              <TableCell>
                                {format(new Date(index.date), "MMMM yyyy", { locale: fr })}
                              </TableCell>
                              <TableCell className="font-medium">
                                {index.value}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">Base {index.base}</Badge>
                              </TableCell>
                              <TableCell>
                                {prevIndex && (
                                  <div className={`flex items-center ${getVariationColor(variation)}`}>
                                    {getVariationIcon(variation)}
                                    <span className="ml-1">{variation.toFixed(2)}%</span>
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
    </div>
  );
}