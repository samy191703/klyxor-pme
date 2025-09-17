// components/wizard/steps/Step1General.tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTRACT_TYPES,
  BUSINESS_UNITS,
  TECHNOLOGIES,
  contractTypeDefinitions,
} from "@/modules/contracts/domain/constants";

type Props = {
  data: any;
  setData: (upd: any) => void;
  contractId?: string | number;
};

export default function Step1General({ data, setData, contractId }: Props) {
  const selectedType = contractTypeDefinitions.find(
    (t) => t.value === data.type
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Étape 1 — Informations générales
      </h2>

      {/* Bloc principal */}
      <div className="grid grid-cols-2 gap-4">
        <div className="w-full">
          <Label>N° contrat *</Label>
          <Input
            placeholder="CT-2025-XXXX"
            value={data.number || ""}
            onChange={(e) => setData({ ...data, number: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Masque + unicité contrôlée
          </p>
        </div>

        <div className="w-full">
          <Label>Titre/SPV *</Label>
          <Input
            placeholder="Titre du contrat"
            value={data.title || ""}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </div>

        <div className="w-full">
          <Label>Nom du client *</Label>
          <Input
            placeholder="Nom du client"
            value={data.clientName || ""}
            onChange={(e) => setData({ ...data, clientName: e.target.value })}
          />
        </div>

        <div className="w-full">
          <Label>Type *</Label>
          <Select
            value={data.type || ""}
            onValueChange={(value) => setData({ ...data, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {contractTypeDefinitions.find((ct) => ct.value === t)
                    ?.label ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full">
          <Label>BU/Entité *</Label>
          <Select
            value={data.businessUnit || ""}
            onValueChange={(value) => setData({ ...data, businessUnit: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_UNITS.map((bu) => (
                <SelectItem key={bu} value={bu}>
                  {bu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Devise */}
        <div className="w-full">
          <Label>Devise *</Label>
          <Select
            value={data.currency || "EUR"}
            onValueChange={(value) => setData({ ...data, currency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Langue */}
        <div className="w-full">
          <Label>Langue *</Label>
          <Select
            value={data.language || "FR"}
            onValueChange={(value) => setData({ ...data, language: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FR">FR</SelectItem>
              <SelectItem value="EN">EN</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Champs conditionnels selon le type */}
      {data.type && (
        <>
          {selectedType?.hasTechnology && (
            <div className="mt-2 w-full">
              <Label>Technologie *</Label>
              <Select
                value={data.technology || ""}
                onValueChange={(value) =>
                  setData({ ...data, technology: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {TECHNOLOGIES.map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedType?.hasMaintainer && (
            <div className="mt-2 w-full">
              <Label>Mainteneur</Label>
              <Input
                placeholder="Nom du mainteneur"
                value={data.maintainer || ""}
                onChange={(e) =>
                  setData({ ...data, maintainer: e.target.value })
                }
              />
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-500 mt-2">
        La formule d’indexation se choisit désormais à l’étape 3.
      </p>
    </div>
  );
}
