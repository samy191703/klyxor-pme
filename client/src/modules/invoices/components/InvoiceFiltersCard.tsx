import React, { useRef, useState } from "react";
import {
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
} from "@mui/material";
import { Search, FileText, RefreshCw, Calendar } from "lucide-react";
import type { InvoiceQuery } from "../api/invoice.api";

export type InvoiceFilters = InvoiceQuery;

interface InvoiceFiltersCardProps {
  filters: InvoiceFilters;
  setFilters: React.Dispatch<React.SetStateAction<InvoiceFilters>>;
  customerOptions: string[];
  showCustomerList: boolean;
  setShowCustomerList: (v: boolean) => void;
  handleRefresh: () => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
}

// Styles communs pour les champs MUI (TextField / Select)
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.75rem",
    backgroundColor: "#1A314E",
    color: "#F9FAFB",
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.22)",
    },
    "&:hover fieldset": {
      borderColor: "#D8B24A",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#D8B24A",
      boxShadow: "0 0 0 1px rgba(216,178,74,0.5)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#CBD5F5",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#F9FAFB",
  },
  "& .MuiInputAdornment-root svg": {
    color: "#CBD5F5",
  },
  "& .MuiSelect-icon": {
    color: "#CBD5F5",
  },
};

export const InvoiceFiltersCard: React.FC<InvoiceFiltersCardProps> = ({
  filters,
  setFilters,
  customerOptions,
  showCustomerList,
  setShowCustomerList,
  handleRefresh,
  customerSearch,
  setCustomerSearch,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const safe = (v?: string) => v ?? "";
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  const filteredCustomers = customerOptions
    .filter((c) =>
      (c ?? "").toLowerCase().includes((customerSearch || "").toLowerCase())
    )
    .slice(0, 10);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerList || filteredCustomers.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        Math.min(prev + 1, filteredCustomers.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0) {
        setFilters((f) => ({
          ...f,
          search: filteredCustomers[highlightIndex],
        }));
        setShowCustomerList(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowCustomerList(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <Card
      className="mb-4"
      sx={{
        borderRadius: "1rem",
        backgroundColor: "#142B46",
        color: "#F9FAFB",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
      }}
    >
      <CardContent
        sx={{
          p: 2,
          "& .MuiFormLabel-root": {
            fontSize: "0.8rem",
          },
        }}
      >
        {/* Ligne 1 */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex-1 min-w-[150px]">
            <TextField
              label="Recherche"
              size="small"
              fullWidth
              value={safe(filters.search)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  search: e.target.value.replace(/\s+/g, " ").trim(),
                }))
              }
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="flex-1 min-w-[120px]">
            <TextField
              label="N° Contrat"
              size="small"
              fullWidth
              value={safe(filters.contractNumber)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  contractNumber: e.target.value
                    .replace(/\s+/g, " ")
                    .trim(),
                }))
              }
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FileText size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Statut</InputLabel>
              <Select
                value={safe(filters.status)}
                label="Statut"
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    status: e.target.value as any,
                  }))
                }
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="inpaid">Non payé</MenuItem>
                <MenuItem value="paid">Payé</MenuItem>
                <MenuItem value="paid_parsely">Partiellement payé</MenuItem>
                <MenuItem value="cancelled">Annulée</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Type</InputLabel>
              <Select
                value={safe(filters.type)}
                label="Type"
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type: e.target.value as any,
                  }))
                }
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="NORMAL">Normale</MenuItem>
                <MenuItem value="ADJUSTEMENT">Ajustement</MenuItem>
                <MenuItem value="AVOIR">Avoir</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Ligne 2 */}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[120px]">
            <TextField
              label="N° Facture"
              size="small"
              fullWidth
              value={safe(filters.invoiceNumber)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  invoiceNumber: e.target.value
                    .replace(/\s+/g, " ")
                    .trim(),
                }))
              }
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FileText size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="flex-1 min-w-[100px]">
            <TextField
              label="Du"
              size="small"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={safe(filters.from)}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value }))
              }
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Calendar size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="flex-1 min-w-[100px]">
            <TextField
              label="Au"
              size="small"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={safe(filters.to)}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value }))
              }
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Calendar size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={safe(filters.sortBy) || "createdAt"}
                label="Trier par"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sortBy: e.target.value }))
                }
              >
                <MenuItem value="createdAt">Date de création</MenuItem>
                <MenuItem value="invoiceNumber">N° Facture</MenuItem>
                <MenuItem value="totalAmount">Montant Total</MenuItem>
                <MenuItem value="status">Statut</MenuItem>
                <MenuItem value="contractNumber">N° Contrat</MenuItem>
                <MenuItem value="dueDate">Date d&apos;échéance</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="flex-1 min-w-[100px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Ordre</InputLabel>
              <Select
                value={filters.sortOrder ?? "desc"}
                label="Ordre"
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sortOrder: e.target.value as "asc" | "desc",
                  }))
                }
              >
                <MenuItem value="asc">Croissant</MenuItem>
                <MenuItem value="desc">Décroissant</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="min-w-[100px] flex items-stretch">
            <Button
              fullWidth
              size="small"
              startIcon={<RefreshCw size={14} />}
              onClick={handleRefresh}
              sx={{
                borderRadius: "9999px",
                backgroundColor: "#D8B24A",
                color: "#0D243D",
                fontWeight: 500,
                textTransform: "none",
                px: 2,
                minHeight: 32,
                "&:hover": {
                  backgroundColor: "#C7A040",
                },
              }}
            >
              Actualiser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFiltersCard;
