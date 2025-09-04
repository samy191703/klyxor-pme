/**
 * Module de gestion des workflows KLYXOR
 * Permet l'exécution et le suivi des workflows métier
 * 
 * Workflows disponibles :
 * - Résiliation de contrat
 * - Modifications manuelles
 * - Validation de contrat
 * - Indexation
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Contract, WorkflowInstance } from "@shared/schema";
import {
  GitBranch, Play, Pause, CheckCircle2, XCircle, Clock,
  FileX, Edit3, AlertTriangle, RefreshCw, ChevronRight,
  User, Calendar, Hash, Building2, Activity
} from "lucide-react";

// Schémas de validation pour les formulaires
const terminationSchema = z.object({
  contractId: z.string().min(1, "Veuillez sélectionner un contrat"),
  terminationDate: z.string().min(1, "Date de résiliation requise"),
  reason: z.string().min(10, "Veuillez détailler le motif de résiliation"),
  penalties: z.string().optional(),
  noticeGiven: z.string().min(1, "Date de préavis requise"),
  finalInvoice: z.boolean().default(false),
  returnDocuments: z.boolean().default(false)
});

const manualModificationSchema = z.object({
  contractId: z.string().min(1, "Veuillez sélectionner un contrat"),
  modificationType: z.string().min(1, "Type de modification requis"),
  description: z.string().min(10, "Description détaillée requise"),
  newAmount: z.string().optional(),
  effectiveDate: z.string().min(1, "Date d'effet requise"),
  justification: z.string().min(10, "Justification requise")
});

type TerminationFormData = z.infer<typeof terminationSchema>;
type ManualModificationFormData = z.infer<typeof manualModificationSchema>;

export default function Workflows() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [showModificationDialog, setShowModificationDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null);

  // Récupération des contrats actifs
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Récupération des instances de workflow
  const { data: workflowInstances = [] } = useQuery<WorkflowInstance[]>({
    queryKey: ["/api/workflow-instances"],
  });

  // Filtrage des instances par statut
  const activeWorkflows = workflowInstances.filter(w => w.status === "in_progress");
  const completedWorkflows = workflowInstances.filter(w => w.status === "completed");
  const failedWorkflows = workflowInstances.filter(w => w.status === "failed" || w.status === "cancelled");

  // Formulaire de résiliation
  const terminationForm = useForm<TerminationFormData>({
    resolver: zodResolver(terminationSchema),
    defaultValues: {
      finalInvoice: false,
      returnDocuments: false
    }
  });

  // Formulaire de modification manuelle
  const modificationForm = useForm<ManualModificationFormData>({
    resolver: zodResolver(manualModificationSchema),
    defaultValues: {
      modificationType: "amount"
    }
  });

  // Mutation pour démarrer un workflow de résiliation
  const startTerminationMutation = useMutation({
    mutationFn: async (data: TerminationFormData) => {
      return await apiRequest("POST", "/api/workflows/termination", data);
    },
    onSuccess: () => {
      toast({
        title: "Workflow démarré",
        description: "Le processus de résiliation a été initié avec succès.",
      });
      setShowTerminationDialog(false);
      terminationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le workflow de résiliation.",
        variant: "destructive",
      });
    }
  });

  // Mutation pour démarrer un workflow de modification
  const startModificationMutation = useMutation({
    mutationFn: async (data: ManualModificationFormData) => {
      return await apiRequest("POST", "/api/workflows/modification", data);
    },
    onSuccess: () => {
      toast({
        title: "Workflow démarré",
        description: "Le processus de modification a été initié avec succès.",
      });
      setShowModificationDialog(false);
      modificationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le workflow de modification.",
        variant: "destructive",
      });
    }
  });

  // Mutation pour annuler un workflow
  const cancelWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return await apiRequest("POST", `/api/workflows/${workflowId}/cancel`, {});
    },
    onSuccess: () => {
      toast({
        title: "Workflow annulé",
        description: "Le workflow a été annulé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-instances"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler le workflow.",
        variant: "destructive",
      });
    }
  });

  const onSubmitTermination = (data: TerminationFormData) => {
    startTerminationMutation.mutate(data);
  };

  const onSubmitModification = (data: ManualModificationFormData) => {
    startModificationMutation.mutate(data);
  };

  const getWorkflowIcon = (entityType: string) => {
    switch (entityType) {
      case "termination":
        return <FileX className="h-4 w-4" />;
      case "modification":
        return <Edit3 className="h-4 w-4" />;
      case "contract":
        return <FileX className="h-4 w-4" />;
      case "indexation":
        return <Activity className="h-4 w-4" />;
      default:
        return <GitBranch className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const WorkflowCard = ({ workflow }: { workflow: WorkflowInstance }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedWorkflow(workflow)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getWorkflowIcon(workflow.entityType)}
            <CardTitle className="text-base">
              {workflow.entityType === "termination" && "Résiliation de contrat"}
              {workflow.entityType === "modification" && "Modification manuelle"}
              {workflow.entityType === "contract" && "Validation de contrat"}
              {workflow.entityType === "indexation" && "Indexation"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(workflow.status)}
            <Badge variant={
              workflow.status === "completed" ? "success" :
              workflow.status === "in_progress" ? "default" :
              workflow.status === "failed" ? "destructive" :
              "secondary"
            }>
              {workflow.status === "in_progress" && "En cours"}
              {workflow.status === "completed" && "Terminé"}
              {workflow.status === "failed" && "Échec"}
              {workflow.status === "cancelled" && "Annulé"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span>ID: {workflow.id.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Démarré par: {workflow.startedBy}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Date: {new Date(workflow.startedAt).toLocaleDateString('fr-FR')}</span>
          </div>
          {workflow.status === "in_progress" && workflow.currentStep !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Progression</span>
                <span>Étape {workflow.currentStep + 1}</span>
              </div>
              <Progress value={(workflow.currentStep + 1) * 25} className="h-2" />
            </div>
          )}
        </div>
        {workflow.status === "in_progress" && (
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                cancelWorkflowMutation.mutate(workflow.id);
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6" data-testid="workflows-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Orchestration des processus métier et suivi des workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTerminationDialog(true)} data-testid="button-start-termination">
            <FileX className="h-4 w-4 mr-2" />
            Résiliation
          </Button>
          <Button onClick={() => setShowModificationDialog(true)} variant="outline" data-testid="button-start-modification">
            <Edit3 className="h-4 w-4 mr-2" />
            Modification manuelle
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workflows actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">En cours d'exécution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terminés ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">Avec succès</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Échecs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">Nécessitent attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5</div>
            <p className="text-xs text-muted-foreground">Jours par workflow</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets de workflows */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            En cours ({activeWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminés ({completedWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Échecs ({failedWorkflows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeWorkflows.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucun workflow en cours d'exécution
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedWorkflows.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucun workflow terminé
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="failed">
          {failedWorkflows.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucun workflow en échec
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {failedWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de résiliation */}
      <Dialog open={showTerminationDialog} onOpenChange={setShowTerminationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Démarrer un workflow de résiliation</DialogTitle>
            <DialogDescription>
              Initiez le processus de résiliation d'un contrat avec toutes les validations nécessaires
            </DialogDescription>
          </DialogHeader>
          <Form {...terminationForm}>
            <form onSubmit={terminationForm.handleSubmit(onSubmitTermination)} className="space-y-4">
              <FormField
                control={terminationForm.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrat à résilier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contract-termination">
                          <SelectValue placeholder="Sélectionner un contrat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.filter(c => c.status === "active").map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.number} - {contract.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Seuls les contrats actifs peuvent être résiliés
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={terminationForm.control}
                  name="terminationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de résiliation</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-termination-date" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={terminationForm.control}
                  name="noticeGiven"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de préavis</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-notice-date" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={terminationForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif de résiliation</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Détaillez le motif de résiliation..." 
                        {...field}
                        data-testid="textarea-termination-reason"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={terminationForm.control}
                name="penalties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pénalités (optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Montant des pénalités en EUR" 
                        {...field}
                        data-testid="input-penalties"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormField
                  control={terminationForm.control}
                  name="finalInvoice"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                          data-testid="checkbox-final-invoice"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Générer la facture de clôture
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={terminationForm.control}
                  name="returnDocuments"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                          data-testid="checkbox-return-documents"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Retour des documents contractuels requis
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowTerminationDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={startTerminationMutation.isPending} data-testid="button-submit-termination">
                  {startTerminationMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Démarrer le workflow
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de modification manuelle */}
      <Dialog open={showModificationDialog} onOpenChange={setShowModificationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Démarrer un workflow de modification</DialogTitle>
            <DialogDescription>
              Initiez une modification manuelle sur un contrat existant
            </DialogDescription>
          </DialogHeader>
          <Form {...modificationForm}>
            <form onSubmit={modificationForm.handleSubmit(onSubmitModification)} className="space-y-4">
              <FormField
                control={modificationForm.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrat à modifier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contract-modification">
                          <SelectValue placeholder="Sélectionner un contrat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.filter(c => c.status === "active").map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.number} - {contract.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={modificationForm.control}
                name="modificationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de modification</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-modification-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="amount">Montant</SelectItem>
                        <SelectItem value="duration">Durée</SelectItem>
                        <SelectItem value="scope">Périmètre</SelectItem>
                        <SelectItem value="indexation">Formule d'indexation</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={modificationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description de la modification</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Décrivez en détail la modification à apporter..." 
                        {...field}
                        data-testid="textarea-modification-description"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={modificationForm.control}
                  name="newAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau montant (si applicable)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Montant en EUR" 
                          {...field}
                          data-testid="input-new-amount"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={modificationForm.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'effet</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-effective-date" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={modificationForm.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justification</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Justifiez la nécessité de cette modification..." 
                        {...field}
                        data-testid="textarea-justification"
                      />
                    </FormControl>
                    <FormDescription>
                      Cette justification sera incluse dans le workflow de validation
                    </FormDescription>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowModificationDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={startModificationMutation.isPending} data-testid="button-submit-modification">
                  {startModificationMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Démarrer le workflow
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}