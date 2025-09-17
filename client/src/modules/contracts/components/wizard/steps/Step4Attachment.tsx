// Step4Attachment.tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Upload, X, FileText } from "lucide-react";

type Props = {
  data: any;
  setData: (upd: any) => void;
  contractId?: string | number;
};

export default function Step4Attachment({ data, setData, contractId }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Étape 4 — Pièce jointe (optionnelle)
      </h2>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Infos :</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Vous pouvez ajouter un fichier si nécessaire</li>
            <li>• Une PJ n’est pas requise pour créer le contrat</li>
            <li>• Suppression possible avant validation</li>
            <li>• Horodatage + auteur enregistrés</li>
          </ul>
        </AlertDescription>
      </Alert>

      {!data.attachment ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Glisser-déposer un fichier ici ou
          </p>
          <Button variant="outline">Parcourir</Button>
          <p className="text-xs text-gray-500 mt-2">
            Formats autorisés : PDF, DOCX, XLSX, ODT, JPG, PNG
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{data.attachment.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData({ ...data, attachment: null })}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
