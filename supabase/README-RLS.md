# RLS (Row Level Security) — Déploiement Supabase

Les politiques RLS garantissent que chaque utilisateur ne peut accéder qu’à ses propres données.

## Appliquer les politiques

1. Ouvrez le **Supabase Dashboard** de votre projet.
2. Allez dans **SQL Editor**.
3. Ouvrez le fichier [`rls-main-tables.sql`](./rls-main-tables.sql) (ou copiez son contenu).
4. Collez le script dans l’éditeur SQL.
5. Cliquez sur **Run**.

Le script est idempotent : vous pouvez l’exécuter plusieurs fois sans erreur (il utilise `DROP POLICY IF EXISTS` puis `CREATE POLICY`).

## Tables concernées

- `workout_sessions`
- `progress_log`
- `food_journal`
- `cardio_sessions`
- `custom_foods`
- `user_settings` (si la table existe)

## Vérification

Après exécution, dans **Database → Tables** : chaque table listée doit avoir la colonne "RLS" à **Enabled**.

## Prérequis

- Les tables doivent exister et avoir une colonne `user_id` (type `uuid`) référençant `auth.uid()`.
- L’authentification Supabase Auth doit être activée.
