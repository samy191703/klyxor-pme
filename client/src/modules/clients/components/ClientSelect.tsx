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
      // A new client was just created
      const newClient = clients[clients.length - 1];
      if (newClient && !value) {
        // Only auto-select if no client is currently selected
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
        sx={{ 
          ...props.sx, 
          mt: 1,
          maxHeight: { xs: "60vh", sm: "400px" },
          overflow: "auto",
          width: { xs: "calc(100vw - 32px)", sm: "auto" },
          maxWidth: { xs: "calc(100vw - 32px)", sm: "none" },
        }}
      >
        {props.children}
        
        {showLoading && (
          <Box
            sx={{
              p: 1.5,
              textAlign: "center",
              bgcolor: "background.default",
              borderTop: hasResults ? 1 : 0,
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Chargement...
            </Typography>
          </Box>
        )}
        
        {showNoResults && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              textAlign: "center",
              background: "linear-gradient(90deg,rgb(46, 41, 27) 0%, #C9A646 100%)",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Pas de résultats
            </Typography>
          </Box>
        )}
        
        {hasCreatePermission && (
          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
              p: { xs: 1, sm: 1 },
              bgcolor: "background.default",
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
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 500,
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                py: { xs: 1, sm: 0.75 },
                minHeight: { xs: "44px", sm: "auto" },
                "&:hover": {
                  bgcolor: "primary.dark",
                },
                "&:disabled": {
                  bgcolor: "action.disabledBackground",
                  color: "action.disabled",
                },
              }}
            >
              Nouveau client
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
              endAdornment: (
                <>
                  {isLoading || searchLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const client = option.client;
          const typeLabel = CLIENT_TYPE_LABELS[client.typeClient] || client.typeClient;
          return (
            <Box
              component="li"
              {...props}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                py: { xs: 1.25, sm: 1.5 },
                px: { xs: 1.5, sm: 2 },
                minHeight: { xs: "48px", sm: "auto" },
              }}
            >
              <Box sx={{ 
                fontWeight: 600, 
                fontSize: { xs: 13, sm: 14 },
                wordBreak: "break-word",
                width: "100%",
              }}>
                {option.label}
              </Box>
              <Box sx={{ 
                fontSize: { xs: 11, sm: 12 }, 
                color: "text.secondary", 
                mt: 0.5,
                wordBreak: "break-word",
                width: "100%",
              }}>
                {typeLabel} {client.email ? `• ${client.email}` : ""}
              </Box>
            </Box>
          );
        }}
        sx={{ 
          width: "100%",
          "& .MuiAutocomplete-popper": {
            width: { xs: "calc(100vw - 32px) !important", sm: "auto" },
            maxWidth: { xs: "calc(100vw - 32px) !important", sm: "none" },
          },
        }}
      />

      <CreateClientDialog
        open={openCreateDialog}
        onOpenChange={(open) => {
          setOpenCreateDialog(open);
          if (!open) {
            // Refresh clients list when dialog closes to get the newly created client
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

