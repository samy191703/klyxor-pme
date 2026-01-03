import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { Search, User, FileText, RefreshCw, Calendar } from "lucide-react";
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
        setFilters((f) => ({ ...f, search: filteredCustomers[highlightIndex] }));
        setShowCustomerList(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowCustomerList(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <Card className="mb-2 p-2">
      <CardContent>
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
                  contractNumber: e.target.value.replace(/\s+/g, " ").trim(),
                }))
              }
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
            <FormControl size="small" fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={safe(filters.status)}
                label="Statut"
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any }))}
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
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={safe(filters.type)}
                label="Type"
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as any }))}
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
                  invoiceNumber: e.target.value.replace(/\s+/g, " ").trim(),
                }))
              }
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
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
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
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
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
            <FormControl size="small" fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={safe(filters.sortBy) || "createdAt"}
                label="Trier par"
                onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              >
                <MenuItem value="createdAt">Date de création</MenuItem>
                <MenuItem value="invoiceNumber">N° Facture</MenuItem>
                <MenuItem value="totalAmount">Montant Total</MenuItem>
                <MenuItem value="status">Statut</MenuItem>
                <MenuItem value="contractNumber">N° Contrat</MenuItem>
                <MenuItem value="dueDate">Date d'échéance</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex-1 min-w-[100px]">
            <FormControl size="small" fullWidth>
              <InputLabel>Ordre</InputLabel>
              <Select
                value={filters.sortOrder ?? "desc"}
                label="Ordre"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sortOrder: e.target.value as "asc" | "desc" }))
                }
              >
                <MenuItem value="asc">Croissant</MenuItem>
                <MenuItem value="desc">Décroissant</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="min-w-[80px]">
            <Button
              variant="outlined"
              fullWidth
              size="small"
              startIcon={<RefreshCw size={14} />}
              sx={{ py: 0.8, px: 1, minHeight: 28 }}
              onClick={handleRefresh}
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

