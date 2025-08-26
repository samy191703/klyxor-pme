import { useState } from "react";
import SidebarWithSubmenu from "@/components/layout/sidebar-with-submenu";
import MobileNavWithSubmenu from "@/components/layout/mobile-nav-with-submenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { 
  Ban, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Calendar,
  Euro,
  User,
  Clock,
  FileText,
  Info
} from "lucide-react";

interface PaymentBlock {
  id: string;
  flowId: string;
  contractId: string;
  contractName: string;
  amountBefore: number;
  amountAfter: number;
  currency: string;
  blockDate: string;
  modifiedBy: string;
  decisionMaker?: string;
  decisionStatus: "to_validate" | "validated" | "rejected";
  reason: string;
  dueDate: string;
}

export default function PaymentBlocks() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<PaymentBlock | null>(null);
  const [statusFilter, setStatusFilter] = useState("to_validate");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const blocks: PaymentBlock[] = [
    {
      id: "BLK-2025-001",
      flowId: "FLX-2025-003",
      contractId: "KLX-2024-089",
      contractName: "Fourniture Gaz Site Lyon",
      amountBefore: 45000,
      amountAfter: 48500,
      currency: "EUR",
      blockDate: "2025-01-22 10:15",
      modifiedBy: "Marie Leblanc",
      decisionStatus: "to_validate",
      reason: "Montant modifié suite à avenant AVK-2025-001",
      dueDate: "2025-02-01"
    },
    {
      id: "BLK-2025-002",
      flowId: "FLX-2025-008",
      contractId: "KLX-2024-056",
      contractName: "Maintenance Data Center Paris",
      amountBefore: 15000,
      amountAfter: 16500,
      currency: "EUR",
      blockDate: "2025-01-21 14:30",
      modifiedBy: "Pierre Durand",
      decisionStatus: "to_validate",
      reason: "Revalorisation contractuelle annuelle",
      dueDate: "2025-02-15"
    },
    {
      id: "BLK-2025-003",
      flowId: "FLX-2025-012",
      contractId: "KLX-2024-102",
      contractName: "PPA Éolien Bretagne",
      amountBefore: 75000,
      amountAfter: 72000,
      currency: "EUR",
      blockDate: "2025-01-20 09:00",
      modifiedBy: "Sophie Martin",
      decisionMaker: "Admin",
      decisionStatus: "validated",
      reason: "Ajustement de production",
      dueDate: "2025-01-31"
    }
  ];

  const filteredBlocks = blocks.filter(block => {
    return statusFilter === "all" || block.decisionStatus === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "to_validate":
        return <Badge variant="secondary" className="bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/30">À valider</Badge>;
      case "validated":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Validé</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAmountChange = (before: number, after: number) => {
    const diff = after - before;
    const percentage = ((diff / before) * 100).toFixed(1);
    const isIncrease = diff > 0;
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{before.toLocaleString()}</span>
        <span className="text-gray-400">→</span>
        <span className="text-sm font-medium">{after.toLocaleString()}</span>
        <Badge 
          variant="outline" 
          className={isIncrease ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}
        >
          {isIncrease ? '+' : ''}{percentage}%
        </Badge>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SidebarWithSubmenu />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <MobileNavWithSubmenu />
          <img 
            src="/klyxor-logo.jpeg" 
            alt="KLYXOR Logo"
            className="w-10 h-10 object-contain rounded-lg shadow"
          />
        </div>
        
        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto py-6 px-4 lg:px-8 xl:px-12 space-y-6 max-w-[1600px]">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#0F2A43]">Blocages de paiement</h1>
          <p className="text-gray-600 mt-2">Validation des changements de montant</p>
        </div>
      </div>

      {/* Info bannière */}
      <Alert className="border-[#C9A646]/30 bg-[#C9A646]/5">
        <Info className="h-4 w-4 text-[#C9A646]" />
        <AlertDescription className="text-[#0F2A43]">
          Tout changement de montant entraîne un blocage automatique jusqu'à approbation. Les flux restent bloqués jusqu'à validation manuelle.
        </AlertDescription>
      </Alert>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut de décision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="to_validate">À valider</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Raison" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les raisons</SelectItem>
                <SelectItem value="amendment">Montant modifié (avenant)</SelectItem>
                <SelectItem value="revaluation">Revalorisation</SelectItem>
                <SelectItem value="adjustment">Ajustement</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Date de blocage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Rechercher contrat..." 
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions en masse */}
      {statusFilter === "to_validate" && filteredBlocks.length > 0 && (
        <div className="flex gap-2">
          <Button className="bg-[#0F2A43] hover:bg-[#0F2A43]/90">
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider la sélection
          </Button>
          <Button 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-50"
            onClick={() => setShowRejectModal(true)}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rejeter la sélection
          </Button>
        </div>
      )}

      {/* Tableau des blocages */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flow ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant avant → après</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date blocage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auteur modif</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Décideur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBlocks.map((block) => (
                  <tr key={block.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-[#0F2A43]">{block.flowId}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{block.contractId}</div>
                        <div className="text-gray-500 text-xs">{block.contractName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getAmountChange(block.amountBefore, block.amountAfter)}
                      <span className="text-xs text-gray-500 ml-2">{block.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {block.blockDate}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        {block.modifiedBy}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {block.decisionMaker || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(block.decisionStatus)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedBlock(block)}
                      >
                        Détails
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBlocks.length === 0 && (
            <div className="text-center py-12">
              <Ban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun paiement bloqué.</p>
              <Button variant="link" className="mt-2 text-[#0F2A43]">
                Accéder aux Flux (filtre "Bloqué")
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panneau latéral de détail */}
      <Sheet open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {selectedBlock && (
            <>
              <SheetHeader>
                <SheetTitle>Détail du blocage</SheetTitle>
                <SheetDescription>
                  Flow ID : {selectedBlock.flowId}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* En-tête */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Statut</span>
                    <Badge variant="destructive">BLOQUÉ</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Montant</span>
                    <span className="text-lg font-bold text-[#0F2A43]">
                      {selectedBlock.amountAfter.toLocaleString()} {selectedBlock.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Échéance</span>
                    <span className="text-sm">{selectedBlock.dueDate}</span>
                  </div>
                </div>

                {/* Motif & preuve */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Motif & preuve</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Raison du blocage</p>
                      <p className="text-sm font-medium">{selectedBlock.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Changement détecté</p>
                      <div className="bg-gray-50 p-3 rounded">
                        {getAmountChange(selectedBlock.amountBefore, selectedBlock.amountAfter)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Auteur</p>
                        <p className="text-sm font-medium">{selectedBlock.modifiedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Horodatage</p>
                        <p className="text-sm font-medium">{selectedBlock.blockDate}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Traçabilité */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Traçabilité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Blocage automatique</p>
                          <p className="text-xs text-gray-500">{selectedBlock.blockDate}</p>
                        </div>
                      </div>
                      {selectedBlock.decisionStatus !== "to_validate" && (
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            selectedBlock.decisionStatus === "validated" ? "bg-green-500" : "bg-red-500"
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Décision : {selectedBlock.decisionStatus === "validated" ? "Validé" : "Rejeté"}
                            </p>
                            <p className="text-xs text-gray-500">Par {selectedBlock.decisionMaker}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                {selectedBlock.decisionStatus === "to_validate" && (
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-[#0F2A43] hover:bg-[#0F2A43]/90">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider le déblocage
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Motif de rejet</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Veuillez indiquer le motif du rejet..."
                className="min-h-[100px]"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2 mt-4">
                <Button 
                  className="flex-1"
                  variant="destructive"
                  disabled={!rejectReason}
                >
                  Confirmer le rejet
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
}