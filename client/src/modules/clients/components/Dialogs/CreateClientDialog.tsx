// src/modules/clients/components/CreateClientDialog.tsx
import { useState } from "react";

// MUI
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import CloseIcon from "@mui/icons-material/Close";

import { useToast } from "@/hooks/use-toast";
import { useCreateClient } from "../../queries/useCreateClient";
import type { ClientCreateDto, ClientType } from "../../domain/types";
import { CLIENT_TYPE_LABELS } from "../../domain/constants";
import { extractApiError } from "../../utils/http";

export function CreateClientDialog({
  open,
  onOpenChange,
  canCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canCreate: boolean;
}) {
  const { toast } = useToast();
  const mutation = useCreateClient();
  const isSubmitting = Boolean(
    (mutation as any)?.isPending ?? (mutation as any)?.isLoading
  );

  const [form, setForm] = useState<ClientCreateDto>({
    typeClient: "professionnel",
    companyName: "",
    siret: "",
    lastName: "",
    firstName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
    country: "",
    paymentTerms: "30j_date_facture",
    isActive: true,
  });

  const isPro = form.typeClient === "professionnel";
  const isIndiv = form.typeClient === "particulier";

  const validate = () => {
    if (!form.typeClient) {
      return "Veuillez sélectionner un type de client.";
    }

    if (isPro) {
      if (!form.companyName?.trim()) {
        return "Veuillez saisir la raison sociale du client professionnel.";
      }
      if (!form.paymentTerms?.trim()) {
        return "Veuillez sélectionner une condition de paiement.";
      }
    }

    if (isIndiv) {
      if (!form.lastName?.trim()) {
        return "Veuillez saisir le nom du client.";
      }
      if (!form.firstName?.trim()) {
        return "Veuillez saisir le prénom du client.";
      }
    }

    // Optionnel : validation légère d'email
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      return "Veuillez saisir une adresse e-mail valide.";
    }

    return null;
  };

  const resetForm = () => {
    setForm({
      typeClient: "professionnel",
      companyName: "",
      siret: "",
      lastName: "",
      firstName: "",
      email: "",
      phone: "",
      address: "",
      postalCode: "",
      city: "",
      country: "",
      paymentTerms: "30j_date_facture",
      isActive: true,
    });
  };

  const submit = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      toast({ title: "Erreur", description: errorMsg, variant: "destructive" });
      return;
    }

    try {
      const payload: ClientCreateDto = {
        ...form,
        companyName: isPro ? form.companyName?.trim() : undefined,
        siret: isPro ? form.siret?.trim() || undefined : undefined,
        paymentTerms: isPro ? form.paymentTerms?.trim() || undefined : undefined,
        lastName: isIndiv ? form.lastName?.trim() : undefined,
        firstName: isIndiv ? form.firstName?.trim() : undefined,
        email: form.email?.trim() || "",
        phone: form.phone?.trim() || "",
        address: form.address?.trim() || "",
        postalCode: form.postalCode?.trim() || "",
        city: form.city?.trim() || "",
        country: form.country?.trim() || undefined,
      };

      await mutation.mutateAsync(payload);
      toast({
        title: "Client créé",
        description: "Le client a été créé avec succès",
      });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      const { title, description } = extractApiError(error);
      toast({
        title: title || "Erreur lors de la création du client",
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
      maxWidth="md"
    >
      <DialogTitle sx={{ position: "relative", mr: 1 }}>
        Créer un nouveau client
        {/* Top-right close icon same animation as Amendments */}
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
        <p className="text-sm text-muted-foreground">
          Remplissez les informations pour créer un nouveau client
        </p>

        <Box className="space-y-4 py-4">
          {/* Type de client */}
          <TextField
            select
            fullWidth
            label="Type de client *"
            value={form.typeClient}
            disabled={isSubmitting}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                typeClient: e.target.value as ClientType,
              }))
            }
            SelectProps={{
              MenuProps: {
                anchorOrigin: { vertical: "bottom", horizontal: "left" },
                transformOrigin: { vertical: "top", horizontal: "left" },
              },
            }}
            inputProps={{ "data-testid": "select-type-client" }}
          >
            {Object.entries(CLIENT_TYPE_LABELS).map(([v, l]) => (
              <MenuItem key={v} value={v}>
                {l}
              </MenuItem>
            ))}
          </TextField>

          {/* Bloc Professionnel */}
          {isPro && (
            <>
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Raison sociale *"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  disabled={isSubmitting}
                  inputProps={{ "data-testid": "input-company-name" }}
                />
                <TextField
                  fullWidth
                  label="SIRET"
                  value={form.siret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, siret: e.target.value }))
                  }
                  disabled={isSubmitting}
                  inputProps={{ "data-testid": "input-siret" }}
                />
              </Box>
              <TextField
                select
                fullWidth
                label="Conditions de paiement *"
                value={form.paymentTerms || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentTerms: e.target.value }))
                }
                disabled={isSubmitting}
                inputProps={{ "data-testid": "select-payment-terms" }}
              >
                <MenuItem value="30j_date_facture">30 jours date de facture</MenuItem>
                <MenuItem value="30j">30 jours</MenuItem>
                <MenuItem value="60j">60 jours</MenuItem>
                <MenuItem value="a_commande">À commande</MenuItem>
                <MenuItem value="a_livraison">À livraison</MenuItem>
                <MenuItem value="50/50">50/50</MenuItem>
              </TextField>
            </>
          )}

          {/* Bloc Particulier */}
          {isIndiv && (
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Nom *"
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                disabled={isSubmitting}
                inputProps={{ "data-testid": "input-last-name" }}
              />
              <TextField
                fullWidth
                label="Prénom *"
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                disabled={isSubmitting}
                inputProps={{ "data-testid": "input-first-name" }}
              />
            </Box>
          )}

          {/* Coordonnées */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              disabled={isSubmitting}
              inputProps={{ "data-testid": "input-email" }}
            />
            <TextField
              fullWidth
              label="Téléphone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              disabled={isSubmitting}
              inputProps={{ "data-testid": "input-phone" }}
            />
          </Box>

          {/* Adresse */}
          <TextField
            fullWidth
            label="Adresse"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            disabled={isSubmitting}
            inputProps={{ "data-testid": "input-address" }}
          />

          <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              fullWidth
              label="Code postal"
              value={form.postalCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, postalCode: e.target.value }))
              }
              disabled={isSubmitting}
              inputProps={{ "data-testid": "input-postal-code" }}
            />
            <TextField
              fullWidth
              label="Ville"
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({ ...f, city: e.target.value }))
              }
              disabled={isSubmitting}
              inputProps={{ "data-testid": "input-city" }}
            />
            <TextField
              fullWidth
              label="Pays"
              value={form.country}
              onChange={(e) =>
                setForm((f) => ({ ...f, country: e.target.value }))
              }
              disabled={isSubmitting}
              inputProps={{ "data-testid": "input-country" }}
            />
          </Box>

          {/* Statut actif */}
          <FormControlLabel
            control={
              <Switch
                checked={!!form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                disabled={isSubmitting}
              />
            }
            label="Client actif"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ gap: 1.5 }}>
        <Button
          size="large"
          variant="outlined"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          size="large"
          variant="contained"
          onClick={submit}
          disabled={isSubmitting}
          data-testid="button-create-client"
          endIcon={
            isSubmitting ? (
              <CircularProgress size={20} sx={{ ml: 0.5 }} />
            ) : null
          }
        >
          {isSubmitting ? "Création..." : "Créer le client"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


