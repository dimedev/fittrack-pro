# REPZY — Store Deployment Guide

Guide pratique pour livrer Repzy sur Play Store + App Store, et activer l'observabilité prod (Sentry + PostHog).

> Cible : passer du PWA local à un APK/AAB Android signé + un wrapper iOS Capacitor + monitoring d'erreurs en prod.

---

## 1. Observabilité — Sentry + PostHog

L'infra est déjà branchée dans `index.html` (lignes 59-114). Il suffit de remplacer 2 placeholders pour activer la collecte.

### 1.1 Sentry — error monitoring

**Objectif** : voir les exceptions JS prod sous 60 secondes.

1. Créer un compte sur https://sentry.io (plan free = 5k events/mois, suffisant en early access).
2. Créer un projet `JavaScript (Browser)` → noter le DSN format `https://abc123@o123.ingest.sentry.io/456`.
3. (Recommandé) Activer le **Loader Script** dans le projet Sentry → noter le `loader_id` (format `12-char hex`).
4. Dans `index.html` ligne 61-64, remplacer :
   ```js
   window.REPZY_CONFIG = {
       sentryDsn: 'https://VOTRE_DSN@oXXX.ingest.sentry.io/PROJECT_ID',
       sentryLoader: 'VOTRE_LOADER_ID',     // optionnel — chargement lazy via CDN
       posthogKey: '...'
   };
   ```
5. Vérification : ouvrir la console et lancer `throw new Error('test sentry')` → l'événement doit apparaître dans le dashboard Sentry sous 60s.

