import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  Plus,
  Eye,
  Trash2,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  Info,
} from "lucide-react";
import Header from "@/components/layout/header";

interface Amendment {
  id: string;
  contractId: string;
  number: string;
  type: string;
  title: string;
  description?: string | null;
  status: string;
  effectiveDate: string;
  originalAmount?: string | null;
  newAmount?: string | null;
  impactDescription?: string | null;
  requestedBy: string;
  approvedBy?: string | null;
  signedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Contract {
  id: string;
  number: string;
  title: string;
}

export default function AmendmentsSimple() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(
    null
  );
  const [showNewAmendmentDialog, setShowNewAmendmentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState("25");

  // Query pour récupérer les avenants
  const {
    data: amendments = [],
    isLoading,
    error,
  } = useQuery<Amendment[]>({
    queryKey: ["/api/amendments"],
  });

  // Query pour récupérer les contrats
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Form state for new amendment
  const [newAmendment, setNewAmendment] = useState({
    contractId: "",
    number: "",
    type: "price_revision",
    title: "",
    description: "",
    status: "draft",
    effectiveDate: "",
    originalAmount: "",
    newAmount: "",
    impactDescription: "",
  });

  // Form state for edit
  const [editAmendment, setEditAmendment] = useState<Partial<Amendment>>({});

  // Mutations
  const createAmendmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/amendments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create amendment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amendments"] });
      toast({
        title: "Avenant créé",
        description: "L'avenant a été créé avec succès",
      });
      setShowNewAmendmentDialog(false);
      resetNewAmendmentForm();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'avenant",
        variant: "destructive",
      });
    },
  });

  const updateAmendmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/amendments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update amendment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amendments"] });
      toast({
        title: "Avenant modifié",
        description: "L'avenant a été modifié avec succès",
      });
      setShowEditDialog(false);
      setEditAmendment({});
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'avenant",
        variant: "destructive",
      });
    },
  });

  const deleteAmendmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/amendments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete amendment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amendments"] });
      toast({
        title: "Avenant supprimé",
        description: "L'avenant a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avenant",
        variant: "destructive",
      });
    },
  });

  const resetNewAmendmentForm = () => {
    setNewAmendment({
      contractId: "",
      number: "",
      type: "price_revision",
      title: "",
      description: "",
      status: "draft",
      effectiveDate: "",
      originalAmount: "",
      newAmount: "",
      impactDescription: "",
    });
  };

  const handleCreateAmendment = () => {
    if (
      !newAmendment.contractId ||
      !newAmendment.number ||
      !newAmendment.title ||
      !newAmendment.effectiveDate
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    createAmendmentMutation.mutate(newAmendment);
  };

  const handleUpdateAmendment = () => {
    if (!selectedAmendment) return;
    updateAmendmentMutation.mutate({
      id: selectedAmendment.id,
      data: editAmendment,
    });
  };

  const handleDeleteAmendment = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet avenant ?")) {
      deleteAmendmentMutation.mutate(id);
    }
  };

  // Get contract details
  const getContractDetails = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    return contract ? `${contract.number} - ${contract.title}` : contractId;
  };

  // Filter amendments
  const filteredAmendments = amendments.filter((amendment) => {
    if (statusFilter !== "all" && amendment.status !== statusFilter)
      return false;
    if (typeFilter !== "all" && amendment.type !== typeFilter) return false;
    if (
      searchQuery &&
      !amendment.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !amendment.number.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // KPI calculations
  const kpiData = {
    total: amendments.length,
    drafts: amendments.filter((a) => a.status === "draft").length,
    pending: amendments.filter((a) => a.status === "pending_signature").length,
    active: amendments.filter((a) => a.status === "active").length,
    rejected: amendments.filter((a) => a.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          text: "Actif",
          icon: CheckCircle,
          color: "text-green-600 bg-green-50",
        };
      case "pending_signature":
        return {
          text: "À signer",
          icon: Clock,
          color: "text-yellow-600 bg-yellow-50",
        };
      case "draft":
        return {
          text: "Brouillon",
          icon: FileText,
          color: "text-gray-600 bg-gray-50",
        };
      case "rejected":
        return {
          text: "Rejeté",
          icon: XCircle,
          color: "text-red-600 bg-red-50",
        };
      default:
        return { text: status, icon: Info, color: "text-gray-600 bg-gray-50" };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "duration_extension":
        return "Extension durée";
      case "price_revision":
        return "Révision prix";
      case "scope_change":
        return "Changement périmètre";
      case "indexation_change":
        return "Modification indexation";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const formatAmount = (amount: string | null | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(parseFloat(amount));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Chargement des avenants...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          Erreur lors du chargement des avenants
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-6"
        data-testid="amendments-main"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion des Avenants
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez les modifications de vos contrats
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{kpiData.total}</div>
                <div className="text-sm text-gray-600">Total avenants</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">
                  {kpiData.drafts}
                </div>
                <div className="text-sm text-gray-600">Brouillons</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {kpiData.pending}
                </div>
                <div className="text-sm text-gray-600">À signer</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {kpiData.active}
                </div>
                <div className="text-sm text-gray-600">Actifs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {kpiData.rejected}
                </div>
                <div className="text-sm text-gray-600">Rejetés</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par numéro ou titre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="search-amendments"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger
                      className="w-[180px]"
                      data-testid="filter-status"
                    >
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="pending_signature">
                        À signer
                      </SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger
                      className="w-[200px]"
                      data-testid="filter-type"
                    >
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="price_revision">
                        Révision prix
                      </SelectItem>
                      <SelectItem value="duration_extension">
                        Extension durée
                      </SelectItem>
                      <SelectItem value="scope_change">
                        Changement périmètre
                      </SelectItem>
                      <SelectItem value="indexation_change">
                        Modification indexation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => setShowNewAmendmentDialog(true)}
                  data-testid="button-new-amendment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel avenant
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Amendments Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Date d'effet</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAmendments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-gray-500"
                      >
                        Aucun avenant trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAmendments
                      .slice(0, parseInt(itemsPerPage))
                      .map((amendment) => {
                        const statusBadge = getStatusBadge(amendment.status);
                        const StatusIcon = statusBadge.icon;
                        return (
                          <TableRow
                            key={amendment.id}
                            data-testid={`row-amendment-${amendment.id}`}
                          >
                            <TableCell className="font-medium">
                              {amendment.number}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {getContractDetails(amendment.contractId)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getTypeLabel(amendment.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {amendment.title}
                            </TableCell>
                            <TableCell>
                              {formatDate(amendment.effectiveDate)}
                            </TableCell>
                            <TableCell>
                              {amendment.newAmount
                                ? formatAmount(amendment.newAmount)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusBadge.text}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAmendment(amendment);
                                    setShowDetailDialog(true);
                                  }}
                                  data-testid={`button-view-${amendment.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canModifyContract() && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAmendment(amendment);
                                      setEditAmendment(amendment);
                                      setShowEditDialog(true);
                                    }}
                                    data-testid={`button-edit-${amendment.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {amendment.status === "draft" &&
                                  canDeleteContract() && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteAmendment(amendment.id)
                                      }
                                      data-testid={`button-delete-${amendment.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredAmendments.length > 0 && (
                <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    1-
                    {Math.min(
                      parseInt(itemsPerPage),
                      filteredAmendments.length
                    )}{" "}
                    sur {filteredAmendments.length}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Afficher:</span>
                    <Select
                      value={itemsPerPage}
                      onValueChange={setItemsPerPage}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* New Amendment Dialog */}
      <Dialog
        open={showNewAmendmentDialog}
        onOpenChange={setShowNewAmendmentDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un nouvel avenant</DialogTitle>
            <DialogDescription>
              Remplissez les informations pour créer un nouvel avenant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contract">Contrat *</Label>
                <Select
                  value={newAmendment.contractId}
                  onValueChange={(value) =>
                    setNewAmendment({ ...newAmendment, contractId: value })
                  }
                >
                  <SelectTrigger data-testid="select-contract">
                    <SelectValue placeholder="Sélectionner un contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.number} - {contract.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="number">Numéro *</Label>
                <Input
                  id="number"
                  value={newAmendment.number}
                  onChange={(e) =>
                    setNewAmendment({ ...newAmendment, number: e.target.value })
                  }
                  placeholder="AVN-2025-XXX"
                  data-testid="input-number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={newAmendment.type}
                  onValueChange={(value) =>
                    setNewAmendment({ ...newAmendment, type: value })
                  }
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_revision">
                      Révision prix
                    </SelectItem>
                    <SelectItem value="duration_extension">
                      Extension durée
                    </SelectItem>
                    <SelectItem value="scope_change">
                      Changement périmètre
                    </SelectItem>
                    <SelectItem value="indexation_change">
                      Modification indexation
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="effectiveDate">Date d'effet *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={newAmendment.effectiveDate}
                  onChange={(e) =>
                    setNewAmendment({
                      ...newAmendment,
                      effectiveDate: e.target.value,
                    })
                  }
                  data-testid="input-effective-date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={newAmendment.title}
                onChange={(e) =>
                  setNewAmendment({ ...newAmendment, title: e.target.value })
                }
                placeholder="Titre de l'avenant"
                data-testid="input-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAmendment.description}
                onChange={(e) =>
                  setNewAmendment({
                    ...newAmendment,
                    description: e.target.value,
                  })
                }
                placeholder="Description détaillée de l'avenant"
                rows={3}
                data-testid="textarea-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="originalAmount">Montant original</Label>
                <Input
                  id="originalAmount"
                  type="number"
                  value={newAmendment.originalAmount}
                  onChange={(e) =>
                    setNewAmendment({
                      ...newAmendment,
                      originalAmount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  data-testid="input-original-amount"
                />
              </div>
              <div>
                <Label htmlFor="newAmount">Nouveau montant</Label>
                <Input
                  id="newAmount"
                  type="number"
                  value={newAmendment.newAmount}
                  onChange={(e) =>
                    setNewAmendment({
                      ...newAmendment,
                      newAmount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  data-testid="input-new-amount"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="impactDescription">Description de l'impact</Label>
              <Textarea
                id="impactDescription"
                value={newAmendment.impactDescription}
                onChange={(e) =>
                  setNewAmendment({
                    ...newAmendment,
                    impactDescription: e.target.value,
                  })
                }
                placeholder="Décrivez l'impact de cet avenant"
                rows={2}
                data-testid="textarea-impact"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewAmendmentDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateAmendment}
              data-testid="button-create"
              disabled={!canCreateContract()}
            >
              Créer l'avenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'avenant</DialogTitle>
            <DialogDescription>
              {selectedAmendment?.number} - {selectedAmendment?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedAmendment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Contrat</Label>
                  <p className="font-medium">
                    {getContractDetails(selectedAmendment.contractId)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Type</Label>
                  <p className="font-medium">
                    {getTypeLabel(selectedAmendment.type)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Date d'effet</Label>
                  <p className="font-medium">
                    {formatDate(selectedAmendment.effectiveDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Statut</Label>
                  <p className="font-medium">
                    {getStatusBadge(selectedAmendment.status).text}
                  </p>
                </div>
              </div>
              {selectedAmendment.description && (
                <div>
                  <Label className="text-gray-600">Description</Label>
                  <p className="font-medium">{selectedAmendment.description}</p>
                </div>
              )}
              {(selectedAmendment.originalAmount ||
                selectedAmendment.newAmount) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Montant original</Label>
                    <p className="font-medium">
                      {formatAmount(selectedAmendment.originalAmount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Nouveau montant</Label>
                    <p className="font-medium">
                      {formatAmount(selectedAmendment.newAmount)}
                    </p>
                  </div>
                </div>
              )}
              {selectedAmendment.impactDescription && (
                <div>
                  <Label className="text-gray-600">Impact</Label>
                  <p className="font-medium">
                    {selectedAmendment.impactDescription}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <Label className="text-gray-600">Créé le</Label>
                  <p>{formatDate(selectedAmendment.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Modifié le</Label>
                  <p>{formatDate(selectedAmendment.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'avenant</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'avenant
            </DialogDescription>
          </DialogHeader>
          {selectedAmendment && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-title">Titre</Label>
                <Input
                  id="edit-title"
                  value={editAmendment.title || ""}
                  onChange={(e) =>
                    setEditAmendment({
                      ...editAmendment,
                      title: e.target.value,
                    })
                  }
                  data-testid="edit-title"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editAmendment.description || ""}
                  onChange={(e) =>
                    setEditAmendment({
                      ...editAmendment,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  data-testid="edit-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status">Statut</Label>
                  <Select
                    value={editAmendment.status || ""}
                    onValueChange={(value) =>
                      setEditAmendment({ ...editAmendment, status: value })
                    }
                  >
                    <SelectTrigger data-testid="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="pending_signature">
                        À signer
                      </SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-effective-date">Date d'effet</Label>
                  <Input
                    id="edit-effective-date"
                    type="date"
                    value={
                      editAmendment.effectiveDate
                        ? editAmendment.effectiveDate.split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setEditAmendment({
                        ...editAmendment,
                        effectiveDate: e.target.value,
                      })
                    }
                    data-testid="edit-effective-date"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-original-amount">Montant original</Label>
                  <Input
                    id="edit-original-amount"
                    type="number"
                    value={editAmendment.originalAmount || ""}
                    onChange={(e) =>
                      setEditAmendment({
                        ...editAmendment,
                        originalAmount: e.target.value,
                      })
                    }
                    data-testid="edit-original-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-new-amount">Nouveau montant</Label>
                  <Input
                    id="edit-new-amount"
                    type="number"
                    value={editAmendment.newAmount || ""}
                    onChange={(e) =>
                      setEditAmendment({
                        ...editAmendment,
                        newAmount: e.target.value,
                      })
                    }
                    data-testid="edit-new-amount"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-impact">Description de l'impact</Label>
                <Textarea
                  id="edit-impact"
                  value={editAmendment.impactDescription || ""}
                  onChange={(e) =>
                    setEditAmendment({
                      ...editAmendment,
                      impactDescription: e.target.value,
                    })
                  }
                  rows={2}
                  data-testid="edit-impact"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleUpdateAmendment}
              data-testid="button-save"
              disabled={!canModifyContract()}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
