# 🏋️ FitTrack Pro - Progression Engine
## Spécification Technique du Système de Progression Automatique Intelligente

---

## 📋 Vue d'ensemble

Le **Progression Engine** est un module intelligent qui analyse l'historique d'entraînement pour générer automatiquement des suggestions de progression, détecter les plateaux, et gérer la périodisation.

### Fichiers créés/modifiés :
- `js/modules/progression-engine.js` - Module principal
- `css/style-nike-shadcn.css` - Styles UI ajoutés
- `index.html` - Nouvel onglet "Analyse IA" ajouté
- `js/modules/stats.js` - Integration du switch tab

---

## 🧠 Algorithme de Progression (Pseudo-code)

```
FONCTION getSmartProgressionSuggestion(exercice, fourchette_reps):
    
    logs = récupérer_historique(exercice)
    
    SI logs.length < 2:
        RETOURNER {type: "nouveau", message: "Commencez léger"}
    
    dernierLog = logs[dernier]
    poidsActuel = dernierLog.poids
    repsMoyennes = calculer_moyenne_reps(dernierLog.series)
    tauxCompletion = séries_complétées / séries_totales
    
    // Parser la fourchette (ex: "8-12" → min=8, max=12)
    repsMin, repsMax = parser(fourchette_reps)
    
    // Déterminer l'incrément approprié
    SI poidsActuel >= 60:
        increment = 5 kg
    SINON:
        increment = 2.5 kg
    
    // === LOGIQUE DE DÉCISION ===
    
    SI repsMoyennes >= repsMax ET tauxCompletion >= 80%:
        // Prêt à augmenter le poids
        nouveauPoids = poidsActuel + increment
        RETOURNER {type: "augmenter", poids: nouveauPoids, confiance: "haute"}
    
    SI repsMoyennes >= repsMin + 2:
        // Continuer à ce poids, pousser vers reps max
        RETOURNER {type: "maintenir_pousser", poids: poidsActuel}
    
    SI repsMoyennes >= repsMin:
        // Dans la fourchette, consolider
        RETOURNER {type: "maintenir", poids: poidsActuel}
    
    SI repsMoyennes < repsMin - 2:
        // Trop difficile, réduire
        RETOURNER {type: "réduire", poids: poidsActuel - increment}
    
    // Cas par défaut
    RETOURNER {type: "maintenir", poids: poidsActuel}
```

---

## 📊 Règles Métier Détaillées

### 1. Double Progression
La méthode principale de progression utilisée :

| Étape | Condition | Action |
|-------|-----------|--------|
| 1 | Reps moyennes ≥ reps max cibles | ✅ Augmenter le poids |
| 2 | Reps moyennes dans la fourchette haute | 💪 Continuer, viser le max |
| 3 | Reps moyennes dans la fourchette | 👍 Consolider la technique |
| 4 | Reps moyennes < min - 2 | 📉 Réduire le poids |

**Incréments de poids :**
- Poids < 60kg : +2.5kg
- Poids ≥ 60kg : +5kg

### 2. Détection de Plateau

```javascript
PLATEAU = {
    condition: "même poids ET même reps pendant N séances",
    seuil: 3 séances consécutives,
    tolérance_poids: 0 kg (exactement identique),
    tolérance_reps: ±1 rep
}
```

**Actions recommandées en cas de plateau :**
1. Varier la technique (tempo, pause, partials)
2. Changer d'exercice temporairement
3. Augmenter le volume (1-2 séries)
4. Considérer un deload

### 3. Périodisation Automatique (Cycle de 4 semaines)

| Semaine | Type | Volume | Intensité | Message |
|---------|------|--------|-----------|---------|
| 1 | Accumulation | 100% | 95% | Focus technique |
| 2 | Intensification | 100% | 100% | Augmenter si prêt |
| 3 | Surcharge | 110% | 105% | Pousser les limites |
| 4 | **DELOAD** | 60% | 90% | Récupération |

**Paramètres Deload :**
- Réduction volume : -40%
- Réduction poids : -10%
- Réduction reps : -2 reps

### 4. Tracking du Volume

```javascript
Volume_Session = Σ(poids × reps) pour chaque série

Volume_Hebdomadaire = Σ(Volume_Session) sur 7 jours

// Recommandations par niveau (séries/semaine/muscle)
VOLUME_CIBLES = {
    débutant: { min: 10, max: 15 },
    intermédiaire: { min: 15, max: 20 },
    avancé: { min: 18, max: 25 }
}
```

---

## 🏗️ Architecture d'Intégration

```
┌─────────────────────────────────────────────────────────┐
│                    FitTrack Pro                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   state.js      │───▶│   progression-engine.js     │ │
│  │  progressLog    │    │                             │ │
│  │  sessionHistory │    │  • calculateSessionVolume() │ │
│  │  exercises      │    │  • detectPlateau()          │ │
│  └─────────────────┘    │  • getSmartSuggestion()     │ │
│                         │  • getCurrentPeriodWeek()   │ │
│  ┌─────────────────┐    │  • checkDeloadNeed()        │ │
│  │   training.js   │◀───│  • generateAnalysis()       │ │
│  │  saveSession()  │    │                             │ │
│  │  loadSessionDay │    └─────────────────────────────┘ │
│  └─────────────────┘              │                     │
│           │                       │                     │
│           ▼                       ▼                     │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Dashboard     │    │    Tab Analyse IA           │ │
│  │  Recommandations│    │  • Périodisation actuelle   │ │
│  │  Card Container │    │  • Suggestions par exercice │ │
│  └─────────────────┘    │  • Alertes plateau/deload   │ │
│                         └─────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 API du Module

### Fonctions Exposées (window.ProgressionEngine)

```javascript
// Calculs de volume
ProgressionEngine.calculateSessionVolume(log)
ProgressionEngine.getWeeklyVolume(exerciseName, weeksBack)
ProgressionEngine.getMuscleGroupVolume(muscleGroup, days)

