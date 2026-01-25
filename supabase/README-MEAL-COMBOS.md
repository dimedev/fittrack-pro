# Configuration Table meal_combos

## Étape 1 : Créer la table dans Supabase

1. Ouvre ton dashboard Supabase : https://supabase.com/dashboard
2. Sélectionne ton projet FitTrack Pro
3. Va dans **SQL Editor** (dans le menu de gauche)
4. Copie-colle le contenu du fichier [`meal_combos_table.sql`](meal_combos_table.sql)
5. Clique sur **Run** pour exécuter le SQL

### Ce qui sera créé :

- ✅ Table `meal_combos` avec tous les champs nécessaires
- ✅ Index pour optimiser les performances
- ✅ Trigger pour mettre à jour automatiquement `updated_at`
- ✅ Row Level Security (RLS) activé
- ✅ Politiques de sécurité (SELECT, INSERT, UPDATE, DELETE)

---

## Étape 2 : Vérifier que tout fonctionne

### Test dans l'application

1. **Connecte-toi** à l'application
2. Va dans **Nutrition**
3. Ajoute quelques aliments à un repas (ex: petit-déjeuner)
4. Clique sur le bouton pour **sauvegarder comme combo favori**
5. Va dans Supabase > **Table Editor** > Cherche `meal_combos`
6. Tu devrais voir ton combo apparaître dans la table

### Vérifier dans Supabase

Dans **Table Editor** > `meal_combos`, tu devrais voir :
- `user_id` : ton ID utilisateur
- `combo_id` : ID unique du combo
- `name` : nom du combo (ex: "Œufs + Pain + Avocat")
- `icon` : émoji (ex: "⭐")
- `foods` : JSON avec les aliments et quantités
- `meal_types` : array avec les types de repas
- `usage_count` : nombre d'utilisations (1 au début)
- `created_at`, `last_used`, `updated_at` : timestamps

---

## Étape 3 : Tester la persistence

1. **Déconnecte-toi** de l'application
2. **Reconnecte-toi**
3. Va dans Nutrition et ouvre un repas
4. Tu devrais voir ton combo favori s'afficher dans les suggestions
5. Clique dessus pour l'appliquer
6. Retourne dans Supabase > `meal_combos`
7. Le `usage_count` devrait avoir augmenté de 1

---

## Étape 4 : Tester la suppression

1. Dans l'application, clique sur l'icône 🗑️ à côté d'un combo
2. Confirme la suppression
3. Va dans Supabase > `meal_combos`
4. Le combo devrait avoir disparu

---

## Structure de la table

```sql
CREATE TABLE meal_combos (
    id UUID PRIMARY KEY,           -- ID unique Supabase
    user_id UUID NOT NULL,         -- Référence à auth.users
    combo_id TEXT NOT NULL,        -- ID unique du combo (généré par l'app)
    name TEXT NOT NULL,            -- Nom du combo
    icon TEXT DEFAULT '⭐',        -- Émoji/icône
    foods JSONB NOT NULL,          -- Array JSON des aliments
    meal_types TEXT[] NOT NULL,    -- Types de repas (breakfast, lunch, etc.)
    usage_count INTEGER DEFAULT 1, -- Nombre d'utilisations
    created_at TIMESTAMPTZ,        -- Date de création
    last_used TIMESTAMPTZ,         -- Dernière utilisation
    updated_at TIMESTAMPTZ         -- Dernière mise à jour
);
```

### Exemple de données

```json
{
    "user_id": "abc123-...",
    "combo_id": "combo-1737820800000",
    "name": "Poulet + Riz + Légumes",
    "icon": "⭐",
    "foods": [
        { "foodId": "chicken-breast", "quantity": 150 },
        { "foodId": "rice-white", "quantity": 150 },
        { "foodId": "broccoli", "quantity": 100 }
    ],
    "meal_types": ["lunch", "dinner"],
    "usage_count": 5,
    "created_at": "2026-01-25T12:00:00Z",
    "last_used": "2026-01-25T19:30:00Z",
    "updated_at": "2026-01-25T19:30:00Z"
}
```

---

## Sécurité (RLS)

Les politiques de sécurité garantissent que :
- ✅ Chaque utilisateur ne voit que **ses propres combos**
- ✅ Impossible de modifier ou supprimer les combos d'un autre utilisateur
- ✅ Les données sont isolées par `user_id`

---

## Dépannage

### Erreur : "Table meal_combos non disponible"
→ Vérifie que tu as bien exécuté le SQL dans Supabase

### Les combos ne s'affichent pas après reconnexion
→ Ouvre la console (F12) et vérifie les logs : `📦 X combo(s) chargé(s)`
→ Si tu ne vois pas ce log, vérifie que le fichier `meal-templates.js` est bien chargé

### Erreur lors de la sauvegarde d'un combo
→ Vérifie que tu es connecté (`isLoggedIn() === true`)
→ Vérifie les logs console pour voir l'erreur exacte

---

## Prochaines étapes

Après avoir configuré cette table, tu peux passer à :
- ✅ **Feedback sync offline** (indicateur visuel de synchronisation)
- ✅ **Photos progression** (Supabase Storage pour les photos)
- ✅ **Graphiques Chart.js** (visualisation des progrès)
