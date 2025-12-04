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
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
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

/**
 * Renvoie la liste des périodes [pStart, pEnd] selon la nouvelle logique :
 * - Pour l'année n : calcul sur le reste de l'année (ex: 04/04/2025 -> 30/04/2025, puis 01/05/2025 -> 31/05/2025...)
 * - Pour l'année n+1 : calcul sur l'ensemble de l'année
 * - S'arrête à la date d'indexation si elle existe
 */
export function buildPeriods(
  start: Date,
  end: Date,
  freq: BillingFrequency,
  indexationDate?: Date | null
): Array<{ pStart: Date; pEnd: Date }> {
  const periods: Array<{ pStart: Date; pEnd: Date }> = [];
  let cursor = start;
  const endDate = indexationDate && isBefore(indexationDate, end) ? indexationDate : end;
  const startYear = cursor.getFullYear();
  let currentYear = startYear;
  let isFirstPeriod = true;

  while (!isAfter(cursor, endDate)) {
    let pStart = cursor;
    let pEnd: Date;

    if (freq === "MONTHLY") {
      // Pour la première période : du jour de début à la fin du mois
      // Pour les périodes suivantes : mois complets (du 1er au dernier jour du mois)
      if (isFirstPeriod) {
        // Première période : du jour de début à la fin du mois
        pEnd = endOfMonth(cursor);
        isFirstPeriod = false;
        // Passer au 1er du mois suivant
        cursor = startOfMonth(add(cursor, { months: 1 }));
      } else {
        // Mois complets : du 1er au dernier jour du mois
        pStart = startOfMonth(cursor);
        pEnd = endOfMonth(cursor);
        // Passer au 1er du mois suivant
        cursor = startOfMonth(add(cursor, { months: 1 }));
      }
    } else if (freq === "QUARTERLY") {
      // Pour les trimestres, on calcule par trimestre complet
      const quarterStart = new Date(cursor.getFullYear(), Math.floor(cursor.getMonth() / 3) * 3, 1);
      const quarterEnd = add(add(quarterStart, { months: 3 }), { days: -1 });
      
      if (isFirstPeriod) {
        // Première période : du jour de début à la fin du trimestre
        pStart = cursor;
        pEnd = quarterEnd;
        isFirstPeriod = false;
      } else {
        pStart = quarterStart;
        pEnd = quarterEnd;
      }
      cursor = add(quarterStart, { months: 3 });
    } else if (freq === "SEMIANNUAL") {
      // Semestres
      const semesterStart = new Date(cursor.getFullYear(), cursor.getMonth() < 6 ? 0 : 6, 1);
      const semesterEnd = add(add(semesterStart, { months: 6 }), { days: -1 });
      
      if (isFirstPeriod) {
        pStart = cursor;
        pEnd = semesterEnd;
        isFirstPeriod = false;
      } else {
        pStart = semesterStart;
        pEnd = semesterEnd;
      }
      cursor = add(semesterStart, { months: 6 });
    } else if (freq === "ANNUAL") {
      // Années complètes
      if (isFirstPeriod) {
        // Première année : du jour de début à la fin de l'année
        pStart = cursor;
        pEnd = endOfYear(cursor);
        isFirstPeriod = false;
        cursor = startOfYear(add(cursor, { years: 1 }));
      } else {
        // Années suivantes : année complète
        pStart = startOfYear(cursor);
        pEnd = endOfYear(cursor);
        cursor = startOfYear(add(cursor, { years: 1 }));
      }
    } else {
      // Fallback : comportement par défaut
      const next = nextDateByFrequency(cursor, freq);
      pEnd = add(next, { days: -1 });
      cursor = next;
    }

    // Clamp sur la fin de contrat ou date d'indexation
    if (isAfter(pEnd, endDate)) {
      pEnd = endDate;
    }

    if (!isAfter(pStart, endDate)) {
      periods.push({ pStart, pEnd });
    }

    // Vérifier si on a changé d'année
    if (cursor.getFullYear() > currentYear) {
      currentYear = cursor.getFullYear();
    }

    // Arrêt si on dépasse la date de fin
    if (isAfter(cursor, endDate)) {
      break;
    }
  }

  return periods;
}