// Détection plateau
ProgressionEngine.detectPlateau(exerciseName)
// Retourne: { isPlateaued, consecutiveSessions, details }

// Suggestions progression
ProgressionEngine.getSmartProgressionSuggestion(exerciseName, targetReps)
// Retourne: { type, suggestedWeight, message, confidence, reasoning }

// Périodisation
ProgressionEngine.getCurrentPeriodizationWeek()
// Retourne: { weekNumber, weekType, cycleWeek, recommendations }

ProgressionEngine.checkDeloadNeed()
// Retourne: { needsDeload, reason, urgency, fatigueScore }

ProgressionEngine.calculateDeloadParams(exerciseName)
// Retourne: { deloadWeight, deloadReps, originalWeight, message }

// Analyse globale
ProgressionEngine.generateProgressionAnalysis()
// Retourne analyse complète avec tous les exercices

// UI
ProgressionEngine.renderProgressionAnalysisSection()
ProgressionEngine.updateProgressionAnalysis()

// Configuration (lecture seule)
ProgressionEngine.CONFIG
```

---

## 🎨 Suggestions UI

### Messages Affichés à l'Utilisateur

| Type | Icône | Message Exemple |
|------|-------|-----------------|
| `increase_weight` | 🚀 | "Prêt à progresser ! Passez à 82.5kg" |
| `decrease_weight` | 📉 | "Consolidez à 75kg pour atteindre 8+ reps" |
| `maintain_push` | 💪 | "Bien joué ! Visez 12 reps à 80kg" |
| `maintain` | 👍 | "Continuez à 80kg, objectif: 12 reps" |
| `deload` | 🌿 | "Semaine de DELOAD - Récupérez" |
| `plateau` | ⚠️ | "Plateau détecté: 80kg × 8 reps depuis 4 séances" |

### Niveaux de Confiance

| Niveau | Couleur | Signification |
|--------|---------|---------------|
| `high` | 🟢 Vert | Données suffisantes, recommandation fiable |
| `medium` | 🟡 Orange | Quelques incertitudes, mais recommandation valide |
| `low` | ⚪ Gris | Pas assez de données pour une recommandation précise |

---

## 📝 Structure des Données

### progressLog (existant)
```javascript
state.progressLog = {
    "Développé Couché": [
        {
            date: "2025-01-20",
            sets: 4,
            weight: 80,
            achievedReps: 32,      // Total des reps
            achievedSets: 4,       // Séries complétées
            setsDetail: [          // Détail par série
                { setNumber: 1, weight: 80, reps: 8, completed: true },
                { setNumber: 2, weight: 80, reps: 8, completed: true },
                { setNumber: 3, weight: 80, reps: 8, completed: true },
                { setNumber: 4, weight: 80, reps: 8, completed: true }
            ]
        }
    ]
}
```

### Analyse Générée
```javascript
{
    timestamp: "2025-01-22T...",
    periodization: {
        weekNumber: 5,
        weekType: "accumulation",
        cycleWeek: 1,
        recommendations: { volumeModifier: 1.0, intensityModifier: 0.95, message: "..." }
    },
    deloadCheck: {
        needsDeload: false,
        reason: "",
        urgency: "none",
        fatigueScore: 0
    },
    exerciseAnalysis: {
        "Développé Couché": {
            type: "increase_weight",
            suggestedWeight: 82.5,
            previousWeight: 80,
            increment: 2.5,
            message: "🚀 Prêt à progresser !",
            confidence: "high",
            reasoning: ["✅ Reps moyennes (10) ≥ cible max (10)", "→ Augmentation de 2.5kg recommandée"],
            plateau: { isPlateaued: false, ... },
            weeklyVolume: { totalVolume: 2560, avgVolumePerSession: 640, sessions: 4 },
            muscle: "chest"
        }
    },
    volumeByMuscle: {
        "chest": { totalSets: 16, totalVolume: 5120, exercises: {...} }
    },
    globalRecommendations: [
        { type: "progression", priority: "medium", message: "🚀 3 exercice(s) prêt(s) à progresser !" }
    ]
}
```

---

## ✅ Points Importants

1. **Pas de valeurs hardcodées** : Le nombre de séries vient toujours de `ex.sets` dans le programme
2. **Données existantes** : Utilise uniquement `state.progressLog` et `state.sessionHistory`
3. **Logique explicable** : Chaque suggestion inclut un tableau `reasoning[]` avec les justifications
4. **Non frustrante** : Les messages sont encourageants, jamais punitifs
5. **Ajustable** : Configuration centralisée dans `PROGRESSION_CONFIG`

---

## 🔮 Évolutions Futures

- [ ] Machine Learning pour prédire les performances
- [ ] Synchronisation avec wearables (récupération HRV)
- [ ] Alertes push pour rappel de deload
- [ ] Comparaison avec des utilisateurs similaires
- [ ] Export PDF des analyses

---

*Documentation générée le 22/01/2025*
