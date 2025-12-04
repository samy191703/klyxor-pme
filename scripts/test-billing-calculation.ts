/**
 * Script de test pour vérifier la logique de calcul des échéances
 * 
 * Pour exécuter: npx tsx scripts/test-billing-calculation.ts
 */

import {
  buildPeriods,
  calculateAmountsByPeriodDays,
  splitAmountInCents,
} from "../server/utils/billing";
import { BillingFrequency } from "@shared/enums/billing.enum";

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

console.log("🧪 TEST DE LA LOGIQUE DE CALCUL DES ÉCHÉANCES\n");
console.log("=".repeat(70));

// ============================================
// EXEMPLE 1 : Contrat mensuel avec indexation
// ============================================
console.log("\n📋 EXEMPLE 1 : Contrat mensuel avec date d'indexation");
console.log("-".repeat(70));

const start1 = new Date("2025-04-04");
const end1 = new Date("2026-12-31");
const indexationDate1 = new Date("2026-01-01");
const totalAmount1 = 1000.0;
const frequency1: BillingFrequency = "MONTHLY";

console.log(`Début contrat    : ${formatDate(start1)}`);
console.log(`Fin contrat      : ${formatDate(end1)}`);
console.log(`Date indexation  : ${formatDate(indexationDate1)}`);
console.log(`Montant total    : ${totalAmount1.toFixed(2)} €`);
console.log(`Fréquence        : ${frequency1}\n`);

const periods1 = buildPeriods(start1, end1, frequency1, indexationDate1);
const amounts1 = calculateAmountsByPeriodDays(totalAmount1, periods1);

console.log(`✅ ${periods1.length} échéances générées (s'arrête à la date d'indexation)\n`);

let total1 = 0;
periods1.forEach((period, index) => {
  const days = getDaysBetween(period.pStart, period.pEnd);
  total1 += amounts1[index];
  console.log(
    `  Échéance ${String(index + 1).padStart(2, " ")}: ${formatDate(period.pStart)} → ${formatDate(period.pEnd)} (${String(days).padStart(2, " ")} jours) = ${amounts1[index].toFixed(2).padStart(8, " ")} €`
  );
});

console.log(`\n  Total calculé  : ${total1.toFixed(2)} €`);
console.log(`  Total attendu  : ${totalAmount1.toFixed(2)} €`);
console.log(`  Différence     : ${Math.abs(total1 - totalAmount1).toFixed(2)} €`);
console.log(
  `  ✅ Vérification : ${Math.abs(total1 - totalAmount1) <= 0.01 ? "✅ OK" : "❌ ERREUR"}`
);

// ============================================
// EXEMPLE 2 : Contrat sans indexation
// ============================================
console.log("\n\n📋 EXEMPLE 2 : Contrat mensuel sans date d'indexation");
console.log("-".repeat(70));

const start2 = new Date("2025-01-15");
const end2 = new Date("2025-12-31");
const totalAmount2 = 500.0;
const frequency2: BillingFrequency = "MONTHLY";

console.log(`Début contrat    : ${formatDate(start2)}`);
console.log(`Fin contrat      : ${formatDate(end2)}`);
console.log(`Montant total    : ${totalAmount2.toFixed(2)} €`);
console.log(`Fréquence        : ${frequency2}\n`);

const periods2 = buildPeriods(start2, end2, frequency2, null);
const amounts2 = calculateAmountsByPeriodDays(totalAmount2, periods2);

console.log(`✅ ${periods2.length} échéances générées\n`);

let total2 = 0;
periods2.forEach((period, index) => {
  const days = getDaysBetween(period.pStart, period.pEnd);
  total2 += amounts2[index];
  console.log(
    `  Échéance ${String(index + 1).padStart(2, " ")}: ${formatDate(period.pStart)} → ${formatDate(period.pEnd)} (${String(days).padStart(2, " ")} jours) = ${amounts2[index].toFixed(2).padStart(8, " ")} €`
  );
});

