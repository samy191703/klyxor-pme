import React, { useRef, useState } from "react";
import { createPortal } from "react-dom"; // ✅ correct import
import { Card, CardContent, Button } from "@mui/material";
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
  limit?: number;
  offset?: number;
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
    .filter((c) => (c ?? "").toLowerCase().includes((filters.customer || "").toLowerCase()))
    .slice(0, 10);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerList || filteredCustomers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filteredCustomers.length - 1));
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
    <Card className="mb-1 p-2 pb-0">
      <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">

        {/* Recherche globale */}
        <div className="flex flex-col relative">
          <label className="text-xs text-gray-600 mb-0.5">Recherche</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center text-gray-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              className="border rounded pl-8 pr-2 py-1 text-sm w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={safe(filters.search)}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value.replace(/\s+/g, " ").trim() }))
              }
              placeholder="Recherche globale"
            />
          </div>
        </div>

       {/* Client */}
        <div className="flex flex-col relative" ref={inputRef}>
          <label className="text-xs text-gray-600 mb-1">Client</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center text-gray-400 pointer-events-none">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Nom du client"
              className="border rounded pl-8 pr-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.customer || ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, customer: e.target.value }));
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Dropdown avec clavier */}
          {showCustomerList && filteredCustomers.length > 0 && inputRef.current &&
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
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                }}
              >
                {filteredCustomers.map((c, i) => (
                  <div
                    key={c}
                    className={`px-2 py-1 cursor-pointer text-sm ${
                      i === highlightIndex ? "bg-blue-100" : "hover:bg-gray-100"
                    }`}
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
            )
          }
        </div>

        {/* N° Contrat */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-0.5">N° Contrat</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center text-gray-400 pointer-events-none">
              <FileText className="w-4 h-4" />
            </span>
            <input
              type="text"
              className="border rounded pl-8 pr-2 py-1 text-sm w-full"
              value={safe(filters.contractNumber)}
              onChange={(e) =>
                setFilters((f) => ({ ...f, contractNumber: e.target.value.replace(/\s+/g, " ").trim() }))
              }
              placeholder="ex: CT-0054"
            />
          </div>
        </div>

        {/* Statut */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-0.5">Statut</label>
          <select
            className="border rounded px-2 py-1 text-sm w-full"
            value={safe(filters.status)}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
            <option value="archived">Archivé</option>
          </select>
        </div>

        {/* Type */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-0.5">Type</label>
          <select
            className="border rounded px-2 py-1 text-sm w-full"
            value={safe(filters.type)}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">Tous</option>
            <option value="A_ECHOIR">À Échoir</option>
            <option value="TERME_ECHU">Terme Échu</option>
          </select>
        </div>

        {/* Ligne 2 - Fréquence / Du / Au / Trier par / Ordre / Actualiser */}
        <div className="flex flex-col md:flex-row md:items-end md:gap-2 col-span-full">
          {/* Fréquence */}
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-600 mb-0.5">Fréquence</label>
            <select
              className="border rounded pl-2 pr-2 py-1 text-sm w-full"
              value={safe(filters.frequency)}
              onChange={(e) => setFilters((f) => ({ ...f, frequency: e.target.value }))}
            >
              <option value="">Toutes</option>
              <option value="MONTHLY">Mensuelle</option>
              <option value="QUARTERLY">Trimestrielle</option>
              <option value="SEMIANNUAL">Semestrielle</option>
              <option value="ANNUAL">Annuelle</option>
            </select>
          </div>

          {/* Du */}
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-600 mb-0.5">Du</label>
            <input
              type="date"
              className="border rounded pl-2 pr-2 py-1 text-sm w-full"
              value={safe(filters.from)}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>

          {/* Au */}
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-600 mb-0.5">Au</label>
            <input
              type="date"
              className="border rounded pl-2 pr-2 py-1 text-sm w-full"
              value={safe(filters.to)}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>

          {/* Trier par */}
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-600 mb-0.5">Trier par</label>
            <select
              className="border rounded pl-2 pr-2 py-1 text-sm w-full"
              value={safe(filters.sortBy)}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
            >
              <option value="createdAt">Création</option>
              <option value="startDate">Début</option>
              <option value="endDate">Fin</option>
              <option value="version">Version</option>
              <option value="frequency">Fréquence</option>
              <option value="billingType">Type</option>
              <option value="contractNumber">N° contrat</option>
            </select>
          </div>

          {/* Ordre */}
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-600 mb-0.5">Ordre</label>
            <select
              className="border rounded pl-2 pr-2 py-1 text-sm w-full"
              value={filters.sortOrder ?? "desc"}
              onChange={(e) => setFilters((f) => ({ ...f, sortOrder: e.target.value as "asc" | "desc" }))}
            >
              <option value="asc">Croissant</option>
              <option value="desc">Décroissant</option>
            </select>
          </div>

          {/* Actualiser */}
          <div className="flex items-end">
            <Button
              variant="outlined"
              onClick={handleRefresh}
              className="text-xs w-full md:w-auto mt-2 md:mt-0 flex items-center justify-center gap-1 py-0.5 px-2 h-9"
            >
              <RefreshCw className="w-3 h-3" /> Actualiser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiltersCard;
