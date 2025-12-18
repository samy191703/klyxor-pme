import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="p-6">
      <div className="text-lg font-semibold">Page introuvable</div>
      <div className="text-sm text-slate-600">
        La route demandée n’existe pas.
      </div>
    </div>
  );
}

