// client/src/pages/import-export.tsx

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
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type ImportStatus = "idle" | "processing" | "success" | "error";

/** Types minimaux pour éviter le `unknown` des queries */
type ImportLog = {
  id?: string;
  status: "success" | "error" | "warning" | string;
  fileName: string;
  importType: string;
  createdAt: string | Date;
  totalRows: number;
  successCount: number;
  errorCount: number;
};

type ExportJob = {
  id?: string;
  fileName?: string;
  format?: string;
  createdAt: string | Date;
};

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
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importResults, setImportResults] = useState<any>(null);

  // Historique imports (TYPÉ)
  const { data: importHistory = [] } = useQuery<ImportLog[]>({
    queryKey: ["/api/import-logs"],
  });

  // Jobs exports (TYPÉ)
  const { data: exportJobs = [] } = useQuery<ExportJob[]>({
    queryKey: ["/api/export-jobs"],
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setImportStatus("processing");
      setImportProgress(0);

      const progressInterval = setInterval(() => {
        setImportProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      try {
        const response = await apiRequest("POST", "/api/import/excel", formData);
        return await response.json();
      } finally {
        clearInterval(progressInterval);
        setImportProgress(100);
      }
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
    onError: () => {
      setImportStatus("error");
      toast({
        title: "Erreur d'import",
        description: "Une erreur est survenue lors de l'import",
        variant: "destructive",
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: any) => {
      return await apiRequest("POST", "/api/export", options);
    },
    onSuccess: async (response) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `export_klyxor_${new Date().toISOString().split("T")[0]}.${exportOptions.format}`;
      a.click();

      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier a été téléchargé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/export-jobs"] });
    },
    onError: () => {
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de l'export",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV",
        variant: "destructive",
      });
      return;
    }

    setUploadFile(file);
    setImportStatus("idle");
    setImportResults(null);
    setImportProgress(0);
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
        description: "Veuillez sélectionner au moins un type de données à exporter",
        variant: "destructive",
      });
      return;
    }
    exportMutation.mutate(exportOptions);
  };

  // IMPORTANT: Header global dans AppLayout (une seule fois)
  return (
    <div className="w-full" data-testid="import-export-main">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Import / Export</h1>
          <p className="mt-2 text-gray-500">Gérez vos imports et exports de données</p>
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
              <Card>
                <CardHeader>
                  <CardTitle>Import de données</CardTitle>
                  <CardDescription>Importez vos données depuis un fichier Excel ou CSV</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type de données</Label>
                    <Select
                      value={importOptions.dataType}
                      onValueChange={(value) =>
                        setImportOptions((prev) => ({ ...prev, dataType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contracts">Contrats</SelectItem>
                        <SelectItem value="amendments">Avenants</SelectItem>
                        <SelectItem value="indexations">Indexations</SelectItem>
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
                          <p className="text-sm font-medium">{uploadFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-sm text-gray-600">
                            Glissez-déposez votre fichier ici ou{" "}
                            <span className="text-primary font-medium">parcourir</span>
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
                          setImportOptions((prev) => ({
                            ...prev,
                            updateExisting: checked as boolean,
                          }))
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
                          setImportOptions((prev) => ({
                            ...prev,
                            skipDuplicates: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="skip-duplicates">Ignorer les doublons</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validate-data"
                        checked={importOptions.validateData}
                        onCheckedChange={(checked) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            validateData: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="validate-data">Valider les données avant import</Label>
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

              <div className="space-y-6">
                {importStatus === "processing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Import en cours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={importProgress} className="mb-2" />
                      <p className="text-sm text-gray-500">{importProgress}% complété</p>
                    </CardContent>
                  </Card>
                )}

                {importResults && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Résultats de l'import</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Lignes traitées</span>
                        <Badge variant="outline">{importResults.processed || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Importées avec succès</span>
                        <Badge variant="default">{importResults.imported || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mises à jour</span>
                        <Badge variant="secondary">{importResults.updated || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ignorées (doublons)</span>
                        <Badge variant="outline">{importResults.skipped || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Erreurs</span>
                        <Badge variant="destructive">{importResults.errors || 0}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Modèles de fichier</CardTitle>
                    <CardDescription>
                      Téléchargez les modèles Excel pour préparer vos données
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Modèle Contrats
                      <Download className="w-4 h-4 ml-auto" />
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Modèle Avenants
                      <Download className="w-4 h-4 ml-auto" />
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
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
                        setExportOptions((prev) => ({ ...prev, format: value }))
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
                      {["Contrats", "Avenants", "Indexations", "Échéances", "Documents"].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`export-${type}`}
                            checked={exportOptions.dataTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              setExportOptions((prev) => ({
                                ...prev,
                                dataTypes: checked
                                  ? [...prev.dataTypes, type]
                                  : prev.dataTypes.filter((t) => t !== type),
                              }));
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
                        setExportOptions((prev) => ({ ...prev, dateRange: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les données</SelectItem>
                        <SelectItem value="current_year">Année en cours</SelectItem>
                        <SelectItem value="last_year">Année précédente</SelectItem>
                        <SelectItem value="last_quarter">Dernier trimestre</SelectItem>
                        <SelectItem value="custom">Personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-archived"
                      checked={exportOptions.includeArchived}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeArchived: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="include-archived">Inclure les données archivées</Label>
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

              <Card>
                <CardHeader>
                  <CardTitle>Exports récents</CardTitle>
                  <CardDescription>
                    Historique des derniers exports effectués
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exportJobs.slice(0, 5).map((job, index) => (
                      <div
                        key={job.id ?? index}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">
                              {job.fileName || (job.format ? `Export ${job.format}` : "Export")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(job.createdAt).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
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
                  {importHistory.map((log, index) => (
                    <div
                      key={log.id ?? index}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center space-x-4">
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : log.status === "error" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}

                        <div>
                          <p className="font-medium">{log.fileName}</p>
                          <p className="text-sm text-gray-500">
                            {log.importType} •{" "}
                            {new Date(log.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">{log.totalRows} lignes</p>
                        <p className="text-xs text-gray-500">
                          {log.successCount} réussies, {log.errorCount} erreurs
                        </p>
                      </div>
                    </div>
                  ))}

                  {importHistory.length === 0 && (
                    <Alert>
                      <AlertTitle>Aucun import</AlertTitle>
                      <AlertDescription>
                        Aucun historique d'import n'est disponible pour le moment.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
