// src/modules/clients/components/ViewClientDialog.tsx
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DescriptionIcon from "@mui/icons-material/Description";

import type { Client } from "../../domain/types";
import { CLIENT_TYPE_LABELS } from "../../domain/constants";
import { formatDateFR } from "../../utils/formatters";
import { formatPaymentTerms } from "@/utils/formatters";

interface InfoFieldProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  monospace?: boolean;
}

function InfoField({ label, value, icon, monospace }: InfoFieldProps) {
  return (
    <Box>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
        {icon && (
          <Box sx={{ color: "primary.main", display: "flex", fontSize: 18 }}>
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        variant="body1"
        sx={{
          fontFamily: monospace ? "monospace" : "inherit",
          color: "text.primary",
          fontWeight: 500,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function ViewClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: Client | null;
}) {
  if (!client) return null;

  const isPro = client.typeClient === "professionnel";
  const isIndiv = client.typeClient === "particulier";

  const clientName = isPro
    ? client.companyName
    : [client.lastName, client.firstName].filter(Boolean).join(" ");

  const addressParts = [
    client.address?.trim(),
    [client.postalCode, client.city].filter(Boolean).join(" "),
    client.country?.trim(),
  ].filter(Boolean);
  const fullAddress = addressParts.length ? addressParts.join(", ") : "—";

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
        },
      }}
    >
      <DialogTitle
        sx={{
          position: "relative",
          pb: 2,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "primary.main",
                color: "white",
              }}
            >
              {isPro ? <BusinessIcon /> : <PersonIcon />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                {clientName || "—"}
              </Typography>
              <Typography
                variant="caption"
                component="div"
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                Détails du client
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
              label={client.isActive ? "Actif" : "Inactif"}
              size="small"
              color={client.isActive ? "success" : "default"}
              sx={{
                fontWeight: 600,
                boxShadow: 1,
              }}
            />
            <Chip
              label={CLIENT_TYPE_LABELS[client.typeClient] || client.typeClient}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
        </Stack>

        <IconButton
          aria-label="Fermer"
          onClick={() => onOpenChange(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            bgcolor: "background.paper",
            boxShadow: 1,
            transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: "rotate(90deg) scale(1.1)",
              bgcolor: "error.main",
              color: "white",
              boxShadow: 3,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 3 }}>
        <Stack spacing={3}>
          {/* Informations principales */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "background.default",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: "primary.main",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Informations principales
            </Typography>
            <Grid container spacing={3}>
              {isPro && (
                <>
                  <Grid item xs={12} md={6}>
                    <InfoField
                      label="Raison sociale"
                      value={client.companyName || "—"}
                      icon={<BusinessIcon />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoField
                      label="SIRET"
                      value={client.siret || "—"}
                      monospace
                    />
                  </Grid>
                  {client.paymentTerms && (
                    <Grid item xs={12}>
                      <InfoField
                        label="Conditions de paiement"
                        value={
                          formatPaymentTerms(client.paymentTerms as any) ||
                          client.paymentTerms
                        }
                      />
                    </Grid>
                  )}
                </>
              )}

              {isIndiv && (
                <>
                  <Grid item xs={12} md={6}>
                    <InfoField
                      label="Nom"
                      value={client.lastName || "—"}
                      icon={<PersonIcon />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoField
                      label="Prénom"
                      value={client.firstName || "—"}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          {/* Coordonnées */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "background.default",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: "primary.main",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Coordonnées
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <InfoField
                  label="Email"
                  value={client.email || "—"}
                  icon={<EmailIcon />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoField
                  label="Téléphone"
                  value={client.phone || "—"}
                  icon={<PhoneIcon />}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Adresse */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "background.default",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: "primary.main",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Adresse
            </Typography>
            <Stack spacing={3}>
              <InfoField
                label="Adresse complète"
                value={fullAddress}
                icon={<LocationOnIcon />}
              />
              <Grid container spacing={2}>
                {client.postalCode && (
                  <Grid item xs={12} sm={4}>
                    <InfoField
                      label="Code postal"
                      value={client.postalCode}
                    />
                  </Grid>
                )}
                {client.city && (
                  <Grid item xs={12} sm={4}>
                    <InfoField label="Ville" value={client.city} />
                  </Grid>
                )}
                {client.country && (
                  <Grid item xs={12} sm={4}>
                    <InfoField label="Pays" value={client.country} />
                  </Grid>
                )}
              </Grid>
            </Stack>
          </Paper>

          {/* Informations système */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: "background.default",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: "primary.main",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Informations système
            </Typography>
            <Grid container spacing={3}>
              {client.createdAt && (
                <Grid item xs={12} md={6}>
                  <InfoField
                    label="Créé le"
                    value={formatDateFR(client.createdAt)}
                    icon={<CalendarTodayIcon />}
                  />
                </Grid>
              )}
              {client.updatedAt && (
                <Grid item xs={12} md={6}>
                  <InfoField
                    label="Modifié le"
                    value={formatDateFR(client.updatedAt)}
                    icon={<CalendarTodayIcon />}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Statistiques */}
          {(client.activeContractsCount !== undefined ||
            client.closedContractsCount !== undefined) && (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: "success.50",
                borderRadius: 2,
                border: 1,
                borderColor: "success.200",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <DescriptionIcon sx={{ color: "success.main" }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: "success.main",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Contrats liés
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                {client.activeContractsCount !== undefined && (
                  <Chip
                    label={`${client.activeContractsCount} actif${
                      client.activeContractsCount > 1 ? "s" : ""
                    }`}
                    size="medium"
                    color="success"
                    sx={{
                      fontWeight: 600,
                      boxShadow: 1,
                    }}
                  />
                )}
                {client.closedContractsCount !== undefined && (
                  <Chip
                    label={`${client.closedContractsCount} clos`}
                    size="medium"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      borderWidth: 2,
                    }}
                  />
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        <Button
          size="large"
          variant="contained"
          onClick={() => onOpenChange(false)}
          sx={{
            px: 4,
            py: 1,
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
            boxShadow: 2,
            "&:hover": {
              boxShadow: 4,
            },
          }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}