import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/status-badge";
import RejectionModal from "@/components/common/rejection-modal";
import { useToast } from "@/hooks/use-toast";
import { Eye, Check, X, Share } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ValidationRequest } from "@shared/schema";

export default function Validation() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<ValidationRequest[]>({
    queryKey: ["/api/validation-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/validation-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      toast({
        title: "Validation approuvée",
        description: "La demande a été approuvée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'approbation.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("POST", `/api/validation-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      setShowRejectionModal(false);
      setSelectedRequest(null);
      toast({
        title: "Validation rejetée",
        description: "La demande a été rejetée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du rejet.",
        variant: "destructive",
      });
    },
  });

  const filteredRequests = requests.filter(request => {
    return typeFilter === "all" || request.type === typeFilter;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "contract": return "Contrat";
      case "indexation": return "Indexation";
      case "amendment": return "Avenant";
      case "termination": return "Résiliation";
      case "manual_amount": return "Montant";
      default: return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case "contract": return "primary";
      case "indexation": return "success";
      case "amendment": return "warning";
      case "termination": return "destructive";
      case "manual_amount": return "secondary";
      default: return "secondary";
    }
  };

  const getAgeVariant = (age: number) => {
    if (age > 1) return "destructive";
    if (age > 0) return "warning";
    return "secondary";
  };

  const handleApprove = (request: ValidationRequest) => {
    approveMutation.mutate(request.id);
  };

  const handleReject = (request: ValidationRequest) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
  };

  const handleConfirmReject = (reason: string) => {
    if (selectedRequest) {
      rejectMutation.mutate({ id: selectedRequest.id, reason });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="validation-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Demandes de validation</h1>
              <p className="text-gray-600">Approuver ou rejeter les demandes en attente</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Éléments à valider ({filteredRequests.length})</span>
                  <div className="flex items-center space-x-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="contract">Contrats</SelectItem>
                        <SelectItem value="indexation">Indexations</SelectItem>
                        <SelectItem value="amendment">Avenants</SelectItem>
                        <SelectItem value="termination">Résiliations</SelectItem>
                        <SelectItem value="manual_amount">Montants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="w-20 h-6 bg-gray-200 rounded"></div>
                        <div className="w-32 h-6 bg-gray-200 rounded"></div>
                        <div className="flex-1 h-6 bg-gray-200 rounded"></div>
                        <div className="w-16 h-6 bg-gray-200 rounded"></div>
                        <div className="w-24 h-6 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {typeFilter === "all" 
                        ? "Aucune demande de validation en attente" 
                        : `Aucune demande de type "${getTypeLabel(typeFilter)}" en attente`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead>Objet</TableHead>
                          <TableHead>Âge</TableHead>
                          <TableHead>Demandeur</TableHead>
                          <TableHead>Valideur</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((request) => (
                          <TableRow key={request.id} data-testid={`row-validation-${request.id}`}>
                            <TableCell>
                              <StatusBadge
                                variant={getTypeVariant(request.type)}
                                text={getTypeLabel(request.type)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {request.reference}
                            </TableCell>
                            <TableCell>{request.subject}</TableCell>
                            <TableCell>
                              <StatusBadge
                                variant={getAgeVariant(request.age)}
                                text={request.age > 0 ? `${request.age} jour${request.age > 1 ? 's' : ''}` : 'Nouveau'}
                              />
                            </TableCell>
                            <TableCell>{request.requestedBy}</TableCell>
                            <TableCell>{request.assignedTo}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-view-${request.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleApprove(request)}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${request.id}`}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleReject(request)}
                                  disabled={rejectMutation.isPending}
                                  data-testid={`button-reject-${request.id}`}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-redirect-${request.id}`}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Share className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleConfirmReject}
        title="Motif de rejet"
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
