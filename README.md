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

L'application s'ouvre sur sa **page d'accueil** : le logo, un bouton pour ouvrir un
fichier, et une carte **Reprendre la lecture** qui rouvre le dernier document lu.

**Ouvrir un fichier** : appuie sur *Ouvrir un fichier .md* (ou l'icône dossier en haut),
puis choisis ton fichier dans la fenêtre Android.

**Revenir à l'accueil** : la flèche ← en haut à gauche, ou le bouton *Retour* d'Android.

**Depuis ton gestionnaire de fichiers** : appui long sur un fichier `.md` →
**Partager** → **AppArq**. Le document s'ouvre directement.

**Les autres boutons de la barre du haut :**

| Bouton | Effet |
| --- | --- |
| ← | Revenir à la page d'accueil (visible pendant la lecture) |
| 📁 | Ouvrir un autre fichier |
| A− / A+ | Réduire ou agrandir le texte (mémorisé) |
| 🌗 | Basculer entre thème automatique, clair et sombre |

Le dernier document lu reste proposé sur l'accueil, même après avoir fermé l'application.

### Ce que l'application sait afficher

Titres, **gras**, *italique*, listes, listes de tâches (`- [x]`), tableaux,
citations, blocs de code, liens, images, traits de séparation — la syntaxe
Markdown standard (GitHub Flavored Markdown).

---

## 3. Ce qu'il y a dans le dépôt

| Fichier | À quoi il sert |
| --- | --- |
| `index.html` | La structure des deux écrans : l'accueil et le document |
| `style.css` | L'apparence : couleurs, tailles, espacements |
| `app.js` | Le fonctionnement : ouvrir un fichier, l'afficher, les réglages |
| `sw.js` | Le *service worker* : mode hors connexion + réception des fichiers partagés |
| `manifest.webmanifest` | La carte d'identité de l'app (nom, icône, couleurs) |
| `icons/` | Le logo « AA », aux différentes tailles attendues par Android |
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

- **Changer la couleur** : dans `style.css`, les lignes `--accent` (les boutons)
  et `--link` (les liens), tout en haut. Pour que l'icône suive, change `BG`
  (le fond), `FG` et `FG2` (les deux A) dans `tools/make_icons.py`, puis relance
  `python3 tools/make_icons.py`.
- **Changer le nom affiché** : dans `manifest.webmanifest`, les champs `name` et `short_name`.
- **Changer la taille de texte par défaut** : dans `app.js`, le `|| 17` de la ligne
  `var taille = parseInt(...) || 17;`.

> ⚠️ **Après chaque modification de `style.css` ou `app.js`**, change le numéro
> de version à deux endroits, sinon ton téléphone continuera d'afficher
> l'ancienne version gardée en mémoire :
>
> 1. dans `index.html` : `style.css?v=4` → `style.css?v=5` (et pareil pour `app.js`) ;
> 2. dans `sw.js` : `var VERSION = 'v4';` → `'v5'`.
>
> C'est le `?v=` qui oblige le navigateur à retélécharger le fichier : pour lui,
> `style.css?v=5` est une adresse qu'il n'a jamais vue.

### Essayer sur un ordinateur

Dans le dossier du projet :

```bash
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000` dans un navigateur.

---

## 5. Idées pour la suite

- Une bibliothèque de documents sur l'accueil (garder plusieurs fichiers, pas seulement le dernier)
- Un sommaire cliquable pour les longs documents
- Une recherche dans le document
- Un mode édition, pour écrire du Markdown et pas seulement le lire
- Transformer la PWA en vrai fichier `.apk` (avec PWABuilder ou Capacitor)