> **Privacy** : Sentry collecte stack traces + URL + user agent. Pas de PII utilisateur (le code n'envoie pas `setUser`). Conforme RGPD si serveur EU choisi à la création du projet.

### 1.2 PostHog — product analytics

**Objectif** : mesurer rétention, funnel onboarding, features les plus utilisées.

1. Créer un compte sur https://eu.posthog.com (région EU obligatoire pour RGPD).
2. Créer un projet → noter la `Project API key` format `phc_XXXXXXXX`.
3. Dans `index.html` ligne 61-64, remplacer :
   ```js
   posthogKey: 'phc_VOTRE_CLE'
   ```
4. Le snippet est déjà configuré avec :
   - `api_host: 'https://eu.i.posthog.com'` (région EU)
   - `autocapture: false` (pas de captation aveugle des clics)
   - `capture_pageview: true` (vues d'écran nav)
   - `disable_session_recording: true` (pas de session replay)
   - `person_profiles: 'identified_only'` (pas de profil anonyme)
5. Vérification : naviguer entre 3 onglets → `pageview` doit apparaître dans Live Events PostHog.

> **Privacy** : pas de session recording, pas de PII auto. Le code identifie l'utilisateur par email (ligne 92-94) uniquement après onboarding. Conforme RGPD.

### 1.3 Track events custom

L'helper `window.track(event, props)` est dispo globalement. Exemples à instrumenter :

```js
window.track('session_started', { program: 'GZCLP', day: 'A1' });
window.track('pr_unlocked', { exercise: 'Squat', weight: 100 });
window.track('milestone_reached', { id: 'bench-bw' });
```

---

## 2. Android — TWA (Trusted Web Activity) via Bubblewrap

**Objectif** : générer un AAB (Android App Bundle) signé pour Play Console, sans réécrire l'app.

### 2.1 Pré-requis

```bash
# Node 18+ requis
npm install -g @bubblewrap/cli

# JDK 17 + Android SDK installés (ou Bubblewrap les télécharge à la 1ère commande)
```

### 2.2 Initialisation

```bash
# Dans la racine du repo
bubblewrap init --manifest=https://repzy.app/webmanifest
```

Bubblewrap pose des questions interactives. Réponses recommandées :

| Question | Réponse |
|---|---|
| Application name | Repzy |
| Short name | Repzy |
| Application ID | app.repzy.android (ou com.repzy.android) |
| Display mode | standalone |
| Orientation | default |
| Status bar color | #0a0a0a |
| Splash screen background | #0a0a0a |
| Icon URL | https://repzy.app/web-app-manifest-512x512.png |
| Maskable icon URL | (idem) |
| Monochrome icon URL | (vide ou skip) |
| Include shortcuts | yes |
| Signing key path | ./android.keystore |
| Signing key alias | repzy |

### 2.3 Build

```bash
bubblewrap build
# génère: app-release-bundle.aab (à uploader Play Console) + app-release-signed.apk (test direct)

# Test sur device avant upload
bubblewrap install
```

### 2.4 Digital Asset Links

Pour qu'Android sache que `repzy.app` autorise le wrapper, il faut publier `assetlinks.json` :

```bash
# Bubblewrap te donne le contenu après build
cat .well-known/assetlinks.json
```

Puis publier sur **`https://repzy.app/.well-known/assetlinks.json`** (publiquement accessible, content-type `application/json`).

Vérifier : https://developers.google.com/digital-asset-links/tools/generator

---

## 3. iOS — Capacitor

**Objectif** : wrapper natif WKWebView pour App Store.

### 3.1 Pré-requis

```bash
npm install -g @capacitor/cli
# Mac avec Xcode 15+ requis
```

### 3.2 Initialisation

```bash
npm init @capacitor/app
# App ID: app.repzy.ios
# App name: Repzy

npm install @capacitor/core @capacitor/ios
npx cap add ios
npx cap copy
npx cap open ios
```

### 3.3 Config Capacitor

`capacitor.config.json` :

```json
{
  "appId": "app.repzy.ios",
  "appName": "Repzy",
  "webDir": ".",
  "server": {
    "url": "https://repzy.app",
    "cleartext": false
  },
  "ios": {
    "contentInset": "always",
    "scrollEnabled": true,
    "backgroundColor": "#0a0a0a"
  }
}
```

### 3.4 Build & sign

Dans Xcode :
- Signing & Capabilities → Team Apple Developer
- Bundle Identifier `app.repzy.ios`
- Increment build number à chaque submit
- Product → Archive → Upload to App Store Connect

---

## 4. Play Console — listing & submission

### 4.1 Prerequisites avant submit

- [x] Privacy policy URL : `https://repzy.app/privacy.html` (V6 ✓)
- [x] Manifest valide (V6 ✓)
- [x] AAB signé (Bubblewrap ✓)
- [x] Asset Links publiés (V10 ✓)
- [ ] Compte Play Console (25$ one-shot)

### 4.2 Store listing

| Champ | Valeur |
|---|---|
| Title | Repzy — Coach Musculation |
| Short description (80 chars) | Coach IA, programmes proven (5/3/1, GZCLP), tracking volume MEV/MAV/MRV. |
| Full description | (rédiger 4000 chars max — voir template ci-dessous) |
| Category | Health & Fitness |
| Tags | workout, gym, fitness, strength training, hypertrophy, coach |

**Template description longue** :

```
Repzy est un coach de musculation conçu pour les athlètes sérieux.

⚡ SAISIE ULTRA-RAPIDE EN SALLE
- Pavé numérique natif (poids/reps en 2 taps)
- Auto-fill des dernières valeurs
- Calculateur de plates intégré (60kg = 20+10+10)
- Rest timer flottant avec haptic à -10s, -5s, 0s

🧠 VRAI COACH (PAS DATA PORN)
- Volume hebdo par muscle vs MEV/MAV/MRV (méthode Israetel)
- Recovery radar par groupe musculaire
- Plateau detection contextuelle (RPE + volume + tempo)
- Périodisation auto (cycle 4 semaines + deload)

📋 PROGRAMMES PROVEN
- 5/3/1 BBB (Wendler)
- GZCLP, nSuns 5/3/1
- Stronglifts 5×5
- PPL Jeff Nippard 6 jours
- Upper/Lower 4 jours

📊 PROGRESSION QUANTIFIÉE
- Records 1RM estimés (Epley)
- Heatmap 365 jours
- Milestones intelligents (PR @ bodyweight, 10 semaines consec, etc.)
- Export CSV (séances, stats hebdo, nutrition)

🥗 NUTRITION INTÉGRÉE
- Tracking macros (P/G/L/C)
- Banque d'aliments + barcode scanner
- Recettes custom + meal templates

✨ DESIGN
Esthétique Pit Lane (cockpit F1) — couleurs vives, typographie tabular DM Mono pour les chiffres, motion soigneuse.

Offline-first. Sync Supabase EU.
```

### 4.3 Screenshots (obligatoires)

- 2-8 phone screenshots (1080×1920 ou 1080×2400)
- 1 feature graphic (1024×500)
- Icon 512×512 (déjà dans manifest)

À capturer prioritairement :
1. Dashboard Pit Lane avec insights
2. Session full-screen avec rest timer + plate calc
3. Programme library (6 programmes proven)
4. Volume hebdo MEV/MAV/MRV
5. Records / milestones
6. Nutrition logger

### 4.4 Content rating

Health & Fitness → tout à `No` sauf usage de l'appareil photo (barcode scanner) → score = **Everyone**.

---

## 5. App Store Connect — listing & submission

### 5.1 Prerequisites

- [ ] Compte Apple Developer (99$/an)
- [ ] Build uploaded via Xcode Archive
- [x] Privacy policy URL `https://repzy.app/privacy.html`
- [ ] App Privacy questionnaire rempli (data collected: email, usage analytics — pas de tracking cross-app)

### 5.2 Required metadata

Idem Play Store (title, description, keywords, screenshots) au format Apple :
- iPhone 6.7" screenshots (1290×2796) × 3-10
- iPhone 5.5" screenshots (1242×2208) × 3-10 (ou réutiliser 6.7" auto-scaled)
- iPad Pro 12.9" si supporté
- App Preview video (optionnel mais recommandé)

### 5.3 Review notes

Indiquer aux reviewers Apple :
- Compte test (créer via Supabase auth) avec email + mot de passe
- Demo data (au moins 4 semaines de séances pour montrer Volume + Recovery)

---

## 6. Checklist final ship

### Avant chaque release

- [ ] Bump `CACHE_VERSION` dans `sw.js` (ex `repzy-v1.3.1` → `repzy-v1.3.2`)
- [ ] Ajouter les nouveaux JS/CSS à `STATIC_ASSETS_RELATIVE` dans `sw.js`
- [ ] Bump `?v=N` dans `index.html` pour les fichiers modifiés
- [ ] Tester offline (DevTools → Network → Offline)
- [ ] Tester install PWA standalone
- [ ] Tester sur device réel (Android low-end + iPhone)
- [ ] Vérifier Sentry n'envoie pas d'erreur connue
- [ ] Vérifier PostHog reçoit bien les pageviews

### Avant Play Store submission

- [ ] AAB signé via Bubblewrap
- [ ] Asset Links publiés sur `repzy.app/.well-known/assetlinks.json`
- [ ] Screenshots × 6 minimum
- [ ] Description + short description rédigées
- [ ] Privacy policy URL accessible
- [ ] Content rating filled
- [ ] App Bundle uploadé en Internal testing track d'abord

### Avant App Store submission

- [ ] Archive Xcode signée
- [ ] App Privacy questionnaire complet
- [ ] Demo account créé pour reviewers
- [ ] Screenshots × 3 minimum (6.7")
- [ ] Privacy policy URL accessible
- [ ] Build uploadé via TestFlight d'abord

---

## 7. Annexe — fichiers clés

| Fichier | Rôle |
|---|---|
| `index.html:59-65` | Config Sentry + PostHog (placeholders à remplacer) |
| `index.html:75-101` | Init PostHog snippet |
| `index.html:103-114` | Init Sentry loader (lazy) |
| `js/app.js:9` | Lecture `SENTRY_DSN` depuis REPZY_CONFIG |
| `privacy.html` | Page RGPD (lien obligatoire stores) |
| `webmanifest` | PWA manifest (input pour Bubblewrap) |
| `sw.js` | Service worker, cache versioning |
| `robots.txt` | Bloque crawlers AI training |
| `sitemap.xml` | Indexation moteurs de recherche |

---

**Maintenu par** : équipe Repzy. Dernière révision : V10 (mai 2026).
