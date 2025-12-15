import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { MoreVertical, Check, RotateCw, FileText } from "lucide-react";
import { CreateAvoirDialog } from "./dialogs/CreateAvoirDialog";

interface MoreActionsProps {
  r: any;
  isDownloading?: boolean;
  onDownload?: (invoice: any) => void;
  onView?: (invoice: any) => void;
  onValidate?: (invoice: any) => void;
  onRevert?: (invoice: any) => void;
  onCreateAvoir?: (invoice: any) => void;  
}

const MoreActions: React.FC<MoreActionsProps> = ({
  r,
  onValidate,
  onRevert,
  onCreateAvoir,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"validate" | "revert" | null>(null);

  const [createAvoirDialogOpen, setCreateAvoirDialogOpen] = useState(false);
  const [invoiceForAvoir, setInvoiceForAvoir] = useState<any>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Confirmation Validate / Revert
  const handleConfirm = (action: "validate" | "revert") => {
    setConfirmAction(action);
    setConfirmOpen(true);
    handleClose();
  };

  const handleConfirmOk = () => {
    if (confirmAction === "validate" && onValidate) onValidate(r);
    if (confirmAction === "revert" && onRevert) onRevert(r);
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleConfirmCancel = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  // Ouvrir le dialog Create Avoir
  const handleCreateAvoirClick = () => {
    setInvoiceForAvoir(r);
    setCreateAvoirDialogOpen(true);
    handleClose();
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {(onValidate || onRevert || onCreateAvoir) && (
        <>
          <Tooltip title="Plus d'actions">
            <IconButton size="small" onClick={handleClick}>
              <MoreVertical className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            {onValidate && (
              <MenuItem onClick={() => handleConfirm("validate")}>
                <ListItemIcon>
                  <Check className="h-4 w-4" />
                </ListItemIcon>
                Valider la facture
              </MenuItem>
            )}
            {onRevert && (
              <MenuItem onClick={() => handleConfirm("revert")}>
                <ListItemIcon>
                  <RotateCw className="h-4 w-4" />
                </ListItemIcon>
                Remettre en brouillon
              </MenuItem>
            )}
            {onCreateAvoir && (
              <MenuItem onClick={handleCreateAvoirClick}>
                <ListItemIcon>
                  <FileText className="h-4 w-4" />
                </ListItemIcon>
                Créer un avoir
              </MenuItem>
            )}
          </Menu>
        </>
      )}

      {/* Dialog de confirmation Validate / Revert */}
      <Dialog open={confirmOpen} onClose={handleConfirmCancel}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmAction === "validate" ? (
              <>Êtes-vous sûr de vouloir valider cette facture ? N° <strong>{r.invoiceNumber}</strong></>
            ) : (
              <>Êtes-vous sûr de vouloir remettre cette facture en brouillon ? N° <strong>{r.invoiceNumber}</strong></>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel} color="inherit">Annuler</Button>
          <Button onClick={handleConfirmOk} color="primary">Confirmer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Create Avoir */}
      {invoiceForAvoir && (
        <CreateAvoirDialog
          open={createAvoirDialogOpen}
          onOpenChange={setCreateAvoirDialogOpen}
          invoice={invoiceForAvoir}
          onSuccess={() => {
            if (onCreateAvoir) onCreateAvoir(invoiceForAvoir); // appeler callback
            setInvoiceForAvoir(null);
          }}
        />
      )}
    </div>
  );
};

export default MoreActions;
