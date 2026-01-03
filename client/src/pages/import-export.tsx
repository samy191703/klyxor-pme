/**
 * Module Import/Export de données KLYXOR
 * Permet l'import de données historiques depuis Excel/CSV
 * et l'export des données en différents formats
 *
 * Fonctionnalités :
 * - Import Excel/CSV avec validation et gestion des doublons
 * - Export multi-format (Excel, CSV, PDF)
 * - Historique des imports avec rapport d'erreurs
 * - Téléchargement de modèles pré-formatés
 */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  History,
  TrendingUp,
  Database,
  FileX,
  RefreshCw,
  Settings,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/layout/header";

/**
 * Composant principal de gestion des imports/exports
 * Structure en 3 onglets : Import | Export | Historique
 */
export default function ImportExport() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("import");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    updateExisting: false,
    skipDuplicates: true,
    validateData: true,
    dataType: "contracts",
  });
  const [exportOptions, setExportOptions] = useState({
    format: "xlsx",
    includeArchived: false,
    dateRange: "all",
    dataTypes: [] as string[],
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [importResults, setImportResults] = useState<any>(null);

  // Récupération de l'historique des imports
  const { data: importHistory = [] } = useQuery({
    queryKey: ["/api/import-logs"],
  });

  // Récupération des jobs d'export
  const { data: exportJobs = [] } = useQuery({
    queryKey: ["/api/export-jobs"],
  });

  // Mutation pour l'import de fichier
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulation de l'import avec progression
      setImportStatus("processing");
      setImportProgress(0);

      // Simulation de progression
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await apiRequest("POST", "/api/import/excel", formData);
      clearInterval(progressInterval);
      setImportProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      setImportStatus("success");
      setImportResults(data);
      toast({
        title: "Import réussi",
        description: `${data.imported || 0} lignes importées avec succès`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import-logs"] });
    },
    onError: (error) => {
      setImportStatus("error");
      toast({
        title: "Erreur d'import",
        description: "Une erreur est survenue lors de l'import",
        variant: "destructive",
      });
    },
  });

  // Mutation pour l'export
  const exportMutation = useMutation({
    mutationFn: async (options: any) => {
      return await apiRequest("POST", "/api/export", options);
    },
    onSuccess: async (response) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_klyxor_${new Date().toISOString().split("T")[0]}.${
        exportOptions.format
      }`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier a été téléchargé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/export-jobs"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de l'export",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Format invalide",
          description:
            "Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV",
          variant: "destructive",
        });
        return;
      }
      setUploadFile(file);
      setImportStatus("idle");
      setImportResults(null);
    }
  };

  const handleImport = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("options", JSON.stringify(importOptions));

    importMutation.mutate(formData);
  };

  const handleExport = () => {
    if (exportOptions.dataTypes.length === 0) {
      toast({
        title: "Sélection requise",
        description:
          "Veuillez sélectionner au moins un type de données à exporter",
        variant: "destructive",
      });
      return;
    }
    exportMutation.mutate(exportOptions);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* En-tête */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Import / Export
            </h1>
            <p className="text-gray-500 mt-2">
              Gérez vos imports et exports de données
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-[600px] grid-cols-3">
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            {/* Tab Import */}
            <TabsContent value="import" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Zone d'upload */}
                <Card>
                  <CardHeader>
                    <CardTitle>Import de données</CardTitle>
                    <CardDescription>
                      Importez vos données depuis un fichier Excel ou CSV
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type de données</Label>
                      <Select
                        value={importOptions.dataType}
                        onValueChange={(value) =>
                          setImportOptions({
                            ...importOptions,
                            dataType: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contracts">Contrats</SelectItem>
                          <SelectItem value="amendments">Avenants</SelectItem>
                          <SelectItem value="indexations">
                            Indexations
                          </SelectItem>
                          <SelectItem value="deadlines">Échéances</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        id="import-file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                      />
                      <label htmlFor="import-file" className="cursor-pointer">
                        {uploadFile ? (
                          <div className="space-y-2">
                            <FileSpreadsheet className="w-12 h-12 mx-auto text-green-500" />
                            <p className="text-sm font-medium">
                              {uploadFile.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600">
                              Glissez-déposez votre fichier ici ou{" "}
                              <span className="text-primary font-medium">
                                parcourir
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Excel (.xlsx, .xls) ou CSV
                            </p>
                          </>
                        )}
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="update-existing"
                          checked={importOptions.updateExisting}
                          onCheckedChange={(checked) =>
                            setImportOptions({
                              ...importOptions,
                              updateExisting: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="update-existing">
                          Mettre à jour les enregistrements existants
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="skip-duplicates"
                          checked={importOptions.skipDuplicates}
                          onCheckedChange={(checked) =>
                            setImportOptions({
                              ...importOptions,
                              skipDuplicates: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="skip-duplicates">
                          Ignorer les doublons
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="validate-data"
                          checked={importOptions.validateData}
                          onCheckedChange={(checked) =>
                            setImportOptions({
                              ...importOptions,
                              validateData: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="validate-data">
                          Valider les données avant import
                        </Label>
                      </div>
                    </div>

                    <Button
                      onClick={handleImport}
                      disabled={!uploadFile || importStatus === "processing"}
                      className="w-full"
                    >
                      {importStatus === "processing" ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Import en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Lancer l'import
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Statut et résultats */}
                <div className="space-y-6">
                  {/* Progress */}
                  {importStatus === "processing" && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Import en cours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Progress value={importProgress} className="mb-2" />
                        <p className="text-sm text-gray-500">
                          {importProgress}% complété
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Résultats */}
                  {importResults && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Résultats de l'import</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Lignes traitées</span>
                          <Badge variant="outline">
                            {importResults.processed || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Importées avec succès</span>
                          <Badge variant="default">
                            {importResults.imported || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Mises à jour</span>
                          <Badge variant="secondary">
                            {importResults.updated || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Ignorées (doublons)</span>
                          <Badge variant="outline">
                            {importResults.skipped || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Erreurs</span>
                          <Badge variant="destructive">
                            {importResults.errors || 0}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Template */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Modèles de fichier</CardTitle>
                      <CardDescription>
                        Téléchargez les modèles Excel pour préparer vos données
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Modèle Contrats
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Modèle Avenants
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Modèle Indexations
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Tab Export */}
            <TabsContent value="export" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration de l'export</CardTitle>
                    <CardDescription>
                      Sélectionnez les données à exporter et le format souhaité
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Format d'export</Label>
                      <RadioGroup
                        value={exportOptions.format}
                        onValueChange={(value) =>
                          setExportOptions({ ...exportOptions, format: value })
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="xlsx" id="xlsx" />
                          <Label htmlFor="xlsx">Excel (.xlsx)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="csv" id="csv" />
                          <Label htmlFor="csv">CSV (.csv)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pdf" id="pdf" />
                          <Label htmlFor="pdf">PDF</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label>Types de données</Label>
                      <div className="space-y-2">
                        {[
                          "Contrats",
                          "Avenants",
                          "Indexations",
                          "Échéances",
                          "Documents",
                        ].map((type) => (
                          <div
                            key={type}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`export-${type}`}
                              checked={exportOptions.dataTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setExportOptions({
                                    ...exportOptions,
                                    dataTypes: [
                                      ...exportOptions.dataTypes,
                                      type,
                                    ],
                                  });
                                } else {
                                  setExportOptions({
                                    ...exportOptions,
                                    dataTypes: exportOptions.dataTypes.filter(
                                      (t) => t !== type
                                    ),
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`export-${type}`}>{type}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Période</Label>
                      <Select
                        value={exportOptions.dateRange}
                        onValueChange={(value) =>
                          setExportOptions({
                            ...exportOptions,
                            dateRange: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les données
                          </SelectItem>
                          <SelectItem value="current_year">
                            Année en cours
                          </SelectItem>
                          <SelectItem value="last_year">
                            Année précédente
                          </SelectItem>
                          <SelectItem value="last_quarter">
                            Dernier trimestre
                          </SelectItem>
                          <SelectItem value="custom">Personnalisée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-archived"
                        checked={exportOptions.includeArchived}
                        onCheckedChange={(checked) =>
                          setExportOptions({
                            ...exportOptions,
                            includeArchived: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="include-archived">
                        Inclure les données archivées
                      </Label>
                    </div>

                    <Button
                      onClick={handleExport}
                      disabled={exportMutation.isPending}
                      className="w-full"
                    >
                      {exportMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Export en cours...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Exporter les données
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Exports récents */}
                <Card>
                  <CardHeader>
                    <CardTitle>Exports récents</CardTitle>
                    <CardDescription>
                      Historique des derniers exports effectués
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {exportJobs.slice(0, 5).map((job: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">
                                {job.fileName || `Export ${job.format}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(job.createdAt).toLocaleDateString(
                                  "fr-FR"
                                )}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Historique */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Historique des imports</CardTitle>
                  <CardDescription>
                    Consultez l'historique complet des imports de données
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {importHistory.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          {log.status === "success" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : log.status === "error" ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">{log.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {log.importType} •{" "}
                              {new Date(log.createdAt).toLocaleDateString(
                                "fr-FR"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {log.totalRows} lignes
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.successCount} réussies, {log.errorCount}{" "}
                            erreurs
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
