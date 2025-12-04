# US5.2 - Explication : Pourquoi la dernière mensualité n'est pas égale aux autres ?

## 📋 Question

> Pourquoi lorsque le contrat commence le 01.01 et se termine le 31.12 la dernière mensualité n'est pas égale aux autres ?

## 💡 Réponse

### Méthode actuelle (proportionnelle aux jours)

Avec la méthode **proportionnelle aux jours réels**, les montants varient selon le nombre de jours de chaque mois :

- **Janvier** : 31 jours → montant plus élevé
- **Février** : 28/29 jours → montant plus faible
- **Mars** : 31 jours → montant plus élevé
- etc.

**Exemple** : Contrat 01/01/2025 - 31/12/2025, montant total 1200 €

```
Mois  1 (31j): 101.92 €
Mois  2 (29j):  92.05 €  ← Plus faible (février)
Mois  3 (31j): 101.92 €
Mois  4 (30j):  98.63 €
...
Mois 12 (31j): 101.91 €
```

### Solution avec US5.1 + US5.2

Avec **US5.1 + US5.2**, on fait une **répartition égale** (sauf la dernière échéance qui est ajustée pour compenser les arrondis) :

**Exemple** : Contrat 01/01/2025 - 31/12/2025, montant total 1200 €

```
Mois  1: 100.00 €
Mois  2: 100.00 €
Mois  3: 100.00 €
...
Mois 11: 100.00 €
Mois 12: 100.00 €  ← Toutes égales (ou dernière ajustée si arrondis)
```

## 🔧 Implémentation

Le système détecte automatiquement si toutes les périodes ont le même nombre de jours :

- ✅ **Périodes égales** → Utilise US5.1+US5.2 (répartition égale)
- ❌ **Périodes différentes** → Utilise la méthode proportionnelle (jours réels)

### Exemples de référence US5.2

| Montant | Échéances | Résultat |
|---------|-----------|----------|
| 100,00 € | 3 | [33,33; 33,33; 33,34] |
| 1,00 € | 3 | [0,33; 0,33; 0,34] |
| 0,01 € | 1 | [0,01] |
| 0,00 € | n | [0,00 ... 0,00] |

## 📊 Algorithme US5.2

```
1. Calculer base_cents = floor(total_cents / n)
2. Calculer sum_prev = base_cents * (n - 1)
3. Calculer last_cents = total_cents - sum_prev
4. Vérifier last_cents >= 0 (sinon erreur)
5. Ajuster amounts[n-1] = last_cents
```

## ✅ Avantages

- **Précision** : Somme exacte = montant total (0 centimes d'écart)
- **Simplicité** : Toutes les échéances égales (sauf dernière si ajustement)
- **Traçabilité** : Journalisation INFO/WARN pour audit

## 🧪 Tests

Pour tester US5.2 :

```bash
npx tsx scripts/test-us5.2.ts
```

Tous les tests passent ✅

