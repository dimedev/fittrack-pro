# Tests FitTrack Pro

## Tests Basiques

Ce dossier contient les tests pour FitTrack Pro.

### Tests Manuels

- **basic.test.html** : Suite de tests HTML autonome qui teste les fonctions critiques de l'application
  - Initialisation du state
  - Queue offline
  - Périodisation
  - Sauvegarde/chargement localStorage
  - Validation des données
  - Structure des données (profile, foodJournal, sessionHistory)

### Lancer les tests

Ouvrir `basic.test.html` dans un navigateur :

```bash
# Depuis le dossier du projet
open tests/basic.test.html
# ou
firefox tests/basic.test.html
# ou
chrome tests/basic.test.html
```

### Résultats attendus

✅ Tous les tests devraient passer si l'application est correctement configurée.

### Ajouter de nouveaux tests

Pour ajouter un test, utilisez la syntaxe suivante dans `basic.test.html` :

```javascript
TestRunner.test('Nom du test', (t) => {
    // Assertions
    t.assertEqual(actual, expected, 'message');
    t.assertTrue(condition, 'message');
    t.assertFalse(condition, 'message');
    t.assertNotNull(value, 'message');
});
```

## Tests Futurs

Pour des tests plus avancés, considérer :

- **Jest** : Framework de test JavaScript complet
- **Cypress** : Tests end-to-end pour l'interface utilisateur
- **Vitest** : Alternative moderne à Jest
