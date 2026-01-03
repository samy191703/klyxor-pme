import { useMemo } from "react";

// MUI
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";

import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "../utils/http";
import { useDeleteAmendment } from "../queries/useDeleteAmendment";
import type { Amendment } from "../domain/types";

export function DeleteAmendmentDialog({
  open,
  onOpenChange,
  a,
  canDelete,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  a?: Amendment | null;
  canDelete: boolean;
  onDeleted?: (id: string) => void;
}) {
  const { toast } = useToast();
  const mutation = useDeleteAmendment();
  const isSubmitting = Boolean(
    (mutation as any)?.isPending ?? (mutation as any)?.isLoading
  );

  const subtitle = useMemo(() => {
    if (!a) return "";
    // Small helpful recap (customize if you want)
    const num = a.number ?? a.id;
    const title = a.title ? ` — ${a.title}` : "";
    return `Vous êtes sur le point de supprimer l’avenant ${num}${title}.`;
  }, [a]);

  if (!a) return null;

  const submit = async () => {
    try {
      // Depending on your hook signature; pick the one you use in update/create
      // await mutation.mutateAsync(a.id);
      await mutation.mutateAsync(a.id);
      toast({
        title: "Avenant supprimé",
        description: "L’avenant a été supprimé avec succès",
      });
      onDeleted?.(String(a.id)); // ⬅️ notify parent
      onOpenChange(false);
    } catch (error: any) {
      console.log(error);
      const { description } = extractApiError(error);
      console.log({
        raw: error,
        parsed: description,
        type: typeof description,
      });
      toast({
        title: "Erreur lors de la suppression de l’avenant",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onOpenChange(false);
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ position: "relative", pr: 6 }}>
        Supprimer l’avenant
        {/* Animated Close */}
        <IconButton
          aria-label="Fermer"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            transition:
              "transform 180ms ease, opacity 180ms ease, box-shadow 180ms ease",
            "&:hover": {
              transform: "rotate(90deg) scale(1.08)",
              boxShadow: (theme) => `0 0 0 6px ${theme.palette.action.hover}`,
            },
            "&:active": { transform: "rotate(90deg) scale(0.98)" },
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box className="space-y-3 py-1">
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>

          <Alert severity="warning" variant="outlined">
            <Typography fontWeight={600} gutterBottom>
              Action irréversible
            </Typography>
            <Typography variant="body2">
              Cette opération supprimera définitivement l’avenant et son
              historique associé. Veuillez confirmer votre choix.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ gap: 1.5 }}>
        <Button
          size="large"
          variant="outlined"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          data-testid="button-cancel-delete"
        >
          Annuler
        </Button>
        <Button
          size="large"
          variant="contained"
          color="error"
          onClick={submit}
          disabled={!canDelete || isSubmitting}
          data-testid="button-confirm-delete"
          endIcon={
            isSubmitting ? (
              <CircularProgress size={20} sx={{ ml: 0.5 }} />
            ) : null
          }
        >
          {isSubmitting ? "Suppression..." : "Supprimer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
