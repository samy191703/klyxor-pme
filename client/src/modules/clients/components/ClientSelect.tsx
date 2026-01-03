// src/modules/clients/components/ClientSelect.tsx
import { useState, useMemo, useEffect } from "react";
import * as React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import SearchIcon from "@mui/icons-material/Search";
import { useClients } from "../queries/useClients";
import { CreateClientDialog } from "./Dialogs/CreateClientDialog";
import type { Client } from "../domain/types";
import { CLIENT_TYPE_LABELS } from "../domain/constants";
import { usePermissions } from "@/hooks/usePermissions";

interface ClientOption {
  value: string;
  label: string;
  client: Client;
}

interface ClientSelectProps {
  value?: string | null;
  onChange: (clientId: string | null, clientName: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  label?: string;
}

export function ClientSelect({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
  placeholder = "Rechercher un client...",
  label = "Nom du client",
}: ClientSelectProps) {
  const { data: clients = [], isLoading, refetch } = useClients();
  const { canCreateClient } = usePermissions();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [previousClientsCount, setPreviousClientsCount] = useState(clients.length);
  const [inputValue, setInputValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const hasCreatePermission = canCreateClient();

  // Filter clients based on input value
  const filteredClients = useMemo(() => {
    if (!inputValue.trim()) return clients;
    
    const query = inputValue.trim().toLowerCase();
    return clients.filter((client) => {
      const label =
        client.typeClient === "professionnel"
          ? client.companyName || ""
          : [client.lastName, client.firstName].filter(Boolean).join(" ");
      
      const haystack = [
        label,
        client.email,
        client.siret,
        client.city,
        client.postalCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      
      return haystack.includes(query);
    });
  }, [clients, inputValue]);

  // Transform clients into options
  const options: ClientOption[] = useMemo(() => {
    return filteredClients.map((client) => {
      const label =
        client.typeClient === "professionnel"
          ? client.companyName || ""
          : [client.lastName, client.firstName].filter(Boolean).join(" ");
      return {
        value: client.id,
        label: label || client.email || "—",
        client,
      };
    });
  }, [filteredClients]);

  // Find selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const handleChange = (_: any, newValue: ClientOption | null) => {
    onChange(newValue?.value || null, newValue?.label || null);
  };

  const handleCreateClient = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOpenCreateDialog(true);
  };

  // Simulate loading when searching
  useEffect(() => {
    if (inputValue.trim()) {
      setSearchLoading(true);
      const timer = setTimeout(() => {
        setSearchLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchLoading(false);
    }
  }, [inputValue]);

  // Auto-select newly created client
  useEffect(() => {
    if (clients.length > previousClientsCount && !openCreateDialog) {
      const newClient = clients[clients.length - 1];
      if (newClient && !value) {
        const newOption: ClientOption = {
          value: newClient.id,
          label:
            newClient.typeClient === "professionnel"
              ? newClient.companyName || ""
              : [newClient.lastName, newClient.firstName]
                  .filter(Boolean)
                  .join(" ") || newClient.email || "—",
          client: newClient,
        };
        onChange(newOption.value, newOption.label);
      }
    }
    setPreviousClientsCount(clients.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length, previousClientsCount, openCreateDialog]);

  const CustomPaper = (props: any) => {
    const hasResults = options.length > 0;
    const showNoResults = inputValue.trim() && !isLoading && !searchLoading && !hasResults;
    const showLoading = searchLoading && inputValue.trim() !== "";
    
    return (
      <Paper 
        {...props} 
        elevation={0}
        sx={{ 
          ...props.sx, 
          mt: 0.5,
          maxHeight: { xs: "60vh", sm: "400px" },
          overflow: "hidden",
          width: "100%",
          borderRadius: "6px",
          border: "1px solid",
          borderColor: "#e5e7eb",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Results Header */}
        {hasResults && (
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                color: "#6b7280",
                fontSize: "0.7rem",
              }}
            >
              {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""} trouvé{filteredClients.length > 1 ? "s" : ""}
            </Typography>
          </Box>
        )}

        {/* Scrollable Results */}
        <Box
          sx={{
            maxHeight: { xs: "calc(60vh - 140px)", sm: "280px" },
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#f9fafb",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#d1d5db",
              borderRadius: "3px",
              "&:hover": {
                background: "#9ca3af",
              },
            },
          }}
        >
          {props.children}
        </Box>
        
        {/* Loading State */}
        {showLoading && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              bgcolor: "#fff",
              borderTop: hasResults ? "1px solid #e5e7eb" : 0,
            }}
          >
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Recherche en cours...
            </Typography>
          </Box>
        )}
        
        {/* No Results State */}
        {showNoResults && (
          <Box
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: "#fafafa",
            }}
          >
            <SearchIcon sx={{ fontSize: 48, color: "#d1d5db", mb: 2 }} />
            <Typography variant="body1" fontWeight={600} color="text.primary" gutterBottom>
              Aucun client trouvé
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Essayez avec un autre terme de recherche
            </Typography>
          </Box>
        )}
        
        {/* Create Client Button */}
        {hasCreatePermission && (
          <Box
            sx={{
              borderTop: "1px solid #e5e7eb",
              p: 1.5,
              bgcolor: "#fff",
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCreateClient();
              }}
              disabled={disabled}
              fullWidth
              sx={{
                textTransform: "none",
                bgcolor: "#0f172a",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                py: 1,
                minHeight: { xs: "40px", sm: "auto" },
                borderRadius: "6px",
                boxShadow: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "#1e293b",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                },
                "&:active": {
                  transform: "translateY(1px)",
                },
                "&:disabled": {
                  bgcolor: "#e5e7eb",
                  color: "#9ca3af",
                },
              }}
            >
              Créer un nouveau client
            </Button>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box>
      <Autocomplete
        disablePortal
        openOnFocus
        options={options}
        value={selectedOption}
        onChange={handleChange}
        onInputChange={(_, newInputValue) => {
          setInputValue(newInputValue);
        }}
        inputValue={inputValue}
        disabled={disabled || isLoading}
        loading={false}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        PaperComponent={CustomPaper}
        noOptionsText=""
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              sx: {
                height: 42,
                fontSize: "0.875rem",
                fontWeight: 400,
                borderRadius: "6px",
                bgcolor: "#fff",
                "& input": {
                  padding: "10px 14px !important",
                },
                "& fieldset": {
                  borderWidth: 1,
                  borderColor: error ? "error.main" : "#e5e7eb",
                },
                "&:hover fieldset": {
                  borderColor: error ? "error.main" : "#d1d5db",
                },
                "&.Mui-focused fieldset": {
                  borderColor: error ? "error.main" : "#3b82f6",
                  borderWidth: 1,
                },
              },
              endAdornment: (
                <>
                  {isLoading || searchLoading ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            InputLabelProps={{
              sx: {
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "#6b7280",
                "&.Mui-focused": {
                  color: error ? "error.main" : "#3b82f6",
                },
                "&.MuiInputLabel-shrink": {
                  transform: "translate(14px, -9px) scale(0.75)",
                },
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const client = option.client;
          const typeLabel = CLIENT_TYPE_LABELS[client.typeClient] || client.typeClient;
          const isPro = client.typeClient === "professionnel";
          
          return (
            <Box
              component="li"
              {...props}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 1.25,
                px: 2,
                minHeight: { xs: "52px", sm: "auto" },
                borderBottom: "1px solid #f3f4f6",
                transition: "background-color 0.15s ease",
                "&:last-child": {
                  borderBottom: "none",
                },
                "&:hover": {
                  bgcolor: "#f9fafb",
                  cursor: "pointer",
                },
                "&.Mui-focused": {
                  bgcolor: "#f3f4f6",
                },
              }}
            >
              {/* Icon */}
              <Box
                sx={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                }}
              >
                {isPro ? (
                  <BusinessIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                ) : (
                  <PersonIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                )}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 500,
                      fontSize: { xs: 14, sm: 14 },
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.label}
                  </Typography>
                  <Chip
                    label={typeLabel}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      bgcolor: "#f3f4f6",
                      color: "#6b7280",
                      border: "none",
                      "& .MuiChip-label": {
                        px: 1,
                      },
                    }}
                  />
                </Box>
                {client.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 13, color: "#9ca3af" }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: 12, sm: 12 },
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {client.email}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        }}
        sx={{ 
          width: "100%",
          "& .MuiAutocomplete-popper": {
            width: "100% !important",
          },
        }}
      />

      <CreateClientDialog
        open={openCreateDialog}
        onOpenChange={(open) => {
          setOpenCreateDialog(open);
          if (!open) {
            setTimeout(() => {
              refetch();
            }, 500);
          }
        }}
        canCreate={hasCreatePermission}
      />
    </Box>
  );
}