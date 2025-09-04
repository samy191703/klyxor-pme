import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Edit2, AlertCircle, Calculator, History } from "lucide-react";

const modificationSchema = z.object({
  contractId: z.string().min(1, "Contrat requis"),
  modificationType: z.enum([
    "indexation_adjustment",
    "commercial_negotiation",
    "error_correction",
    "exceptional_discount",
    "penalty_application",
    "other"
  ]),
  currentAmount: z.number().positive("Montant actuel requis"),
  newAmount: z.number().positive("Nouveau montant requis"),
  justification: z.string().min(20, "La justification doit contenir au moins 20 caractères"),
  effectiveDate: z.string().min(1, "Date d'effet requise"),
  documentReference: z.string().optional(),
  approverEmail: z.string().email("Email valide requis").optional(),
});

type ModificationFormData = z.infer<typeof modificationSchema>;

interface ManualAmountModificationProps {
  contractId?: string;
  contractNumber?: string;
  currentAmount?: number;
  onSuccess?: () => void;
}

export function ManualAmountModification({
  contractId,
  contractNumber,
  currentAmount = 0,
  onSuccess
}: ManualAmountModificationProps) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ModificationFormData>({
    resolver: zodResolver(modificationSchema),
    defaultValues: {
      contractId: contractId || "",
      modificationType: "indexation_adjustment",
      currentAmount: currentAmount,
      newAmount: currentAmount,
      justification: "",
      effectiveDate: format(new Date(), "yyyy-MM-dd"),
      documentReference: "",
      approverEmail: ""
    },
  });

  const modificationMutation = useMutation({
    mutationFn: async (data: ModificationFormData) => {
      const response = await fetch("/api/contracts/manual-modification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la modification");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Modification enregistrée",
        description: "Le montant a été modifié et l'historique a été mis à jour.",
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ModificationFormData) => {
    // Validation supplémentaire
    const difference = Math.abs(data.newAmount - data.currentAmount);
    const percentageChange = (difference / data.currentAmount) * 100;

    if (percentageChange > 20) {
      if (!window.confirm(`La modification représente un changement de ${percentageChange.toFixed(1)}%. Êtes-vous sûr de vouloir continuer ?`)) {
        return;
      }
    }

    modificationMutation.mutate(data);
  };

  const calculateDifference = () => {
    const current = form.watch("currentAmount");
    const newAmount = form.watch("newAmount");
    const difference = newAmount - current;
    const percentage = current > 0 ? (difference / current) * 100 : 0;
    
    return {
      difference,
      percentage,
      isIncrease: difference > 0
    };
  };

  const { difference, percentage, isIncrease } = calculateDifference();

  const modificationTypeLabels = {
    indexation_adjustment: "Ajustement d'indexation",
    commercial_negotiation: "Négociation commerciale",
    error_correction: "Correction d'erreur",
    exceptional_discount: "Remise exceptionnelle",
    penalty_application: "Application de pénalités",
    other: "Autre"
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Edit2 className="h-4 w-4 mr-2" />
            Modification manuelle
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modification manuelle du montant</DialogTitle>
            <DialogDescription>
              Modifiez le montant du contrat avec justification obligatoire
            </DialogDescription>
          </DialogHeader>

          {contractNumber && (
            <div className="mb-4">
              <Badge variant="outline">{contractNumber}</Badge>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="modificationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de modification *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(modificationTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'effet *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Calcul de modification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant actuel (€ HT) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau montant (€ HT) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {difference !== 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Différence:</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={isIncrease ? "destructive" : "default"}>
                            {isIncrease ? "+" : ""}{difference.toFixed(2)} €
                          </Badge>
                          <Badge variant="outline">
                            {isIncrease ? "+" : ""}{percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {Math.abs(percentage) > 20 && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Modification importante détectée</p>
                        <p>Cette modification représente un changement de {Math.abs(percentage).toFixed(1)}%. Une validation supplémentaire sera requise.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <FormField
                control={form.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justification détaillée *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Expliquez en détail la raison de cette modification manuelle..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 20 caractères. Cette justification sera archivée dans l'historique du contrat.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="documentReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence document</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Avenant n°123, Email du 01/01/2025"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Document justificatif (optionnel)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="approverEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email du validateur</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="validateur@engie.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Pour notification (optionnel)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-2" />
                  Historique
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={modificationMutation.isPending}
                  >
                    {modificationMutation.isPending ? "Enregistrement..." : "Enregistrer la modification"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {showHistory && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Historique des modifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  L'historique des modifications sera affiché ici
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}