/** Renvoie la liste des périodes [pStart, pEnd] !inclusives à l'échelle calendrier (ancienne version) */
export function buildPeriodsLegacy(start: Date, end: Date, freq: BillingFrequency) {
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

/**
 * US5.1: Calcul des montants en centimes (entiers)
 * Travaille en entiers pour éviter les erreurs de flottants
 * @param totalAmount Montant total (>= 0.00)
 * @param installmentsCount Nombre d'échéances (>= 1)
 * @returns Tableau de montants en centimes (entiers)
 */
export function splitAmountInCents(
  totalAmount: number,
  installmentsCount: number
): number[] {
  // Validation
  if (totalAmount < 0) {
    throw new Error("total_amount must be >= 0.00");
  }
  if (installmentsCount < 1) {
    throw new Error("installments_count must be >= 1");
  }

  // Conversion en centimes (arrondi arithmétique)
  const totalCents = Math.round(totalAmount * 100);

  // Division entière pour obtenir le montant de base par échéance
  const baseCents = Math.floor(totalCents / installmentsCount);

  // Générer un tableau de n valeurs initialisées à base
  // Note: on ne distribue pas les restes ici (US5.2 s'en charge)
  const amounts = new Array(installmentsCount).fill(baseCents);

  return amounts;
}

/**
 * US5.2: Ajuste le dernier montant pour compenser exactement l'écart dû aux arrondis
 * @param amounts Tableau de montants en centimes (résultat de US5.1)
 * @param totalAmount Montant total en euros
 * @param contractId ID du contrat (pour journalisation)
 * @returns Tableau de montants en centimes avec dernier montant ajusté
 */
export function adjustLastAmount(
  amounts: number[],
  totalAmount: number,
  contractId?: string
): number[] {
  if (amounts.length === 0) {
    return amounts;
  }

  const startTime = Date.now();
  const n = amounts.length;
  const totalCents = Math.round(totalAmount * 100);

  // Cas spécial : une seule échéance
  if (n === 1) {
    amounts[0] = totalCents;
    return amounts;
  }

  // Calculer la somme des (n-1) premières échéances
  const baseCents = amounts[0];
  const sumPrev = baseCents * (n - 1);

  // Le dernier montant = total - somme des précédents
  const lastCents = totalCents - sumPrev;

  // Contrôle : last doit être >= 0
  if (lastCents < 0) {
    throw new Error(
      `Incohérence détectée: last_amount (${lastCents} centimes) < 0. ` +
      `total_cents=${totalCents}, base_cents=${baseCents}, n=${n}`
    );
  }

  // Ajuster le dernier montant
  amounts[n - 1] = lastCents;

  // Journalisation INFO
  const durationMs = Date.now() - startTime;
  if (contractId) {
    console.log(
      `[INFO] US5.2 adjustment - contract_id=${contractId}, n=${n}, ` +
      `total_cents=${totalCents}, base_cents=${baseCents}, ` +
      `last_cents=${lastCents}, duration_ms=${durationMs}`
    );
  }

  // Journalisation WARN si last >> base (écart significatif)
  const diff = Math.abs(lastCents - baseCents);
  const threshold = baseCents * 0.1; // 10% de différence
  if (diff > threshold && baseCents > 0) {
    console.warn(
      `[WARN] US5.2 - Écart significatif détecté: ` +
      `last_cents=${lastCents}, base_cents=${baseCents}, ` +
      `diff=${diff} centimes (${((diff / baseCents) * 100).toFixed(1)}%)`
    );
  }

  return amounts;
}

/**
 * US5.1 + US5.2 : Calcul complet avec ajustement du dernier montant
 * @param totalAmount Montant total (>= 0.00)
 * @param installmentsCount Nombre d'échéances (>= 1)
 * @param contractId ID du contrat (optionnel, pour journalisation)
 * @returns Tableau de montants en centimes (entiers) avec dernier ajusté
 */
export function splitAmountInCentsWithAdjustment(
  totalAmount: number,
  installmentsCount: number,
  contractId?: string
): number[] {
  // US5.1 : Calcul des montants de base
  const amounts = splitAmountInCents(totalAmount, installmentsCount);

  // US5.2 : Ajustement du dernier montant
  return adjustLastAmount(amounts, totalAmount, contractId);
}

/**
 * Convertit un montant en centimes vers un montant en euros (2 décimales)
 */
export function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
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

/**
 * Calcule les montants basés sur les jours réels de chaque période
 * Utilise la logique US5.1 (travail en centimes) puis convertit en euros
 * @param totalAmount Montant total du contrat
 * @param periods Périodes calculées avec buildPeriods
 * @param useEqualDistribution Si true, utilise US5.1+US5.2 pour répartition égale (quand périodes complètes)
 * @param contractId ID du contrat (pour journalisation US5.2)
 * @returns Tableau de montants en euros (2 décimales)
 */
export function calculateAmountsByPeriodDays(
  totalAmount: number,
  periods: Array<{ pStart: Date; pEnd: Date }>,
  useEqualDistribution: boolean = false,
  contractId?: string
): number[] {
  if (periods.length === 0) {
    return [];
  }

  // Si useEqualDistribution est true, utiliser US5.1+US5.2 pour répartition égale
  if (useEqualDistribution) {
    const amountsInCents = splitAmountInCentsWithAdjustment(
      totalAmount,
      periods.length,
      contractId
    );
    return amountsInCents.map((cents) => cents / 100);
  }

  // Sinon, calculer proportionnellement aux jours réels
  const daysPerPeriod = periods.map(({ pStart, pEnd }) => 
    differenceInCalendarDays(pEnd, pStart) + 1
  );

  // Calculer le total de jours
  const totalDays = daysPerPeriod.reduce((sum, days) => sum + days, 0);
  
  if (totalDays === 0) {
    throw new Error("Total days cannot be zero");
  }

  // Calculer les ratios basés sur les jours
  const ratios = daysPerPeriod.map((days) => days / totalDays);

  // Utiliser splitAmountWithRounding pour répartir le montant total
  const amounts = splitAmountWithRounding(totalAmount, ratios);

  return amounts;
}

/**
 * Détecte si toutes les périodes ont le même nombre de jours (périodes complètes)
 * @param periods Périodes à analyser
 * @returns true si toutes les périodes ont le même nombre de jours
 */
export function arePeriodsEqual(periods: Array<{ pStart: Date; pEnd: Date }>): boolean {
  if (periods.length <= 1) {
    return true;
  }

  const daysPerPeriod = periods.map(({ pStart, pEnd }) => 
    differenceInCalendarDays(pEnd, pStart) + 1
  );

  const firstDays = daysPerPeriod[0];
  return daysPerPeriod.every((days) => days === firstDays);
}

/** Due date selon type de facturation */
export function dueDateForPeriod(pStart: Date, pEnd: Date, type: BillingType) {
  return type === "A_ECHOIR" ? pStart : pEnd;
}
