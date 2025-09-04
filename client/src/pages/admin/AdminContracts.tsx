import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  FileText,
  Calendar,
  AlertCircle,
  Check,
  X,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "./AdminLayout";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

const contractTypes = [
  { value: "OMSA", label: "OMSA" },
  { value: "LTSA", label: "LTSA" },
  { value: "OMGC", label: "OMGC" },
  { value: "Bail", label: "Bail" }
];

const indexationFormulas = [
  { value: "none", label: "Pas d'indexation" },
  { value: "ICHT", label: "P = P₀ × (ICHTREV / ICHT₀)" },
  { value: "ICHT_FMOA", label: "P = P₀ × (0,15 + 0,55 × (ICHTREV/ICHT₀) + 0,3 × (FMOAREV/FMOA₀))" },
  { value: "CPI", label: "P = P₋₁ × (1 + CPI)" },
  { value: "custom", label: "Formule personnalisée" }
];

const contractSchema = z.object({
  title: z.string().min(1, "Le titre est obligatoire"),
  type: z.enum(["OMSA", "LTSA", "OMGC", "Bail"]),
  technology: z.enum(["eolien", "PV"]).optional(),
  maintenanceProvider: z.string().optional(),
  numberOfTurbines: z.number().optional(),
  pricePerMWh: z.number().optional(),
  status: z.string(),
  startDate: z.string().min(1, "La date de début est obligatoire"),
  endDate: z.string().optional(),
  fixedAmount: z.number().min(0, "Le montant fixe est obligatoire"),
  variableAmount: z.number().min(0).optional(),
  billingPeriodicity: z.enum(["mensuelle", "trimestrielle", "semestrielle", "annuelle"]),
  paymentType: z.string().default("virement"),
  indexationFormula: z.string(),
  indexationDate: z.string().optional(),
  originalIndexDate: z.string().optional(),
  originalIndexValue: z.number().optional(),
  revisionIndexDate: z.string().optional(),
  indices: z.array(z.object({
    code: z.string(),
    originalDate: z.string().optional(),
    originalValue: z.number().optional(),
    revisionDate: z.string().optional()
  })).optional()
});

type ContractFormData = z.infer<typeof contractSchema>;

