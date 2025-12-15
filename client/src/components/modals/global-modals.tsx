import { useModal } from "./modal-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

export function GlobalModals() {
  const { modalState, confirmModal, cancelModal } = useModal();
  const [rejectionReason, setRejectionReason] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [gdprRequestType, setGdprRequestType] = useState("");
  const [gdprJustification, setGdprJustification] = useState("");

  if (!modalState.isOpen || !modalState.type) return null;

  // Modal de confirmation générique
  if (modalState.type === "confirm") {
    const { title, description, variant = "default" } = modalState.data || {};
    
    return (
      <Dialog open={modalState.isOpen} onOpenChange={cancelModal}>
        <DialogContent className="w-full max-w-md sm:w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {variant === "destructive" && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {variant === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
              {variant === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
              {title || "Confirmer l'action"}
            </DialogTitle>
            <DialogDescription>{description || " "}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelModal}>
              Annuler
            </Button>
            <Button 
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={() => confirmModal()}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal de rejet avec motif
  if (modalState.type === "reject") {
    const { title, itemName } = modalState.data || {};
    
    return (
      <Dialog open={modalState.isOpen} onOpenChange={cancelModal}>
        <DialogContent className="w-full max-w-md sm:w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {title || "Rejeter la demande"}
            </DialogTitle>
            {itemName && (
              <DialogDescription>
                Élément : {itemName}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Motif du rejet <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Expliquez la raison du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelModal}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                confirmModal({ reason: rejectionReason });
                setRejectionReason("");
              }}
              disabled={!rejectionReason.trim()}
            >
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal de transfert
  if (modalState.type === "transfer") {
    const { title, validators = [] } = modalState.data || {};
    
    return (
      <Dialog open={modalState.isOpen} onOpenChange={cancelModal}>
        <DialogContent className="w-full max-w-md sm:w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle>
              {title || "Transférer la demande"}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le validateur à qui transférer cette demande
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-to">
                Transférer à <span className="text-destructive">*</span>
              </Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger id="transfer-to">
                  <SelectValue placeholder="Sélectionner un validateur" />
                </SelectTrigger>
                <SelectContent>
                  {validators.map((validator: any) => (
                    <SelectItem key={validator.id} value={validator.id}>
                      {validator.name} - {validator.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelModal}>
              Annuler
            </Button>
            <Button 
              onClick={() => {
                confirmModal({ transferTo });
                setTransferTo("");
              }}
              disabled={!transferTo}
            >
              Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal GDPR
  if (modalState.type === "gdpr") {
    return (
      <Dialog open={modalState.isOpen} onOpenChange={cancelModal}>
        <DialogContent className="w-full max-w-2xl sm:w-[95vw] md:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle demande GDPR</DialogTitle>
            <DialogDescription>
              Enregistrer une demande d'exercice des droits RGPD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de demande</Label>
              <RadioGroup value={gdprRequestType} onValueChange={setGdprRequestType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="access" id="access" />
                  <Label htmlFor="access">Droit d'accès</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rectification" id="rectification" />
                  <Label htmlFor="rectification">Droit de rectification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deletion" id="deletion" />
                  <Label htmlFor="deletion">Droit à l'effacement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="portability" id="portability" />
                  <Label htmlFor="portability">Droit à la portabilité</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="opposition" id="opposition" />
                  <Label htmlFor="opposition">Droit d'opposition</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdpr-justification">
                Justification <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="gdpr-justification"
                placeholder="Détaillez la demande..."
                value={gdprJustification}
                onChange={(e) => setGdprJustification(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelModal}>
              Annuler
            </Button>
            <Button 
              onClick={() => {
                confirmModal({ 
                  type: gdprRequestType, 
                  justification: gdprJustification 
                });
                setGdprRequestType("");
                setGdprJustification("");
              }}
              disabled={!gdprRequestType || !gdprJustification.trim()}
            >
              Soumettre la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Sheet pour les détails utilisateur
  if (modalState.type === "user-details") {
    const user = modalState.data?.user || {};
    
    return (
      <Sheet open={modalState.isOpen} onOpenChange={cancelModal}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détail utilisateur & affectation des rôles</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Informations utilisateur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{user.lastName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prénom</Label>
                  <p className="font-medium">{user.firstName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{user.email || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rôle</Label>
                  <p className="font-medium">{user.role || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Département</Label>
                  <p className="font-medium">{user.department || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <p className="font-medium">{user.status || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Sheet pour les détails de log
  if (modalState.type === "log-details") {
    const log = modalState.data?.log || {};
    
    return (
      <Sheet open={modalState.isOpen} onOpenChange={cancelModal}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Détail du log</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label className="text-muted-foreground">Action</Label>
              <p className="font-medium">{log.action || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Utilisateur</Label>
              <p className="font-medium">{log.user || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{log.date || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">IP</Label>
              <p className="font-medium">{log.ip || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Détails</Label>
              <p className="font-medium text-sm">{log.details || "N/A"}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Modal d'information
  if (modalState.type === "info") {
    const { title, description, icon } = modalState.data || {};
    
    return (
      <Dialog open={modalState.isOpen} onOpenChange={cancelModal}>
        <DialogContent className="w-full max-w-md sm:w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon || <Info className="h-5 w-5 text-blue-600" />}
              {title || "Information"}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {description || " "}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={cancelModal}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}