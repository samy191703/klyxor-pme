// components/KpiDashboard.tsx
import { Card, CardContent, FormControl, InputLabel, MenuItem, Select, TextField, SelectChangeEvent } from "@mui/material";
import { User } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Définir un type pour les filtres KPI
interface KpiFilters {
  from: string;
  to: string;
  customer: string;
}

type PeriodPreset = "month" | "quarter" | "year" | "custom";

// Ajuster les props
interface KpiDashboardProps {
  kpiFilters: KpiFilters;
  setKpiFilters: React.Dispatch<React.SetStateAction<KpiFilters>>;
  customerSearch: string;
  setCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  showCustomerList: boolean;
  setShowCustomerList: React.Dispatch<React.SetStateAction<boolean>>;
  customerOptions: string[];
  kpi: {
    totalCount: number;
    draft: number;
    active: number;
    archived: number;
    A_ECHOIR: number;
    TERME_ECHU: number;
  };
  paymentsByDay: { date: string; totalAmount: number }[];
  donutData: { name: string; value: number }[];
  COLORS: string[];
  showKpiFilters?: boolean;
}

export const KpiDashboard: React.FC<KpiDashboardProps> = ({
  kpiFilters,
  setKpiFilters,
  customerSearch,
  setCustomerSearch,
  showCustomerList,
  setShowCustomerList,
  customerOptions,
  showKpiFilters = true,
}) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("custom");

  // Fonction pour définir les dates selon la période prédéfinie
  const applyPeriodPreset = (preset: PeriodPreset) => {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now);

    switch (preset) {
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        to = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case "custom":
      default:
        // Ne pas modifier les dates si personnalisé
        return;
    }

    setKpiFilters((f) => ({
      ...f,
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    }));
  };

  const handlePeriodPresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      applyPeriodPreset(preset);
    }
  };

  // Détecter si les dates correspondent à une période prédéfinie
  const detectPeriodPreset = () => {
    if (!kpiFilters.from || !kpiFilters.to) return "custom";

    const now = new Date();
    const from = new Date(kpiFilters.from);
    const to = new Date(kpiFilters.to);

    // Vérifier si c'est le mois en cours
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    if (
      from.getTime() === monthStart.getTime() &&
      to.getTime() === monthEnd.getTime()
    ) {
      return "month";
    }

    // Vérifier si c'est le trimestre en cours
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
    if (
      from.getTime() === quarterStart.getTime() &&
      to.getTime() === quarterEnd.getTime()
    ) {
      return "quarter";
    }

    // Vérifier si c'est l'année en cours
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    if (
      from.getTime() === yearStart.getTime() &&
      to.getTime() === yearEnd.getTime()
    ) {
      return "year";
    }

    return "custom";
  };

  // Mettre à jour le preset détecté quand les dates changent
  useEffect(() => {
    const detected = detectPeriodPreset();
    if (detected !== periodPreset) {
      setPeriodPreset(detected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpiFilters.from, kpiFilters.to]);

  const filteredCustomers = customerOptions
    .filter((c) => c.toLowerCase().includes(customerSearch.toLowerCase()))
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
        const selected = filteredCustomers[highlightIndex];
        setCustomerSearch(selected);
        setKpiFilters((f) => ({ ...f, customer: selected }));
        setShowCustomerList(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowCustomerList(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div>
      {showKpiFilters && (
        <Card className="mb-4 animate-fadeIn">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Période prédéfinie */}
            <div className="flex flex-col">
              <FormControl size="small" fullWidth>
                <InputLabel>Période</InputLabel>
                <Select
                  value={periodPreset}
                  onChange={(e: SelectChangeEvent<PeriodPreset>) => 
                    handlePeriodPresetChange(e.target.value as PeriodPreset)
                  }
                  label="Période"
                  displayEmpty
                >
                  <MenuItem value="" disabled>Période</MenuItem>
                  <MenuItem value="month">Mois en cours</MenuItem>
                  <MenuItem value="quarter">Trimestre en cours</MenuItem>
                  <MenuItem value="year">Année en cours</MenuItem>
                  <MenuItem value="custom">Personnalisé</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Du */}
            <div className="flex flex-col">
              <TextField
                label="Du"
                type="date"
                variant="outlined"
                size="small"
                value={kpiFilters.from}
                onChange={(e) => {
                  setKpiFilters(f => ({ ...f, from: e.target.value }));
                  setPeriodPreset("custom");
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </div>

            {/* Au */}
            <div className="flex flex-col">
              <TextField
                label="Au"
                type="date"
                variant="outlined"
                size="small"
                value={kpiFilters.to}
                onChange={(e) => {
                  setKpiFilters(f => ({ ...f, to: e.target.value }));
                  setPeriodPreset("custom");
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </div>

            {/* Client */}
            <div className="flex flex-col" ref={inputRef}>
              <FormControl size="small" fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
               
                value={kpiFilters.customer || ""}
                onChange={(e) => {
                setKpiFilters((f) => ({ ...f, customer: e.target.value }));
                setCustomerSearch(e.target.value);
                }}
                onOpen={() => setShowCustomerList(true)}
                onClose={() => setShowCustomerList(false)}
                label="Client"
              >
                {customerOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
                ))}
              </Select>
              </FormControl>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};