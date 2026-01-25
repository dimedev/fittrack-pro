# Configuration Photos de Progression

## Étape 1 : Bucket Storage (DÉJÀ FAIT ✅)

Tu as déjà créé le bucket `progress-photos` avec :
- Public : Non
- File size limit : configuré
- MIME types : configurés

## Étape 2 : Créer la table et les policies

1. Ouvre ton dashboard Supabase : https://supabase.com/dashboard
2. Sélectionne ton projet
3. Va dans **SQL Editor**
4. Copie-colle le contenu du fichier [`progress_photos_table.sql`](progress_photos_table.sql)
5. Clique sur **Run**

### Ce qui sera créé :

**Table `progress_photos` :**
- `id` : UUID unique
- `user_id` : Référence à l'utilisateur
- `photo_path` : Chemin dans Storage
- `photo_url` : URL signée (valide 1 an)
- `taken_at` : Date de la photo
- `weight` : Poids (optionnel)
- `body_fat` : % masse grasse (optionnel)
- `pose` : Type de pose (front, side, back)
- `notes` : Notes (optionnel)

**Policies RLS (Row Level Security) :**
- SELECT, INSERT, UPDATE, DELETE pour ses propres photos

**Policies Storage :**
- Upload dans son propre dossier (`{user_id}/...`)
- Lecture de ses propres photos
- Suppression de ses propres photos

---

## Étape 3 : Tester

1. Connecte-toi à l'application
2. Va dans **Progression**
3. Clique sur **📸 Ajouter une photo**
4. Sélectionne une photo
5. Choisis la pose (Face, Profil, Dos)
6. Remplis les infos (date, poids, notes)
7. Clique sur **Enregistrer**

### Vérifier dans Supabase

**Storage > progress-photos :**
- Tu devrais voir un dossier avec ton `user_id`
- À l'intérieur, ton fichier `.jpg`

**Table Editor > progress_photos :**
- Une ligne avec les métadonnées de ta photo

---

## Structure des fichiers Storage

```
progress-photos/
└── {user_id}/
    ├── 2026-01-25_front_1737820800000.jpg
    ├── 2026-01-25_side_1737820850000.jpg
    └── 2026-01-28_front_1738060800000.jpg
```

---

## Fonctionnalités

### Galerie de photos
- Timeline groupée par date
- Affichage du poids pour chaque date
- Badges de pose (Face, Profil, Dos)

### Viewer de photo
- Affichage plein écran
- Détails (date, poids, masse grasse, notes)
- Suppression

### Comparaison Avant/Après
- Slider interactif
- Sélection des dates
- Affichage de la différence de poids

### Compression automatique
- Images redimensionnées à max 1200px
- Compression JPEG 80%
- Réduction significative de la taille

---

## Dépannage

### Erreur "Non connecté"
→ Connecte-toi d'abord à l'application

### Erreur "Échec upload"
→ Vérifie que le bucket `progress-photos` existe
→ Vérifie les policies Storage (exécute le SQL)

### Photos qui ne s'affichent pas
→ Les URLs signées expirent après 1 an
→ Vérifie dans la console : `state.progressPhotos`

### "Table progress_photos non disponible"
→ Exécute le SQL dans Supabase SQL Editor

---

## Achievements liés

Les photos débloquent des achievements :
- 🏅 **Première photo** : Ajouter 1 photo
- 🏅 **10 photos** : Documenter avec 10 photos
- 🏅 **Transformation** : Photos sur 3 mois

---

## Prochaines améliorations possibles

1. **Annotations** : Dessiner sur les photos pour marquer les changements
2. **Timelapse** : Générer une vidéo de progression
3. **AI Analysis** : Estimation automatique du body fat
4. **Partage** : Partager sur les réseaux sociaux
5. **Export PDF** : Rapport de progression avec photos