export function AdminContracts() {
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    businessUnit: "",
    search: ""
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["/api/admin/contracts", filters]
  });

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      status: "draft",
      billingPeriodicity: "trimestrielle",
      paymentType: "virement",
      indexationFormula: "none",
      fixedAmount: 0,
      variableAmount: 0
    }
  });

  const contractType = form.watch("type");
  const indexationFormula = form.watch("indexationFormula");

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const response = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error("Failed to create contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts"] });
      setShowContractForm(false);
      form.reset();
      toast({
        title: "Contrat créé",
        description: "Le contrat a été créé avec succès et envoyé en validation"
      });
    }
  });

  const handleCreateContract = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const getDeadlineInfo = (contract: any) => {
    if (!contract.nextDeadline) return null;
    const days = contract.daysUntilDeadline;
    const type = contract.deadlineType;
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{type}</span>
        <Badge variant={days <= 7 ? "destructive" : days <= 30 ? "outline" : "secondary"}>
          J-{days}
        </Badge>
      </div>
    );
  };

  const resetFilters = () => {
    setFilters({
      type: "",
      status: "",
      businessUnit: "",
      search: ""
    });
  };

  const renderConditionalFields = () => {
    if (!contractType) return null;

    return (
      <>
        {/* Technology field for OMSA, LTSA, OMGC */}
        {["OMSA", "LTSA", "OMGC"].includes(contractType) && (
          <FormField
            control={form.control}
            name="technology"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Technologie *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la technologie" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="eolien">Éolien</SelectItem>
                    <SelectItem value="PV">Photovoltaïque</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Maintenance provider for LTSA and OMGC */}
        {["LTSA", "OMGC"].includes(contractType) && (
          <FormField
            control={form.control}
            name="maintenanceProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du mainteneur (Contrat d'achat) *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Bouygues, Engie..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Number of turbines for OMSA */}
        {contractType === "OMSA" && (
          <FormField
            control={form.control}
            name="numberOfTurbines"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre d'éoliennes</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Fixed and variable amounts - Not for Bail */}
        {contractType !== "Bail" && (
          <>
            <FormField
              control={form.control}
              name="fixedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant fixe (€) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variableAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant variable (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      placeholder="0 si inexistant"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </>
    );
  };

  const renderIndexationFields = () => {
    if (indexationFormula === "none") return null;

    const needsMultipleIndices = ["ICHT_FMOA"].includes(indexationFormula);

    return (
      <>
        <FormField
          control={form.control}
          name="indexationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date d'indexation *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {needsMultipleIndices ? (
          <>
            <div className="space-y-4">
              <div className="border p-4 rounded-lg">
                <h4 className="font-medium mb-3">Indice ICHT</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="indices.0.originalDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'origine</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Ou renseignez la valeur</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="indices.0.originalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur d'origine</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="indices.0.revisionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de révision</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border p-4 rounded-lg">
                <h4 className="font-medium mb-3">Indice FMOA</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="indices.1.originalDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'origine</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Ou renseignez la valeur</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="indices.1.originalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur d'origine</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="indices.1.revisionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de révision</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="originalIndexDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de l'indice d'origine</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>Un seul champ requis (date ou valeur)</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="originalIndexValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valeur de l'indice d'origine</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revisionIndexDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de révision de l'indice</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des contrats</h1>
            <p className="text-gray-600 mt-1">Administration et validation des contrats</p>
          </div>
          <Button onClick={() => setShowContractForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Type de contrat</Label>
                <Select 
                  value={filters.type} 
                  onValueChange={(value) => setFilters({...filters, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {contractTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Statut</Label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters({...filters, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="pending_validation">En validation</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="terminated">Résilié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>BU/Entité</Label>
                <Select 
                  value={filters.businessUnit} 
                  onValueChange={(value) => setFilters({...filters, businessUnit: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les BU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="ENGIE Solutions France">ENGIE Solutions France</SelectItem>
                    <SelectItem value="ENGIE Green">ENGIE Green</SelectItem>
                    <SelectItem value="ENGIE Global Energy Management">ENGIE Global Energy Management</SelectItem>
                    <SelectItem value="ENGIE Flex">ENGIE Flex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="N° contrat, intitulé..." 
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={resetFilters}>
                Réinitialiser
              </Button>
              <Button>
                Enregistrer les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°/Intitulé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Périodicité</TableHead>
                  <TableHead>Date début/fin</TableHead>
                  <TableHead>Échéance à venir</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts && Array.isArray(contracts) ? contracts.map((contract: any) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.number}</p>
                        <p className="text-sm text-gray-500">{contract.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{contract.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        contract.status === "active" ? "default" :
                        contract.status === "pending_validation" ? "outline" :
                        "secondary"
                      }>
                        {contract.status === "pending_validation" ? "En validation" :
                         contract.status === "active" ? "Actif" :
                         contract.status === "draft" ? "Brouillon" :
                         "Résilié"}
                      </Badge>
                    </TableCell>
                    <TableCell>{contract.billingPeriodicity || "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(contract.startDate).toLocaleDateString("fr-FR")}</p>
                        {contract.endDate && (
                          <p className="text-gray-500">
                            {new Date(contract.endDate).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getDeadlineInfo(contract)}</TableCell>
                    <TableCell>{contract.responsible || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedContract(contract)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : null}
              </TableBody>
            </Table>
            {isLoading && (
              <div className="text-center py-8 text-gray-500">
                Chargement des contrats...
              </div>
            )}
            {!isLoading && (!contracts || !Array.isArray(contracts) || contracts.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                Aucun contrat trouvé
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Creation Form Modal */}
        {showContractForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Créer un nouveau contrat</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateContract)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Titre (nom du contrat, nom SPV...) *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Fourniture électricité Lyon" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de contrat *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner le type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contractTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {renderConditionalFields()}

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut du contrat *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Brouillon</SelectItem>
                                <SelectItem value="pending_validation">En validation</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de début *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de fin</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingPeriodicity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Périodicité des factures *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mensuelle">Mensuelle</SelectItem>
                                <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                                <SelectItem value="semestrielle">Semestrielle</SelectItem>
                                <SelectItem value="annuelle">Annuelle</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="indexationFormula"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formule d'indexation</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {indexationFormulas.map(formula => (
                                  <SelectItem key={formula.value} value={formula.value}>
                                    {formula.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {renderIndexationFields()}

                    <div className="flex justify-end gap-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setShowContractForm(false);
                          form.reset();
                        }}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={createContractMutation.isPending}>
                        {createContractMutation.isPending ? "Création..." : "Créer et soumettre à validation"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}