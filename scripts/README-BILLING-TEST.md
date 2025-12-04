# 🧪 Script de Test - Calcul des Échéances

Ce script permet de tester et vérifier que la logique de calcul des échéances fonctionne correctement.

## 📋 Prérequis

- Node.js installé
- Les dépendances du projet installées (`npm install`)

## 🚀 Exécution

Pour exécuter le script de test, utilisez une des commandes suivantes :

```bash
# Option 1 : Avec tsx (recommandé)
npx tsx scripts/test-billing-calculation.ts

# Option 2 : Avec ts-node
npx ts-node scripts/test-billing-calculation.ts

# Option 3 : Si vous avez tsx installé globalement
tsx scripts/test-billing-calculation.ts
```

## 📊 Exemples de test inclus

Le script teste 4 scénarios différents :

### 1. Contrat mensuel avec date d'indexation
- **Début** : 04/04/2025
- **Fin** : 31/12/2026
- **Indexation** : 01/01/2026
- **Montant** : 1000.00 €
- **Fréquence** : Mensuelle

**Résultat attendu** : Les échéances s'arrêtent à la date d'indexation (01/01/2026)

### 2. Contrat mensuel sans indexation
- **Début** : 15/01/2025
- **Fin** : 31/12/2025
- **Montant** : 500.00 €
- **Fréquence** : Mensuelle

**Résultat attendu** : Calcul sur toute la période du contrat

### 3. Test US5.1 (splitAmountInCents)
- **Montant** : 100.50 €
- **Échéances** : 3

**Résultat attendu** : Répartition en centimes (entiers)

### 4. Contrat trimestriel
- **Début** : 10/04/2025
- **Fin** : 31/12/2026
- **Montant** : 2000.00 €
- **Fréquence** : Trimestrielle

**Résultat attendu** : Calcul par trimestres complets

## ✅ Vérifications

Le script vérifie automatiquement :
- ✅ Le nombre d'échéances générées
- ✅ Les dates de début et fin de chaque période
- ✅ Le nombre de jours par période
- ✅ Le montant calculé pour chaque échéance
- ✅ La somme totale (doit être égale au montant total ± 0.01 €)

## 🔧 Personnalisation

Pour tester avec vos propres données, modifiez les variables dans le fichier `scripts/test-billing-calculation.ts` :

```typescript
const start = new Date("2025-04-04");      // Date de début
const end = new Date("2026-12-31");        // Date de fin
const indexationDate = new Date("2026-01-01"); // Date d'indexation (ou null)
const totalAmount = 1000.0;                 // Montant total
const frequency: BillingFrequency = "MONTHLY"; // Fréquence
```

## 📝 Notes

- Les montants sont arrondis à 2 décimales
- La différence totale doit être ≤ 0.01 €
- La première période commence au jour exact du début du contrat
- Les périodes suivantes sont des périodes complètes (mois, trimestres, etc.)
- Si une date d'indexation est définie, le calcul s'arrête à cette date

