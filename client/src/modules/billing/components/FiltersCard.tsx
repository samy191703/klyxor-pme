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
import { Search, User, FileText, RefreshCw } from "lucide-react";

export type Filters = {
  search?: string;
  customer?: string;
  contractNumber?: string;
  status?: string;
  type?: string;
  frequency?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

interface FiltersCardProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  customerOptions: string[];
  showCustomerList: boolean;
  setShowCustomerList: (v: boolean) => void;
  handleRefresh: () => void;
}

export const FiltersCard: React.FC<FiltersCardProps> = ({
  filters,
  setFilters,
  customerOptions,
  showCustomerList,
  setShowCustomerList,
  handleRefresh,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const safe = (v?: string) => v ?? "";
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  const filteredCustomers = customerOptions
    .filter((c) =>
      (c ?? "").toLowerCase().includes((filters.customer || "").toLowerCase())
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
        setFilters((f) => ({ ...f, customer: filteredCustomers[highlightIndex] }));
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
          <div className="flex-1 min-w-[150px] relative">
            <TextField
              label="Client"
              size="small"
              fullWidth
              value={safe(filters.customer)}
              inputRef={inputRef}
              onChange={(e) => {
                setFilters((f) => ({ ...f, customer: e.target.value }));
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
              onKeyDown={handleKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <User size={18} />
                  </InputAdornment>
                ),
              }}
            />
            {showCustomerList &&
              filteredCustomers.length > 0 &&
              inputRef.current &&
              createPortal(
                <div
                  style={{
                    position: "absolute",
                    top: inputRef.current.getBoundingClientRect().bottom + window.scrollY,
                    left: inputRef.current.getBoundingClientRect().left + window.scrollX,
                    width: inputRef.current.offsetWidth,
                    maxHeight: 200,
                    overflowY: "auto",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    zIndex: 9999,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  {filteredCustomers.map((c, i) => (
                    <div
                      key={c}
                      style={{
                        padding: "4px 8px",
                        cursor: "pointer",
                        backgroundColor: i === highlightIndex ? "#e0f2ff" : "transparent",
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setFilters((f) => ({ ...f, customer: c }));
                        setShowCustomerList(false);
                        setHighlightIndex(-1);
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>,
                document.body
              )}
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
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="archived">Archivé</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={safe(filters.type)}
                label="Type"
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="A_ECHOIR">À Échoir</MenuItem>
                <MenuItem value="TERME_ECHU">Terme Échu</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Ligne 2 */}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[100px]">
            <FormControl size="small" fullWidth>
              <InputLabel>Fréquence</InputLabel>
              <Select
                value={safe(filters.frequency)}
                label="Fréquence"
                onChange={(e) => setFilters((f) => ({ ...f, frequency: e.target.value }))}
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="MONTHLY">Mensuelle</MenuItem>
                <MenuItem value="QUARTERLY">Trimestrielle</MenuItem>
                <MenuItem value="SEMIANNUAL">Semestrielle</MenuItem>
                <MenuItem value="ANNUAL">Annuelle</MenuItem>
              </Select>
            </FormControl>
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
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={safe(filters.sortBy)}
                label="Trier par"
                onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              >
                <MenuItem value="createdAt">Création</MenuItem>
                <MenuItem value="startDate">Début</MenuItem>
                <MenuItem value="endDate">Fin</MenuItem>
                <MenuItem value="version">Version</MenuItem>
                <MenuItem value="frequency">Fréquence</MenuItem>
                <MenuItem value="billingType">Type</MenuItem>
                <MenuItem value="contractNumber">N° contrat</MenuItem>
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

export default FiltersCard;
