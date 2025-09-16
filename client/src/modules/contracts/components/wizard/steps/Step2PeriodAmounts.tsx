// components/wizard/steps/Step2PeriodAmounts.tsx
import { useMemo } from "react";
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
  BILLING_PERIODS,
  PAYMENT_TYPES,
} from "@/modules/contracts/domain/constants";

type Props = { data: any; setData: (upd: any) => void };

export default function Step2PeriodAmounts({ data, setData }: Props) {
  // total = fixe + variable (affichage)
  const total = useMemo(() => {
    const fixed =
      parseFloat((data.fixedAmount ?? "").toString().replace(",", ".")) || 0;
    const variable =
      parseFloat((data.variableAmount ?? "").toString().replace(",", ".")) || 0;
    return fixed + variable;
  }, [data.fixedAmount, data.variableAmount]);

  // Contraintes de dates (min pour la fin)
  const minEnd = data.startDate || undefined;

  // Certains types demandent des champs énergie (voir mapping backend)
  const isEnergy =
    data?.type === "electricity" || data?.type === "renewable_ppa";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Étape 2 — Période & montants</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* DATES */}
        <div className="w-full">
          <Label>Date début *</Label>
          <Input
            type="date"
            value={data.startDate || ""}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
          />
        </div>

        <div className="w-full">
          <Label>Date fin *</Label>
          <Input
            type="date"
            min={minEnd}
            value={data.endDate || ""}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Doit être postérieure à la date de début
          </p>
        </div>

        {/* MONTANTS */}
        <div className="w-full">
          <Label>Montant fixe</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={data.fixedAmount ?? ""}
            onChange={(e) => setData({ ...data, fixedAmount: e.target.value })}
          />
        </div>

        <div className="w-full">
          <Label>Montant variable</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={data.variableAmount ?? ""}
            onChange={(e) =>
              setData({ ...data, variableAmount: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 mt-1">Optionnel, 0 accepté</p>
        </div>

        {/* PÉRIODICITÉ / PAIEMENT */}
        <div className="w-full">
          <Label>Périodicité de facturation</Label>
          <Select
            value={data.billingPeriod || data.billingFrequency || ""}
            onValueChange={(value) =>
              setData({
                ...data,
                billingPeriod: value, // utilisé par le mapper backend
                billingFrequency: value, // compat si d'autres écrans lisent ce champ
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {BILLING_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full">
          <Label>Type de paiement</Label>
          <Select
            value={data.paymentType || ""}
            onValueChange={(value) => setData({ ...data, paymentType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(PAYMENT_TYPES).map((pt) => (
                <SelectItem key={pt} value={pt}>
                  {pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CHAMPS MÉTIER ÉNERGIE (si Électricité / PPA) */}
        {isEnergy && (
          <>
            <div className="w-full">
              <Label>Production annuelle max (MWh)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="ex: 120000"
                value={data.maxAnnualProduction ?? ""}
                onChange={(e) =>
                  setData({ ...data, maxAnnualProduction: e.target.value })
                }
              />
            </div>

            <div className="w-full">
              <Label>Nombre d’éoliennes</Label>
              <Input
                type="number"
                placeholder="ex: 10"
                value={data.numberOfTurbines ?? ""}
                onChange={(e) =>
                  setData({ ...data, numberOfTurbines: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Prix par MWh</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="ex: 52.90"
                value={data.pricePerMWh ?? ""}
                onChange={(e) =>
                  setData({ ...data, pricePerMWh: e.target.value })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisé pour les calculs PPA / électricité
              </p>
            </div>
          </>
        )}
      </div>

      {/* APERÇU TOTAL */}
      <div className="mt-2 p-3 rounded bg-gray-50 text-sm">
        <strong>Total estimé&nbsp;:</strong>{" "}
        {new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: data.currency || "EUR",
        }).format(total)}
        <span className="text-gray-500"> (fixe + variable)</span>
      </div>
    </div>
  );
}
