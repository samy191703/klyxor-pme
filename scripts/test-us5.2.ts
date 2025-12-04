/**
 * Test US5.2 - Ajustement du dernier montant
 * 
 * Pour exécuter: npx tsx scripts/test-us5.2.ts
 */

import {
  splitAmountInCents,
  adjustLastAmount,
  splitAmountInCentsWithAdjustment,
  buildPeriods,
  calculateAmountsByPeriodDays,
} from "../server/utils/billing";
import { BillingFrequency } from "@shared/enums/billing.enum";

function formatCents(cents: number): string {
  return `${cents} centimes (${(cents / 100).toFixed(2)} €)`;
}

console.log("🧪 TEST US5.2 - Ajustement du dernier montant\n");
console.log("=".repeat(70));

// ============================================
// Test 1 : Exemple de référence 100,00 € / 3
// ============================================
console.log("\n📋 Test 1 : 100,00 € / 3 échéances");
console.log("-".repeat(70));

const total1 = 100.0;
const n1 = 3;

const amounts1 = splitAmountInCents(total1, n1);
console.log("Après US5.1 (base):");
amounts1.forEach((amt, i) => {
  console.log(`  Échéance ${i + 1}: ${formatCents(amt)}`);
});

const adjusted1 = adjustLastAmount([...amounts1], total1);
console.log("\nAprès US5.2 (ajustement):");
adjusted1.forEach((amt, i) => {
  console.log(`  Échéance ${i + 1}: ${formatCents(amt)}`);
});

const totalCalculated1 = adjusted1.reduce((sum, amt) => sum + amt, 0);
const expected1 = Math.round(total1 * 100);
console.log(`\n  Total calculé: ${totalCalculated1} centimes`);
console.log(`  Total attendu : ${expected1} centimes`);
console.log(`  ✅ Vérification: ${totalCalculated1 === expected1 ? "OK" : "ERREUR"}`);
console.log(`  Résultat attendu: [33,33; 33,33; 33,34]`);
console.log(`  Résultat obtenu : [${adjusted1.map(c => (c / 100).toFixed(2)).join("; ")}]`);

// ============================================
// Test 2 : Exemple de référence 1,00 € / 3
// ============================================
console.log("\n\n📋 Test 2 : 1,00 € / 3 échéances");
console.log("-".repeat(70));

const total2 = 1.0;
const n2 = 3;

const amounts2 = splitAmountInCents(total2, n2);
const adjusted2 = adjustLastAmount([...amounts2], total2);

console.log("Résultat:");
adjusted2.forEach((amt, i) => {
  console.log(`  Échéance ${i + 1}: ${formatCents(amt)}`);
});

const totalCalculated2 = adjusted2.reduce((sum, amt) => sum + amt, 0);
const expected2 = Math.round(total2 * 100);
console.log(`\n  Total calculé: ${totalCalculated2} centimes`);
console.log(`  Total attendu : ${expected2} centimes`);
console.log(`  ✅ Vérification: ${totalCalculated2 === expected2 ? "OK" : "ERREUR"}`);
console.log(`  Résultat attendu: [0,33; 0,33; 0,34]`);
console.log(`  Résultat obtenu : [${adjusted2.map(c => (c / 100).toFixed(2)).join("; ")}]`);

// ============================================
// Test 3 : 0,01 € / 1
// ============================================
console.log("\n\n📋 Test 3 : 0,01 € / 1 échéance");
console.log("-".repeat(70));

const total3 = 0.01;
const n3 = 1;

const amounts3 = splitAmountInCentsWithAdjustment(total3, n3);
console.log("Résultat:");
amounts3.forEach((amt, i) => {
  console.log(`  Échéance ${i + 1}: ${formatCents(amt)}`);
});

const totalCalculated3 = amounts3.reduce((sum, amt) => sum + amt, 0);
const expected3 = Math.round(total3 * 100);
console.log(`\n  Total calculé: ${totalCalculated3} centimes`);
console.log(`  Total attendu : ${expected3} centimes`);
console.log(`  ✅ Vérification: ${totalCalculated3 === expected3 ? "OK" : "ERREUR"}`);

