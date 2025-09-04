# 🔗 Guide des accès - Module d'Indexation KLYXOR

## 📍 Points d'accès principaux

### 1. Module d'Indexation Autonome (NOUVEAU)
- **URL**: `/indexation`
- **Menu**: Module Indexation > Gestion autonome
- **Description**: Interface complète de gestion autonome des indexations
- **Fonctionnalités**:
  - Dashboard avec statistiques en temps réel
  - Scheduler automatique (démarrage/arrêt)
  - Gestion des propositions d'indexation
  - Validation/Rejet des propositions
  - Génération de rapports PDF/Excel
  - Gestion manuelle des indices

### 2. Historique des Indexations (EXISTANT)
- **URL**: `/indexations`
- **Menu**: 
  - Validation & Contrôle > Indexations & rapports
  - Module Indexation > Historique indexations
- **Description**: Vue historique et rapports des indexations passées
- **Fonctionnalités**:
  - Consultation de l'historique
  - Export des données
  - Rapports détaillés

### 3. Administration Indexations
- **URL**: `/admin/indexations`
- **Accès**: Administrateurs uniquement
- **Description**: Gestion administrative des indexations
- **Fonctionnalités**:
  - Configuration globale
  - Paramétrage des formules
  - Gestion des droits

## 🔄 Flux de navigation recommandé

```
Tableau de bord
    ↓
Module Indexation
    ├── Gestion autonome (/indexation) ← NOUVEAU MODULE PRINCIPAL
    │   ├── Scheduler
    │   ├── Propositions
    │   ├── Rapports
    │   └── Indices
    │
    └── Historique indexations (/indexations) ← VUE HISTORIQUE
        ├── Consultations
        └── Exports
```

## 🛠️ API Endpoints

### Base URL: `/api/indexation`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/scheduler/start` | POST | Démarre le scheduler |
| `/scheduler/stop` | POST | Arrête le scheduler |
| `/scheduler/run` | POST | Exécution manuelle |
| `/proposals` | GET/POST | Gestion des propositions |
| `/proposals/:id/validate` | POST | Validation d'une proposition |
| `/indices/:key/:period` | GET | Récupération d'un indice |
| `/indices/manual` | POST | Saisie manuelle d'indice |
| `/reports` | GET | Liste des rapports |
| `/stats` | GET | Statistiques du module |

## ✅ Vérifications d'harmonie

### Points forts:
- ✅ Séparation claire entre nouveau module autonome et historique
- ✅ Navigation cohérente dans le menu latéral
- ✅ API REST bien structurée
- ✅ Responsive design sur tous les écrans

### Points d'attention:
- ⚠️ Deux entrées menu pointent vers `/indexations` (redondance volontaire pour faciliter l'accès)
- ⚠️ Authentification requise pour toutes les routes API

## 🔐 Contrôle d'accès

| Rôle | Accès Module Autonome | Accès Historique | Accès Admin |
|------|----------------------|------------------|-------------|
| Administrateur | ✅ Complet | ✅ Complet | ✅ Complet |
| Gestionnaire | ✅ Consultation/Création | ✅ Complet | ❌ |
| Valideur | ✅ Validation uniquement | ✅ Lecture | ❌ |

## 📱 Responsive Design

- **Desktop**: Interface complète avec sidebar
- **Tablet**: Menu hamburger + interface adaptée
- **Mobile**: Navigation mobile optimisée

## 🚀 Utilisation recommandée

1. **Pour créer une indexation**: `/indexation` > Détection manuelle
2. **Pour valider**: `/indexation` > Onglet Propositions
3. **Pour consulter l'historique**: `/indexations`
4. **Pour configurer**: `/admin/indexations` (admin seulement)