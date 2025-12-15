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

// Styles communs pour tous les TextField / Select (look KLYXOR)
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.75rem",
    backgroundColor: "#1A314E",
    color: "#F9FAFB",
    "& fieldset": {
      borderColor: "#274468",
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
        setFilters((f) => ({
          ...f,
          customer: filteredCustomers[highlightIndex],
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
          {/* Recherche */}
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

          {/* Client */}
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
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <User size={18} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Liste auto-complétion client */}
            {showCustomerList &&
              filteredCustomers.length > 0 &&
              inputRef.current &&
              createPortal(
                <div
                  style={{
                    position: "absolute",
                    top:
                      inputRef.current.getBoundingClientRect().bottom +
                      window.scrollY,
                    left:
                      inputRef.current.getBoundingClientRect().left +
                      window.scrollX,
                    width: inputRef.current.offsetWidth,
                    maxHeight: 200,
                    overflowY: "auto",
                    background: "#1A314E",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 8,
                    zIndex: 9999,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  {filteredCustomers.map((c, i) => (
                    <div
                      key={c}
                      style={{
                        padding: "6px 10px",
                        cursor: "pointer",
                        backgroundColor:
                          i === highlightIndex
                            ? "rgba(216,178,74,0.25)"
                            : "transparent",
                        color: "#F9FAFB",
                        fontSize: "0.85rem",
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

          {/* N° Contrat */}
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

          {/* Statut */}
          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Statut</InputLabel>
              <Select
                value={safe(filters.status)}
                label="Statut"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="archived">Archivé</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Type */}
          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Type</InputLabel>
              <Select
                value={safe(filters.type)}
                label="Type"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, type: e.target.value }))
                }
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
          {/* Fréquence */}
          <div className="flex-1 min-w-[100px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Fréquence</InputLabel>
              <Select
                value={safe(filters.frequency)}
                label="Fréquence"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, frequency: e.target.value }))
                }
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="MONTHLY">Mensuelle</MenuItem>
                <MenuItem value="QUARTERLY">Trimestrielle</MenuItem>
                <MenuItem value="SEMIANNUAL">Semestrielle</MenuItem>
                <MenuItem value="ANNUAL">Annuelle</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Du */}
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
            />
          </div>

          {/* Au */}
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
            />
          </div>

          {/* Trier par */}
          <div className="flex-1 min-w-[120px]">
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={safe(filters.sortBy)}
                label="Trier par"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sortBy: e.target.value }))
                }
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

          {/* Ordre */}
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

          {/* Bouton Actualiser */}
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

export default FiltersCard;
