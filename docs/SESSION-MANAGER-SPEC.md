# Session Manager - Spécification Technique

## Vue d'ensemble

Le `SessionManager` est un module centralisé pour la gestion des séances d'entraînement, offrant :
- Suppression d'exercices avec mise à jour temps réel
- Copie de séances (dernière séance, semaine précédente)
- Sauvegarde automatique (optimistic UI)
- Statistiques en temps réel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Session     │  │   Exercise   │  │    Live Stats    │  │
│  │  Toolbar     │  │    Cards     │  │    Component     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     SESSION UI (session-ui.js)               │
│  • loadSessionDayV2()      • handleSetUpdate()              │
│  • renderSessionStats()    • confirmDeleteExercise()        │
│  • openCopySessionModal()  • handleSetComplete()            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SESSION MANAGER (session-manager.js)        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Lifecycle  │  │  Exercise   │  │    Copy/Paste       │ │
│  │  initSession│  │  CRUD       │  │    copySession()    │ │
│  │  finalize() │  │  deleteEx() │  │    copyLastSession()│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    Sets     │  │   Stats     │  │      Events         │ │
│  │  updateSet()│  │  calculate()│  │   emitUpdate()      │ │
│  │  addSet()   │  │  compare()  │  │   on(type, cb)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         STATE (state.js)                     │
│  state.activeSession = {                                    │
│    id, date, dayType, program,                              │
│    exercises: [{ id, effectiveName, sets: [...] }],         │
│    isDirty, lastSavedAt                                     │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Schéma de données

### ActiveSession
```javascript
{
  id: 'session-uuid',           // Identifiant unique
  date: '2025-01-22',           // Date ISO
  dayIndex: 0,                  // Index du jour dans le split
  dayType: 'Push',              // Type de jour
  program: 'ppl',               // ID du programme
  startedAt: 1705924800000,     // Timestamp début
  exercises: [SessionExercise], // Liste des exercices
  isDirty: false,               // Modifications non sauvegardées
  lastSavedAt: null             // Dernier save
}
```

### SessionExercise
```javascript
{
  id: 'ex-uuid',                // Identifiant unique
  originalName: 'Développé Couché',  // Nom original du programme
  effectiveName: 'Chest Press',      // Nom après swap
  order: 0,                     // Position
  targetSets: 4,                // Nombre de séries cibles
  targetReps: '8-10',           // Reps cibles
  muscle: 'chest',              // Groupe musculaire
  sets: [SessionSet]            // Séries
}
```

### SessionSet
```javascript
{
  id: 'set-uuid',               // Identifiant unique
  weight: 60,                   // Poids en kg
  reps: 10,                     // Répétitions
  completed: true,              // Série validée
  timestamp: 1705924850000      // Timestamp de completion
}
```

## API Publique

### Lifecycle

| Méthode | Description | Retour |
|---------|-------------|--------|
| `initSession(dayIndex)` | Initialise une nouvelle session | `ActiveSession \| null` |
| `getOrCreateSession(dayIndex)` | Récupère ou crée la session | `ActiveSession \| null` |
| `clearActiveSession()` | Supprime la session active | `void` |
| `finalizeSession()` | Sauvegarde dans l'historique | `{session, newPRs} \| null` |

### Exercise CRUD

| Méthode | Description | Retour |
|---------|-------------|--------|
| `deleteExercise(exerciseId)` | Supprime un exercice | `boolean` |
| `addExercise(data, position?)` | Ajoute un exercice | `SessionExercise \| null` |
| `reorderExercise(id, newPos)` | Réordonne un exercice | `boolean` |

### Set Management

| Méthode | Description | Retour |
|---------|-------------|--------|
| `updateSet(exId, setId, updates)` | Met à jour une série | `SessionSet \| null` |
| `addSet(exerciseId, data?)` | Ajoute une série | `SessionSet \| null` |
| `deleteSet(exerciseId, setId)` | Supprime une série | `boolean` |

### Copy Session

| Méthode | Description | Retour |
|---------|-------------|--------|
| `copySession(sessionId, date?)` | Copie une session | `ActiveSession \| null` |
| `copyLastSessionOfType(dayType)` | Copie la dernière du type | `ActiveSession \| null` |
| `copySessionFromWeek(weeksAgo, dayIndex)` | Copie d'une semaine | `ActiveSession \| null` |

### Statistics

| Méthode | Description | Retour |
|---------|-------------|--------|
| `calculateSessionStats()` | Stats de la session | `{totalVolume, totalSets, totalReps, exerciseStats}` |
| `compareWithLastSession()` | Comparaison | `{current, previous, diff}` |

### Events

| Méthode | Description |
|---------|-------------|
| `on(eventType, callback)` | S'abonner à un événement |

**Types d'événements :**
- `exercise-deleted`
- `exercise-added`
- `exercise-reordered`
- `set-updated`
- `set-added`
- `set-deleted`
- `session-copied`
- `session-finalized`

## Utilisation

### Supprimer un exercice
```javascript
// Dans l'UI
confirmDeleteExercise(exerciseId, exerciseName);

// Dans le code
SessionManager.deleteExercise('ex-123');
// → Supprime l'exercice
// → Réordonne les autres
// → Émet 'exercise-deleted'
// → Auto-save (debounced)
```

### Copier la dernière séance
```javascript
// Copie la dernière séance "Push"
const session = SessionManager.copyLastSessionOfType('Push');
if (session) {
  loadSessionDayV2(); // Re-render
}
```

### Écouter les changements
```javascript
// Via l'API
const unsubscribe = SessionManager.on('set-updated', (data) => {
  console.log('Set mis à jour:', data);
});

// Via DOM events
document.addEventListener('session-update', (e) => {
  const { type, data } = e.detail;
  if (type === 'exercise-deleted') {
    showToast(`${data.removed.effectiveName} supprimé`);
  }
});
```

## Migration

Pour migrer de `loadSessionDay()` vers le nouveau système :

1. **Remplacer l'appel** : `loadSessionDay()` → `loadSessionDayV2()`

2. **Remplacer la sauvegarde** : `saveSession()` → `saveSessionV2()`

3. **Les données existantes** sont compatibles, le nouveau système utilise les mêmes structures `state.progressLog` et `state.sessionHistory`

## Points clés UX

### Optimistic UI
- Les modifications sont appliquées immédiatement à l'UI
- La sauvegarde est debounced (500ms)
- Indicateur de sauvegarde en cours (optionnel)

### Mobile-First
- Boutons avec min 44px de touch target
- Drag & drop compatible touch
- Toolbar responsive

### Stats temps réel
- Volume total calculé à chaque modification
- Comparaison avec la dernière séance similaire
- Indicateur de progression (+/- %)

## Dépendances

Le module dépend de :
- `state.js` - Gestion du state global
- `training.js` - `getEffectiveExerciseName()`, `getLastLog()`
- `progress.js` - `checkForNewPR()` (optionnel)
- `ui.js` - `showToast()`, `openModal()`, `closeModal()`
