// components/KpiDashboard.tsx
import { Card, CardContent } from "@mui/material";
import { User } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

// Définir un type pour les filtres KPI
interface KpiFilters {
  from: string;
  to: string;
  customer: string;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

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
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* Du */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Du</label>
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={kpiFilters.from}
                onChange={(e) =>
                  setKpiFilters(f => ({ ...f, from: e.target.value }))
                }
              />
            </div>

            {/* Au */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Au</label>
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={kpiFilters.to}
                onChange={(e) =>
                  setKpiFilters(f => ({ ...f, to: e.target.value }))
                }
              />
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
                  value={kpiFilters.customer || ""}
                  onChange={(e) => {
                    setKpiFilters((f) => ({ ...f, customer: e.target.value }));
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
                          setKpiFilters((f) => ({ ...f, customer: c }));
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
