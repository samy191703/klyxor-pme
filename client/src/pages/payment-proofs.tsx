import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  FileCheck,
  Send,
  Download,
  Mail,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  Euro,
  FileText,
  RefreshCw,
  Archive,
  Link,
  Info,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Header from "@/components/layout/header";

interface PaymentProof {
  id: string;
  paymentId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentDate?: string;
  amount?: number;
  currency?: string;
  method?: string;
  beneficiary?: string;
  proofAvailable?: boolean;
  lastSent?: string;
  sentTo?: string[];
  contractId?: string;
  contractNumber?: string;
  contractName?: string;
  contractTitle?: string;
}

export default function PaymentProofs() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [showSendHistory, setShowSendHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Permissions
  const { hasPermission } = usePermissions();
  const canGenerateProof = hasPermission("/payment-proofs");
  const canResendProof = hasPermission("/payment-proofs");
  const canDownloadProof = hasPermission("/payment-proofs");

  /**
   * Hook pour récupérer les preuves de paiement depuis l'API
   * @description Récupère dynamiquement les preuves de paiement depuis la base PostgreSQL.
   * Les preuves incluent les attestations de virement, prélèvements et autres moyens de paiement.
   * Le rafraîchissement automatique assure que les nouvelles preuves générées sont visibles rapidement.
   *
   * @returns {PaymentProof[]} proofsData - Liste des preuves de paiement avec leurs détails
   * @returns {boolean} proofsLoading - Indicateur de chargement des données
   */
  const { data: proofsData = [], isLoading: proofsLoading } = useQuery<
    PaymentProof[]
  >({
    queryKey: ["/api/payment-proofs"],
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes pour détecter les nouvelles preuves
  });

  // Mutation pour générer une preuve
  const generateProofMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/payment-proofs/generate", data);
    },
    onSuccess: () => {
      toast({
        title: "Preuve générée",
        description: "La preuve de paiement a été générée",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-proofs"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de générer la preuve",
        variant: "destructive",
      });
    },
  });

  // Mutation pour renvoyer une preuve
  const resendProofMutation = useMutation({
    mutationFn: async ({ proofId, recipients }: any) => {
      return await apiRequest("POST", `/api/payment-proofs/${proofId}/resend`, {
        recipients,
      });
    },
    onSuccess: () => {
      toast({
        title: "Preuve renvoyée",
        description: "La preuve de paiement a été renvoyée",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de renvoyer la preuve",
        variant: "destructive",
      });
    },
  });

  // Fonction pour télécharger une preuve
  const handleDownloadProof = async (proofId: string) => {
    try {
      const response = await fetch(`/api/payment-proofs/${proofId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preuve-paiement-${proofId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement réussi",
        description: "La preuve de paiement a été téléchargée",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la preuve",
        variant: "destructive",
      });
    }
  };

  /**
   * Preuves de paiement réelles depuis la base de données
   * @description Utilise exclusivement les données réelles provenant de l'API.
   * Aucune donnée mockée n'est utilisée même si la base est vide.
   * Ceci garantit l'intégrité et la véracité des preuves affichées aux utilisateurs.
   */
  const proofs: PaymentProof[] = proofsData || [];

  const filteredProofs = proofs.filter((proof) => {
    const contractDisplay = proof.contractName || proof.contractTitle || "";
    const matchesSearch =
      contractDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proof.invoiceNumber || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (proof.paymentId || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  /**
   * Génération de l'historique d'envoi depuis les données réelles
   * @description Construit l'historique d'envoi en extrayant les informations
   * des preuves de paiement existantes. Ceci remplace l'ancien tableau statique
   * par des données dynamiques basées sur les vrais envois effectués.
   *
   * @note Seules les preuves avec une date d'envoi (lastSent) sont incluses
   */
  const sendHistory = proofs
    .filter((p) => p.lastSent)
    .map((p) => ({
      paymentId: p.paymentId,
      invoice: p.invoiceNumber,
      recipients: p.sentTo || [],
      status: "success" as const,
      timestamp: p.lastSent,
      channel: "Email",
    }));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-6"
        data-testid="payment-proofs-main"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Preuves de paiement
            </h1>
          </div>
          {/* En-tête */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#0F2A43]">
                Preuves de paiement
              </h1>
              <p className="text-gray-600 mt-2">
                Génération et envoi des attestations de paiement
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowSendHistory(true)}>
              <Clock className="w-4 h-4 mr-2" />
              Historique des envois
            </Button>
          </div>

          {/* Info bannière */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong>Déclencheur automatique :</strong> Les preuves sont
              envoyées automatiquement pour tout paiement effectué (PAYE) et
              rapproché à une facture.
            </AlertDescription>
          </Alert>

          {/* Filtres */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Statut paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="completed">Effectué</SelectItem>
                    <SelectItem value="paye">PAYE</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Période de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mois en cours</SelectItem>
                    <SelectItem value="last_month">Mois dernier</SelectItem>
                    <SelectItem value="last_quarter">
                      Dernier trimestre
                    </SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    <SelectItem value="klyxor_solutions">
                      KLYXOR Solutions France
                    </SelectItem>
                    <SelectItem value="klyxor_green">KLYXOR Green</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des preuves */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Payment ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoice ID/Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date paiement
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Montant/Devise
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Méthode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Bénéficiaire
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Preuve disponible
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dernier envoi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProofs.map((proof) => (
                      <tr key={proof.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-[#0F2A43]">
                          {proof.paymentId}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{proof.invoiceId}</div>
                            <div className="text-gray-500 text-xs">
                              {proof.invoiceNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {proof.paymentDate}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {proof.amount.toLocaleString()} {proof.currency}
                        </td>
                        <td className="px-4 py-3 text-sm">{proof.method}</td>
                        <td className="px-4 py-3 text-sm">
                          {proof.beneficiary}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {proof.proofAvailable ? (
                            <Badge
                              variant="outline"
                              className="border-green-500 text-green-600"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Oui
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-gray-400 text-gray-600"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Non
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {proof.lastSent ? (
                            <div className="text-xs">
                              <div>{proof.lastSent}</div>
                              <div className="text-gray-500">
                                {proof.sentTo?.length} destinataire(s)
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {proof.proofAvailable ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedProof(proof)}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[#C9A646] border-[#C9A646]/30 hover:bg-[#C9A646]/10"
                              >
                                Générer
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredProofs.length === 0 && (
                <div className="text-center py-12">
                  <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Aucun paiement effectué à la période sélectionnée.
                  </p>
                  <Button variant="link" className="mt-2 text-[#0F2A43]">
                    Voir les Flux (filtre "Effectué")
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panneau latéral de détail */}
          <Sheet
            open={!!selectedProof}
            onOpenChange={() => setSelectedProof(null)}
          >
            <SheetContent className="w-full sm:max-w-xl">
              {selectedProof && (
                <>
                  <SheetHeader>
                    <SheetTitle>Détail & génération de preuve</SheetTitle>
                    <SheetDescription>
                      Payment ID : {selectedProof.paymentId}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* En-tête */}
                    <Card>
                      <CardContent className="pt-6 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Invoice</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-[#0F2A43] p-0 h-auto"
                          >
                            {selectedProof.invoiceNumber}
                          </Button>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Date</span>
                          <span className="text-sm font-medium">
                            {selectedProof.paymentDate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Montant</span>
                          <span className="text-sm font-bold text-[#0F2A43]">
                            {selectedProof.amount.toLocaleString()}{" "}
                            {selectedProof.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Méthode</span>
                          <span className="text-sm">
                            {selectedProof.method}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">
                            Bénéficiaire
                          </span>
                          <span className="text-sm">
                            {selectedProof.beneficiary}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Prévisualisation PDF */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Prévisualisation du contenu PDF
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="bg-gray-50 rounded">
                        <div className="p-4 bg-white border rounded space-y-3">
                          <div className="text-center mb-4">
                            <h3 className="font-bold text-lg text-[#0F2A43]">
                              ATTESTATION DE PAIEMENT
                            </h3>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">N° Contrat :</span>
                              <span>{selectedProof.contractId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">
                                Réf. paiement :
                              </span>
                              <span>{selectedProof.paymentId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">N° Facture :</span>
                              <span>{selectedProof.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">
                                Date paiement :
                              </span>
                              <span>{selectedProof.paymentDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Montant :</span>
                              <span className="font-bold">
                                {selectedProof.amount.toLocaleString()}{" "}
                                {selectedProof.currency}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">
                                Bénéficiaire :
                              </span>
                              <span>{selectedProof.beneficiary}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">
                                Mode de paiement :
                              </span>
                              <span>{selectedProof.method}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
                            Document généré le {new Date().toLocaleDateString()}{" "}
                            à {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Options */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Options</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Archiver dans GED</span>
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-300"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Automatique
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm mb-2">Destinataires email</p>
                          <div className="space-y-1">
                            {selectedProof.sentTo?.map((email, i) => (
                              <div
                                key={i}
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                              >
                                {email}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger PDF
                      </Button>
                      <Button variant="outline">
                        <Archive className="w-4 h-4 mr-2" />
                        Archiver
                      </Button>
                      <Button className="col-span-2 bg-[#0F2A43] hover:bg-[#0F2A43]/90">
                        <Send className="w-4 h-4 mr-2" />
                        {selectedProof.lastSent
                          ? "Renvoyer la preuve"
                          : "Envoyer par email"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>

          {/* Modal historique des envois */}
          {showSendHistory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
              <Card className="w-full max-w-5xl mx-4 max-h-[80vh] overflow-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Historique des envois automatiques</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSendHistory(false)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Payment ID
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Invoice
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Destinataires
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Statut envoi
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Horodatage
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Canal
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sendHistory.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-sm">
                              {item.paymentId}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.invoice}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <div className="space-y-1">
                                {item.recipients.map((email, j) => (
                                  <div key={j} className="text-xs">
                                    {email}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.status === "success" ? (
                                <Badge
                                  variant="outline"
                                  className="border-green-500 text-green-600"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Succès
                                </Badge>
                              ) : (
                                <div>
                                  <Badge variant="destructive">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Échec
                                  </Badge>
                                  {item.error && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {item.error}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.timestamp}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.channel}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.status === "failed" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#C9A646]"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Renvoyer
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm">
                                  <Link className="w-3 h-3 mr-1" />
                                  Lien
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bannière d'info */}
                  <Alert className="mt-4 border-[#C9A646]/30 bg-[#C9A646]/5">
                    <AlertTriangle className="h-4 w-4 text-[#C9A646]" />
                    <AlertDescription>
                      Les preuves sans adresse email valide sont archivées sur
                      le portail. Veuillez corriger les contacts pour activer
                      l'envoi automatique.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
