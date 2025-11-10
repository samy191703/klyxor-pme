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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { WizardMode } from "../ContractWizard";
import {
  BILLING_PERIODS,
  PAYMENT_TYPE_VALUES,
  PAYMENT_TYPE_LABELS,
  PaymentTypes,
  TVA_RATE_VALUES,
} from "@shared/enums/contracts";
import {
  BillingType,
  BILLING_TYPE_VALUES,
  BILLING_TYPE_LABELS,
} from "@shared/enums/billing.enum";

type Props = {
  data: any;
  setData: (upd: any) => void;
  contractId?: string | number;
  mode?: WizardMode;
  showNextStep?: boolean;
};

const toNum = (v: any) =>
  Number.isFinite(v)
    ? Number(v)
    : parseFloat(String(v ?? "").replace(",", "."));

export default function Step2PeriodAmounts({
  data,
  setData,
  mode = "create",
}: Props) {
  const showStepPrefix = mode !== "edit";
  const title = showStepPrefix
    ? "Étape 2 — Période & montants"
    : "Période & montants";
  const fixed = toNum(data.fixedAmount) || 0;
  const variable = toNum(data.variableAmount) || 0;

  const total = useMemo(() => fixed + variable, [fixed, variable]);

  const minEnd = data.startDate || undefined;
  const isEnergy =
    data?.type === "electricity" || data?.type === "renewable_ppa";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>

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
            disabled={!data.startDate}
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
            min={0}
            placeholder="0.00"
            value={data.fixedAmount ?? ""}
            onChange={(e) =>
              setData({
                ...data,
                fixedAmount: e.target.value.replace(",", "."),
              })
            }
          />
        </div>

        {/* tvaRate */}
        <div className="w-full">
          <Label>Taux TVA</Label>
          <Select
            value={String(data.tvaRate ?? "")}
            onValueChange={(value) =>
              setData({
                ...data,
                tvaRate: value ? parseFloat(value) : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {TVA_RATE_VALUES.map((p) => (
                <SelectItem key={String(p.value)} value={String(p.value)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full">
          <Label>Montant variable</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            value={data.variableAmount ?? ""}
            onChange={(e) =>
              setData({
                ...data,
                variableAmount: e.target.value.replace(",", "."),
              })
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
                billingPeriod: value,
                billingFrequency: value, // compat
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
              {PAYMENT_TYPE_VALUES.map((pt: PaymentTypes) => (
                <SelectItem key={pt} value={pt}>
                  {PAYMENT_TYPE_LABELS[pt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* BILLING TYPE (RADIO) */}
        <div className="col-span-2">
          <Label>Type de facturation</Label>
          <div className="mt-2">
            <RadioGroup
              className="grid grid-cols-2 gap-3"
              value={data.billingType || ""}
              onValueChange={(value: BillingType) =>
                setData({ ...data, billingType: value })
              }
            >
              {BILLING_TYPE_VALUES.map((bt) => (
                <div
                  key={bt}
                  className="flex items-center space-x-2 rounded-md border p-3"
                >
                  <RadioGroupItem id={`bt-${bt}`} value={bt} />
                  <Label htmlFor={`bt-${bt}`} className="cursor-pointer">
                    {BILLING_TYPE_LABELS[bt]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            « À échoir » : facturation avant l’échéance; « Terme échu » :
            facturation après la période.
          </p>
        </div>

        {/* CHAMPS ÉNERGIE */}
        {isEnergy && (
          <>
            <div className="w-full">
              <Label>Production annuelle max (MWh)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="ex: 120000"
                value={data.maxAnnualProduction ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    maxAnnualProduction: e.target.value.replace(",", "."),
                  })
                }
              />
            </div>

            <div className="w-full">
              <Label>Nombre d’éoliennes</Label>
              <Input
                type="number"
                min={0}
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
                min={0}
                placeholder="ex: 52.90"
                value={data.pricePerMWh ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    pricePerMWh: e.target.value.replace(",", "."),
                  })
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