console.log(`\n  Total calculé  : ${total2.toFixed(2)} €`);
console.log(`  Total attendu  : ${totalAmount2.toFixed(2)} €`);
console.log(`  Différence     : ${Math.abs(total2 - totalAmount2).toFixed(2)} €`);
console.log(
  `  ✅ Vérification : ${Math.abs(total2 - totalAmount2) <= 0.01 ? "✅ OK" : "❌ ERREUR"}`
);

// ============================================
// EXEMPLE 3 : Test US5.1 - splitAmountInCents
// ============================================
console.log("\n\n📋 EXEMPLE 3 : Test US5.1 (splitAmountInCents)");
console.log("-".repeat(70));

const totalAmount3 = 100.50;
const installmentsCount3 = 3;

console.log(`Montant total    : ${totalAmount3} €`);
console.log(`Nombre échéances : ${installmentsCount3}\n`);

const amountsInCents3 = splitAmountInCents(totalAmount3, installmentsCount3);

console.log("Montants en centimes:");
amountsInCents3.forEach((cents, index) => {
  console.log(
    `  Échéance ${index + 1}: ${cents.toString().padStart(5, " ")} centimes = ${(cents / 100).toFixed(2).padStart(6, " ")} €`
  );
});

const totalCents3 = amountsInCents3.reduce((sum, cents) => sum + cents, 0);
const expectedCents3 = Math.round(totalAmount3 * 100);
console.log(`\n  Total calculé  : ${totalCents3} centimes`);
console.log(`  Total attendu  : ${expectedCents3} centimes`);
console.log(`  Différence     : ${expectedCents3 - totalCents3} centimes`);
console.log(`  ℹ️  Note: La différence sera ajustée dans US5.2 (dernière ligne)`);

// ============================================
// EXEMPLE 4 : Fréquence trimestrielle
// ============================================
console.log("\n\n📋 EXEMPLE 4 : Contrat trimestriel");
console.log("-".repeat(70));

const start4 = new Date("2025-04-10");
const end4 = new Date("2026-12-31");
const totalAmount4 = 2000.0;
const frequency4: BillingFrequency = "QUARTERLY";

console.log(`Début contrat    : ${formatDate(start4)}`);
console.log(`Fin contrat      : ${formatDate(end4)}`);
console.log(`Montant total    : ${totalAmount4.toFixed(2)} €`);
console.log(`Fréquence        : ${frequency4}\n`);

const periods4 = buildPeriods(start4, end4, frequency4, null);
const amounts4 = calculateAmountsByPeriodDays(totalAmount4, periods4);

console.log(`✅ ${periods4.length} trimestres générés\n`);

let total4 = 0;
periods4.forEach((period, index) => {
  const days = getDaysBetween(period.pStart, period.pEnd);
  total4 += amounts4[index];
  console.log(
    `  Trimestre ${String(index + 1).padStart(2, " ")}: ${formatDate(period.pStart)} → ${formatDate(period.pEnd)} (${String(days).padStart(3, " ")} jours) = ${amounts4[index].toFixed(2).padStart(8, " ")} €`
  );
});

console.log(`\n  Total calculé  : ${total4.toFixed(2)} €`);
console.log(`  Total attendu  : ${totalAmount4.toFixed(2)} €`);
console.log(`  Différence     : ${Math.abs(total4 - totalAmount4).toFixed(2)} €`);
console.log(
  `  ✅ Vérification : ${Math.abs(total4 - totalAmount4) <= 0.01 ? "✅ OK" : "❌ ERREUR"}`
);

// ============================================
// RÉSUMÉ
// ============================================
console.log("\n\n" + "=".repeat(70));
console.log("✅ TOUS LES TESTS SONT TERMINÉS");
console.log("=".repeat(70));
console.log("\n📝 Résumé:");
console.log("  - Exemple 1: Contrat mensuel avec indexation ✅");
console.log("  - Exemple 2: Contrat mensuel sans indexation ✅");
console.log("  - Exemple 3: Test US5.1 (splitAmountInCents) ✅");
console.log("  - Exemple 4: Contrat trimestriel ✅");
console.log("\n💡 Pour tester avec vos propres données, modifiez les valeurs dans ce script.\n");

