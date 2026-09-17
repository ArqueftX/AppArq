# AppArq — lecteur de fichiers Markdown pour Android

Une petite application qui affiche joliment tes fichiers `.md` sur ton téléphone.
Elle s'installe sur l'écran d'accueil, fonctionne **sans connexion**, et ne
transmet **aucun fichier sur Internet** : tout est lu sur ton appareil.

---

## 1. Comment la mettre sur ton téléphone

### Étape 1 — publier l'application (à faire une seule fois, sur ordinateur ou téléphone)

1. Va sur la page **Settings** du dépôt, puis dans la section **Pages**
   (adresse directe : `https://github.com/ArqueftX/<nom-du-depot>/settings/pages`).
2. Sous **Build and deployment → Source**, choisis **Deploy from a branch**.
3. Sous **Branch**, choisis la branche qui contient ce code, dossier `/ (root)`,
   puis clique **Save**.
4. Attends 1 à 2 minutes. GitHub affiche alors l'adresse de ton application, du type :
   `https://arqueftx.github.io/<nom-du-depot>/`

### Étape 2 — installer l'application

1. Ouvre cette adresse avec **Chrome** sur ton téléphone Android.
2. Menu **⋮** (en haut à droite) → **Ajouter à l'écran d'accueil** (ou *Installer l'application*).
3. Une icône **AppArq** apparaît avec tes autres applications. Voilà, c'est fini.

> Une fois installée, elle s'ouvre en plein écran, sans barre d'adresse,
> et continue de marcher en mode avion.

---

## 2. Comment s'en servir

**Ouvrir un fichier** : appuie sur *Ouvrir un fichier .md* (ou l'icône dossier en haut),
puis choisis ton fichier dans la fenêtre Android.

**Depuis ton gestionnaire de fichiers** : appui long sur un fichier `.md` →
**Partager** → **AppArq**. Le document s'ouvre directement.

**Les autres boutons de la barre du haut :**

| Bouton | Effet |
| --- | --- |
| 📁 | Ouvrir un autre fichier |
| A− / A+ | Réduire ou agrandir le texte (mémorisé) |
| 🌗 | Basculer entre thème automatique, clair et sombre |

Le dernier document lu est réaffiché automatiquement à la réouverture de l'app.

### Ce que l'application sait afficher

Titres, **gras**, *italique*, listes, listes de tâches (`- [x]`), tableaux,
citations, blocs de code, liens, images, traits de séparation — la syntaxe
Markdown standard (GitHub Flavored Markdown).

---

## 3. Ce qu'il y a dans le dépôt

| Fichier | À quoi il sert |
| --- | --- |
| `index.html` | La structure de la page (les boutons, les zones de texte) |
| `style.css` | L'apparence : couleurs, tailles, espacements |
| `app.js` | Le fonctionnement : ouvrir un fichier, l'afficher, les réglages |
| `sw.js` | Le *service worker* : mode hors connexion + réception des fichiers partagés |
| `manifest.webmanifest` | La carte d'identité de l'app (nom, icône, couleurs) |
| `icons/` | Les icônes affichées sur l'écran d'accueil |
| `tools/make_icons.py` | Regénère les icônes (`python3 tools/make_icons.py`) |
| `vendor/` | Deux bibliothèques externes, copiées ici pour marcher hors connexion |

**Les bibliothèques utilisées :**
[marked](https://github.com/markedjs/marked) transforme le Markdown en HTML, et
[DOMPurify](https://github.com/cure53/DOMPurify) nettoie ce HTML pour qu'un
fichier piégé ne puisse rien exécuter. Leurs licences sont dans `vendor/`.

---

## 4. Modifier l'application

Tu peux tout changer directement sur GitHub (crayon ✏️ en haut d'un fichier) :
la modification est publiée automatiquement en une minute environ.

Quelques exemples faciles pour commencer :

- **Changer la couleur** : dans `style.css`, la ligne `--accent: #4f7cff;` tout en haut.
  Mets n'importe quel code couleur, par exemple `#22a06b` pour du vert. Pour que
  l'icône suive, change aussi `BG` dans `tools/make_icons.py`.
- **Changer le nom affiché** : dans `manifest.webmanifest`, les champs `name` et `short_name`.
- **Changer la taille de texte par défaut** : dans `app.js`, le `|| 17` de la ligne
  `var taille = parseInt(...) || 17;`.

> ⚠️ Après avoir modifié un fichier, incrémente `VERSION` dans `sw.js`
> (`'v1'` → `'v2'`, etc.). Sans ça, ton téléphone continuera d'afficher
> l'ancienne version gardée en mémoire.

### Essayer sur un ordinateur

Dans le dossier du projet :

```bash
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000` dans un navigateur.

---

## 5. Idées pour la suite

- Une bibliothèque de documents (garder plusieurs fichiers dans l'app)
- Un sommaire cliquable pour les longs documents
- Une recherche dans le document
- Un mode édition, pour écrire du Markdown et pas seulement le lire
- Transformer la PWA en vrai fichier `.apk` (avec PWABuilder ou Capacitor)
