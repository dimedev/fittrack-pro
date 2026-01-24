# Templates Email REPZY pour Supabase

Ces templates sont à copier dans le dashboard Supabase :
**Authentication > Email Templates**

---

## 1. Email de Confirmation (Confirm signup)

**Subject:** Confirmez votre compte REPZY

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmez votre compte REPZY</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.03em; color: #ffffff;">
                REP<span style="color: #ff0000;">ZY</span>
              </h1>
            </td>
          </tr>
          
          <!-- Card -->
          <tr>
            <td style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 16px; padding: 40px 32px;">
              
              <!-- Icon -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px; line-height: 64px;">✓</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Title -->
              <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #fafafa; text-align: center;">
                Bienvenue sur REPZY
              </h2>
              
              <!-- Subtitle -->
              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #a1a1a1; text-align: center;">
                Plus qu'une étape pour activer votre compte et commencer votre transformation.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; padding: 16px 32px; background-color: #ff0000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background-color 0.2s;">
                      Confirmer mon compte
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expire notice -->
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252; text-align: center;">
                Ce lien expire dans 24 heures
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #525252; text-align: center;">
                Si vous n'avez pas créé de compte REPZY, ignorez cet email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #404040; text-align: center;">
                © 2024 REPZY. Tous droits réservés.
              </p>
            </td>
          </tr>
          
          <!-- Fallback link -->
          <tr>
            <td style="padding-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: #404040; text-align: center; word-break: break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="{{ .ConfirmationURL }}" style="color: #a1a1a1;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Email de Réinitialisation (Reset password)

**Subject:** Réinitialisez votre mot de passe REPZY

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisez votre mot de passe REPZY</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.03em; color: #ffffff;">
                REP<span style="color: #ff0000;">ZY</span>
              </h1>
            </td>
          </tr>
          
          <!-- Card -->
          <tr>
            <td style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 16px; padding: 40px 32px;">
              
              <!-- Icon -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #262626 0%, #171717 100%); border: 1px solid #404040; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px; line-height: 64px;">🔐</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Title -->
              <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #fafafa; text-align: center;">
                Réinitialisation du mot de passe
              </h2>
              
              <!-- Subtitle -->
              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #a1a1a1; text-align: center;">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; padding: 16px 32px; background-color: #ff0000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expire notice -->
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252; text-align: center;">
                Ce lien expire dans 1 heure
              </p>
              
              <!-- Security notice -->
              <div style="margin-top: 24px; padding: 16px; background-color: #111111; border-radius: 8px; border-left: 3px solid #f59e0b;">
                <p style="margin: 0; font-size: 13px; color: #a1a1a1; line-height: 1.5;">
                  <strong style="color: #f59e0b;">⚠️ Sécurité</strong><br>
                  Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #525252; text-align: center;">
                Besoin d'aide ? Contactez notre support.
              </p>
              <p style="margin: 0; font-size: 12px; color: #404040; text-align: center;">
                © 2024 REPZY. Tous droits réservés.
              </p>
            </td>
          </tr>
          
          <!-- Fallback link -->
          <tr>
            <td style="padding-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: #404040; text-align: center; word-break: break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="{{ .ConfirmationURL }}" style="color: #a1a1a1;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Email Magic Link (optionnel)

**Subject:** Votre lien de connexion REPZY

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre lien de connexion REPZY</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.03em; color: #ffffff;">
                REP<span style="color: #ff0000;">ZY</span>
              </h1>
            </td>
          </tr>
          
          <!-- Card -->
          <tr>
            <td style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 16px; padding: 40px 32px;">
              
              <!-- Icon -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px; line-height: 64px;">🔗</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Title -->
              <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #fafafa; text-align: center;">
                Connexion rapide
              </h2>
              
              <!-- Subtitle -->
              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #a1a1a1; text-align: center;">
                Cliquez sur le bouton ci-dessous pour vous connecter instantanément à votre compte REPZY.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; padding: 16px 32px; background-color: #ff0000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Se connecter
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expire notice -->
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252; text-align: center;">
                Ce lien expire dans 1 heure et ne peut être utilisé qu'une fois
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #525252; text-align: center;">
                Si vous n'avez pas demandé ce lien, ignorez cet email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #404040; text-align: center;">
                © 2024 REPZY. Tous droits réservés.
              </p>
            </td>
          </tr>
          
          <!-- Fallback link -->
          <tr>
            <td style="padding-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: #404040; text-align: center; word-break: break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="{{ .ConfirmationURL }}" style="color: #a1a1a1;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Configuration Supabase

### Étapes pour configurer les templates :

1. Aller dans **Supabase Dashboard** > **Authentication** > **Email Templates**

2. Pour chaque template :
   - **Confirm signup** : Coller le template 1
   - **Reset password** : Coller le template 2
   - **Magic link** : Coller le template 3 (optionnel)

3. Configurer les **Redirect URLs** dans **Authentication** > **URL Configuration** :
   - Site URL : `https://repzy.app`
   - Redirect URLs :
     - `https://repzy.app/auth/callback/`
     - `https://repzy.app/auth/update-password/`

4. Personnaliser le **Sender name** dans **Project Settings** > **Auth** :
   - Sender name : `REPZY`

---

## Preview des templates

Les templates sont optimisés pour :
- ✅ Dark mode premium
- ✅ Mobile responsive  
- ✅ Clients email majeurs (Gmail, Outlook, Apple Mail)
- ✅ Fallback pour les clients qui bloquent les images
- ✅ Accessibilité (contraste, taille de police)
