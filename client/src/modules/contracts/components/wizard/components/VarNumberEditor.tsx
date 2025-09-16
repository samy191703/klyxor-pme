import { useId, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type VariableNumberInput =
  | { mode: "FIXED"; fixed?: number | null }
  | {
      mode: "VARIABLE";
      items?: Array<{ startingFrom: string; value: number }>;
    };

type Props = {
  label: string;
  value: VariableNumberInput | undefined;
  onChange: (v: VariableNumberInput) => void;
  effectiveDate?: string; // "YYYY-MM-DD"
  currency?: string;
  placeholder?: string;
  showCurrency?: boolean;
};

export default function VarNumberEditor({
  label,
  value,
  onChange,
  effectiveDate,
  currency,
  placeholder = "0.00",
  showCurrency = false,
}: Props) {
  // --- helpers ---
  const idBase = useId();

  const normalizeItems = (
    items: Array<{ startingFrom: string; value: number }> = []
  ) => {
    const dict: Record<string, number> = {};
    const empties: Array<{ startingFrom: string; value: number }> = [];

    for (const it of items) {
      const iso = toISO(it?.startingFrom);
      const val = Number(it?.value);
      const v = Number.isFinite(val) ? val : 0;
      if (iso) {
        dict[iso] = v; // last one wins
      } else {
        empties.push({ startingFrom: "", value: v }); // keep placeholders
      }
    }

    const out = [
      ...Object.keys(dict).map((startingFrom) => ({
        startingFrom,
        value: dict[startingFrom],
      })),
      ...empties,
    ];

    // valid dates first, empties last
    out.sort((a, b) => {
      const ai = toISO(a.startingFrom);
      const bi = toISO(b.startingFrom);
      if (!ai && !bi) return 0;
      if (!ai) return 1;
      if (!bi) return -1;
      return ai.localeCompare(bi);
    });

    return out;
  };

  // keep empties in UI; sort valid dates asc
  const items = useMemo(() => {
    const raw: Array<{ startingFrom: string; value: number }> = Array.isArray(
      (value as any)?.items
    )
      ? [...(value as any).items]
      : [];
    return raw.sort((a, b) => {
      const ai = toISO(a?.startingFrom);
      const bi = toISO(b?.startingFrom);
      if (!ai && !bi) return 0;
      if (!ai) return 1;
      if (!bi) return -1;
      return ai.localeCompare(bi);
    });
  }, [value]);

  const mode = (value?.mode as any) || "FIXED";

  const effective = useMemo(() => {
    if (!effectiveDate || !value) return undefined;

    if (mode === "FIXED") {
      const n =
        (value as any).fixed != null ? Number((value as any).fixed) : undefined;
      return Number.isFinite(n as any) ? (n as number) : undefined;
    }

    // VARIABLE: last valid <= effectiveDate
    const isoDate = toISO(effectiveDate);
    if (!isoDate || items.length === 0) return undefined;

    let eff: number | undefined = undefined;
    for (const it of items) {
      const iso = toISO(it.startingFrom);
      if (!iso) continue; // skip empties
      if (iso <= isoDate) eff = Number(it.value);
      else break;
    }
    return eff;
  }, [value, items, mode, effectiveDate]);

  const fmtMoney = (n?: number) =>
    typeof n === "number"
      ? new Intl.NumberFormat("fr-FR", {
          style: showCurrency ? "currency" : "decimal",
          currency: currency || "EUR",
          maximumFractionDigits: 2,
        }).format(n)
      : "—";

  // --- UI ---
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Mode radio group */}
      <RadioGroup
        className="flex items-center gap-6"
        value={mode}
        onValueChange={(m) =>
          onChange(
            m === "FIXED"
              ? { mode: "FIXED", fixed: (value as any)?.fixed ?? null }
              : {
                  mode: "VARIABLE",
                  items: items.length
                    ? items
                    : [{ startingFrom: "", value: 0 }],
                }
          )
        }
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem id={`${idBase}-fixed`} value="FIXED" />
          <Label htmlFor={`${idBase}-fixed`} className="cursor-pointer">
            Fixe
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem id={`${idBase}-variable`} value="VARIABLE" />
          <Label htmlFor={`${idBase}-variable`} className="cursor-pointer">
            Variable (par date)
          </Label>
        </div>
      </RadioGroup>

      {/* Fixed value */}
      {mode === "FIXED" && (
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            step="0.01"
            placeholder={placeholder}
            value={(value as any)?.fixed ?? ""}
            onChange={(e) =>
              onChange({ mode: "FIXED", fixed: Number(e.target.value) })
            }
          />
          <span className="text-xs text-gray-500">
            Valeur utilisée au {effectiveDate || "—"} :{" "}
            <b>{fmtMoney(effective)}</b>
          </span>
        </div>
      )}

      {/* Variable entries */}
      {mode === "VARIABLE" && (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div
              key={`${idx}-${it.startingFrom || "empty"}`}
              className="grid grid-cols-12 gap-2 items-center"
            >
              <div className="col-span-5">
                <Input
                  type="date"
                  value={it.startingFrom}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], startingFrom: e.target.value };
                    onChange({ mode: "VARIABLE", items: normalizeItems(next) });
                  }}
                />
              </div>
              <div className="col-span-5">
                <Input
                  type="number"
                  step="0.01"
                  placeholder={placeholder}
                  value={String(it.value ?? "")}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], value: Number(e.target.value) };
                    onChange({ mode: "VARIABLE", items: normalizeItems(next) });
                  }}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = items.filter((_, i) => i !== idx);
                    onChange({ mode: "VARIABLE", items: normalizeItems(next) });
                  }}
                  title="Supprimer la ligne"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onChange({
                  mode: "VARIABLE",
                  items: [
                    ...items,
                    { startingFrom: "", value: 0 } as {
                      startingFrom: string;
                      value: number;
                    },
                  ],
                })
              }
            >
              Ajouter une ligne
            </Button>
            <div className="text-xs text-gray-500">
              Valeur utilisée au {effectiveDate || "—"} :{" "}
              <b>{fmtMoney(effective)}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Local util */
function toISO(input?: string | null): string | null {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const m = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  return null;
}
