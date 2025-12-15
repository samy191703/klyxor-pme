// server/domain/billing/utils.ts
import {
  add,
  lastDayOfMonth,
  isSameDay,
  isLastDayOfMonth,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";
import { BillingFrequency, BillingType } from "@shared/enums/billing.enum";

/** Ajoute n mois avec clamp fin-de-mois (31 jan +1m => 28/29 fév) */
export function addMonthsClamped(d: Date, months: number): Date {
  const target = add(d, { months });
  if (isLastDayOfMonth(d)) return lastDayOfMonth(target);
  // Sinon, si le jour n'existe pas (ex 30->février), lastDayOfMonth suffit déjà via date-fns.
  return target;
}

/** Incrémente selon fréquence */
export function nextDateByFrequency(d: Date, freq: BillingFrequency): Date {
  const delta = freq === "MONTHLY" ? 1 : freq === "QUARTERLY" ? 3 : 12;
  return addMonthsClamped(d, delta);
}

/** Renvoie la liste des périodes [pStart, pEnd] !inclusives à l’échelle calendrier */
export function buildPeriods(start: Date, end: Date, freq: BillingFrequency) {
  const periods: Array<{ pStart: Date; pEnd: Date }> = [];
  let cursor = start;
  while (!isAfter(cursor, end)) {
    const next = nextDateByFrequency(cursor, freq);
    const pStart = cursor;
    const pEnd = add(next, { days: -1 }); // période fermée [pStart, pEnd]
    if (isAfter(pStart, end)) break;
    periods.push({ pStart, pEnd: isAfter(pEnd, end) ? end : pEnd });
    cursor = next;
  }
  return periods;
}

/** Jours effectifs/total pour prorata temporis d’une période tronquée */
export function prorataForPeriod(
  pStart: Date,
  pEnd: Date,
  fullStart: Date,
  fullEnd: Date
) {
  const daysEffective = differenceInCalendarDays(pEnd, pStart) + 1;
  const daysTotal = differenceInCalendarDays(fullEnd, fullStart) + 1;
  return { daysEffective, daysTotal, ratio: daysEffective / daysTotal };
}

/** Montants : répartit, arrondit à 2 déc, et ajuste la dernière ligne pour somme = montant total */
export function splitAmountWithRounding(
  total: number,
  ratios: number[]
): number[] {
  const raw = ratios.map((r) => total * r);
  const rounded = raw.map((x) => Math.round(x * 100) / 100);
  const diff =
    Math.round((total - rounded.reduce((a, b) => a + b, 0)) * 100) / 100;
  // Ajuste sur la dernière ligne
  rounded[rounded.length - 1] =
    Math.round((rounded[rounded.length - 1] + diff) * 100) / 100;
  return rounded;
}

/** Due date selon type de facturation */
export function dueDateForPeriod(pStart: Date, pEnd: Date, type: BillingType) {
  return type === "A_ECHOIR" ? pStart : pEnd;
}
