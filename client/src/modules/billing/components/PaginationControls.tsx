import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  limit: number;
  offset: number;
  total: number;
  onChange: (newLimit: number, newOffset: number) => void;
}

const PAGE_LIMITS = [5, 10, 25, 50, 100];

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  limit,
  offset,
  total,
  onChange,
}) => {
  const handleLimitChange = (newLimit: number) => {
    onChange(newLimit, 0);
  };

  const handlePrev = () => {
    onChange(limit, Math.max(offset - limit, 0));
  };

  const handleNext = () => {
    onChange(limit, offset + limit);
  };

  const start = offset + 1;
  const end = Math.min(offset + limit, total);

  return (
    <div className="flex flex-col md:flex-row items-center justify-end gap-2 mt-1 p-1 bg-gray-50 rounded text-sm">

      {/* Sélecteur du nombre de lignes */}
      <div className="flex items-center gap-1">
        <label className="text-gray-600">Afficher :</label>
        <select
          className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={limit}
          onChange={(e) => handleLimitChange(parseInt(e.target.value, 10))}
        >
          {PAGE_LIMITS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={offset === 0}
          title="Page précédente"
          className="p-1 h-7 w-7"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </Button>

        <span className="px-1 text-gray-700">
          {start} – {end} sur {total}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={offset + limit >= total}
          title="Page suivante"
          className="p-1 h-7 w-7"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
    </div>
  );
};
