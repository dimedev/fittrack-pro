# 🎯 LOGIQUE DE COACHING PROFESSIONNELLE

## Temps de repos intelligents - Vision coach pro

### 📊 Principe

Les temps de repos sont déterminés par **3 facteurs** :
1. **Type de mouvement** (compound vs isolation)
2. **Taille du groupe musculaire** (gros vs petit)
3. **Objectif de l'utilisateur** (force, hypertrophie, endurance)

---

## 🏋️ Classification des exercices

### 1️⃣ Composés Gros Muscles (Heavy Compounds)
**Exercices** : Squat, Deadlift, Soulevé de terre, Hip Thrust, Leg Press, Presse

| Objectif | Temps de repos |
|----------|----------------|
| Force | 4 min (240s) |
| Hypertrophie | 2min30 (150s) |
| Endurance | 1min30 (90s) |

**Raison** : Ces exercices sollicitent énormément le système nerveux central et plusieurs gros groupes musculaires. Besoin de récupération complète pour maintenir l'intensité.

---

### 2️⃣ Composés Haut du Corps (Upper Body Compounds)
**Exercices** : Bench Press, Développé, Overhead Press, Military Press, Rowing, Barbell Row, Pull-ups, Chin-ups, Tractions

| Objectif | Temps de repos |
|----------|----------------|
| Force | 3 min (180s) |
| Hypertrophie | 2 min (120s) |
| Endurance | 1min15 (75s) |

**Raison** : Mouvements composés mais sollicitant des groupes musculaires légèrement plus petits que le bas du corps. Récupération importante mais moins longue.

---

### 3️⃣ Isolation Jambes (Leg Isolation)
**Exercices** : Leg Curl, Leg Extension, Abduction, Adduction

| Objectif | Temps de repos |
|----------|----------------|
| Force | 2 min (120s) |
| Hypertrophie | 1min30 (90s) |
| Endurance | 1 min (60s) |

**Raison** : Mouvements mono-articulaires ciblant un seul muscle des jambes. Moins taxant sur le système nerveux.

---

### 4️⃣ Isolation Bras (Arm Isolation)
**Exercices** : Biceps Curl, Triceps Extension, Pushdown, etc.

| Objectif | Temps de repos |
|----------|----------------|
| Force | 1min30 (90s) |
| Hypertrophie | 1min15 (75s) |
| Endurance | 45s |

**Raison** : Petits groupes musculaires, récupération rapide. Focus sur la congestion plutôt que la force maximale.

---

### 5️⃣ Petits Muscles (Small Muscles)
**Exercices** : Lateral Raises, Élévations latérales, Calf Raises, Mollets, Shrugs, Face Pulls

| Objectif | Temps de repos |
|----------|----------------|
| Force | 1min15 (75s) |
| Hypertrophie | 1 min (60s) |
| Endurance | 45s |

**Raison** : Muscles accessoires, très petits. Récupération très rapide, focus sur la sensation et le pump.

---

## 🧠 Implémentation Code

La fonction `getSmartRestTime(exerciseName, goal)` analyse le nom de l'exercice et retourne le temps optimal :

```javascript
// Exemple : Squat pour Hypertrophie
getSmartRestTime("Squat", "hypertrophy") → 150s (2min30)

// Exemple : Biceps Curl pour Force
getSmartRestTime("Biceps Curl", "strength") → 90s (1min30)

// Exemple : Lateral Raises pour Endurance
getSmartRestTime("Lateral Raises", "endurance") → 45s
```

---

## ⚙️ Détection automatique

Le système détecte le type d'exercice via des **mots-clés** dans le nom :

| Catégorie | Mots-clés |
|-----------|-----------|
| Heavy Compounds | squat, deadlift, soulevé de terre, hip thrust, presse, leg press |
| Upper Compounds | bench, développé, overhead press, military press, rowing, barbell row, pull-up, chin-up, traction |
| Leg Isolation | leg curl, leg extension, curl, extension, abduction, adduction |
| Arm Isolation | biceps, triceps, curl, extension, pushdown |
| Small Muscles | lateral, élévation, raises, calf, mollet, shrug, face pull |

---

## 🎯 Timer par exercice

**Comportement** :
- Le timer démarre après la **première série de CHAQUE exercice**
- Pas après la première série de la séance, mais après la 1ère série de chaque nouvel exercice
- Cela permet de s'échauffer correctement sur chaque mouvement

**Exemple** :
```
Séance Push :
1. Bench Press
   - Série 1 : ❌ Pas de timer (échauffement)
   - Série 2 : ✅ Timer 120s
   - Série 3 : ✅ Timer 120s

2. Overhead Press
   - Série 1 : ❌ Pas de timer (échauffement)
   - Série 2 : ✅ Timer 120s
   - Série 3 : ✅ Timer 120s
```

---

## 💡 Philosophie coaching

Cette logique reflète les **standards de coaching professionnel** :
- ✅ Repos adaptés au type d'effort
- ✅ Prise en compte de la fatigue nerveuse (compounds)
- ✅ Optimisation temps/efficacité (isolation)
- ✅ Progression possible (force = repos longs)
- ✅ Volume maximal (hypertrophie = repos moyens)
- ✅ Cardio-training (endurance = repos courts)

---

## 📝 Personnalisation

L'utilisateur peut **toujours override** le timer en cliquant sur `+30s` / `-30s` si besoin.

Le système propose un temps **optimal**, mais laisse la liberté de l'ajuster selon :
- Sensation du jour
- Fatigue accumulée
- Niveau d'échauffement
- Conditions (chaleur, stress, etc.)

---

*Logique implémentée le 26 janvier 2026*  
*Basée sur les recommandations NSCA, ACE, et ISSA*
