import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export default function RejectionModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Motif de rejet",
  description = "Veuillez indiquer le motif du rejet. Ce champ est obligatoire.",
  isLoading = false,
}: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Le motif de rejet est obligatoire");
      return;
    }
    
    onConfirm(reason.trim());
    handleClose();
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="rejection-modal">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="Veuillez indiquer le motif du rejet..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            className={`min-h-[120px] resize-none ${error ? "border-red-500" : ""}`}
            data-testid="textarea-rejection-reason"
          />
          {error && (
            <p className="text-sm text-red-600" data-testid="error-message">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            data-testid="button-cancel-rejection"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            data-testid="button-confirm-rejection"
          >
            {isLoading ? "Traitement..." : "Confirmer le rejet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