// ============================================
// Test 4 : 0,00 € / n
// ============================================
console.log("\n\n📋 Test 4 : 0,00 € / 5 échéances");
console.log("-".repeat(70));

const total4 = 0.0;
const n4 = 5;

const amounts4 = splitAmountInCentsWithAdjustment(total4, n4);
console.log("Résultat:");
amounts4.forEach((amt, i) => {
  console.log(`  Échéance ${i + 1}: ${formatCents(amt)}`);
});

const totalCalculated4 = amounts4.reduce((sum, amt) => sum + amt, 0);
console.log(`\n  Total calculé: ${totalCalculated4} centimes`);
console.log(`  ✅ Vérification: ${totalCalculated4 === 0 ? "OK" : "ERREUR"}`);

// ============================================
// Test 5 : Analyse du problème 01/01 - 31/12
// ============================================
console.log("\n\n📋 Test 5 : Analyse - Contrat 01/01/2025 - 31/12/2025");
console.log("-".repeat(70));

const start5 = new Date("2025-01-01");
const end5 = new Date("2025-12-31");
const total5 = 1200.0; // 1200 € pour 12 mois
const frequency5: BillingFrequency = "MONTHLY";

console.log(`Début: ${start5.toLocaleDateString("fr-FR")}`);
console.log(`Fin  : ${end5.toLocaleDateString("fr-FR")}`);
console.log(`Montant total: ${total5.toFixed(2)} €`);
console.log(`Fréquence: ${frequency5}\n`);

const periods5 = buildPeriods(start5, end5, frequency5, null);
console.log(`Nombre de périodes: ${periods5.length}\n`);

// Calculer les jours par période
const daysPerPeriod = periods5.map(({ pStart, pEnd }) => {
  const days = Math.floor((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { pStart, pEnd, days };
});

console.log("Périodes et nombre de jours:");
daysPerPeriod.forEach((period, i) => {
  console.log(
    `  Mois ${String(i + 1).padStart(2, " ")}: ${period.pStart.toLocaleDateString("fr-FR")} → ${period.pEnd.toLocaleDateString("fr-FR")} (${String(period.days).padStart(2, " ")} jours)`
  );
});

// Calculer les montants proportionnels (méthode actuelle)
const amounts5 = calculateAmountsByPeriodDays(total5, periods5);
console.log("\nMontants calculés (proportionnels aux jours):");
let total5Calc = 0;
amounts5.forEach((amt, i) => {
  total5Calc += amt;
  console.log(
    `  Mois ${String(i + 1).padStart(2, " ")}: ${amt.toFixed(2).padStart(8, " ")} € (${daysPerPeriod[i].days} jours)`
  );
});

console.log(`\n  Total calculé: ${total5Calc.toFixed(2)} €`);
console.log(`  Total attendu : ${total5.toFixed(2)} €`);

// Calculer avec US5.1+US5.2 (répartition égale)
const amounts5Equal = splitAmountInCentsWithAdjustment(total5, periods5.length);
const amounts5EqualEuros = amounts5Equal.map(c => c / 100);

console.log("\nMontants avec US5.1+US5.2 (répartition égale):");
let total5Equal = 0;
amounts5EqualEuros.forEach((amt, i) => {
  total5Equal += amt;
  console.log(
    `  Mois ${String(i + 1).padStart(2, " ")}: ${amt.toFixed(2).padStart(8, " ")} €`
  );
});

console.log(`\n  Total calculé: ${total5Equal.toFixed(2)} €`);
console.log(`  Total attendu : ${total5.toFixed(2)} €`);

console.log("\n💡 Explication:");
console.log("  - Méthode proportionnelle: Les montants varient selon le nombre de jours");
console.log("    (janvier=31j, février=28j, etc.) → montants différents");
console.log("  - Méthode US5.1+US5.2: Répartition égale (sauf dernière échéance ajustée)");
console.log("    → Toutes les échéances sont égales sauf la dernière");

// ============================================
// Résumé
// ============================================
console.log("\n\n" + "=".repeat(70));
console.log("✅ TOUS LES TESTS US5.2 SONT TERMINÉS");
console.log("=".repeat(70));

