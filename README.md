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

L'application s'ouvre sur sa **page d'accueil**, organisée par format de fichier.

**Le menu latéral** (bouton ☰ en haut à gauche) liste les formats reconnus. Pour
l'instant il n'y en a qu'un, Markdown, avec le nombre de fichiers récents. Sur
un écran large (tablette, ordinateur) ce menu reste affiché en permanence.

**La page du format** affiche un bouton pour ouvrir un nouveau fichier, puis la
liste des **fichiers récents** : leur nom, quand tu les as ouverts et leur taille.
Un appui rouvre le fichier — même hors connexion, puisque son contenu est gardé
dans l'application. La croix à droite retire une ligne de la liste.

**La recherche** (bouton 🔍) fait deux choses selon l'écran où tu te trouves :

- **sur l'accueil**, elle filtre tes fichiers récents — par nom *et* par contenu.
  Chaque résultat affiche l'extrait où le mot apparaît. Appuyer dessus ouvre le
  fichier et la recherche se poursuit dedans, positionnée sur le mot.
- **dans un document**, elle surligne toutes les occurrences, affiche un compteur
  (« 3 / 12 ») et deux flèches pour passer d'une occurrence à l'autre. Le
  résultat courant est en violet plein. La touche Entrée passe au suivant,
  Maj+Entrée au précédent, Échap ferme. Sur ordinateur, Ctrl+F l'ouvre aussi.

La recherche ne tient pas compte des majuscules, mais elle est sensible aux
accents : « reunion » ne trouvera pas « réunion ».

**Deux formats sont reconnus**, listés dans le menu latéral :

- **Markdown** (`.md`, `.markdown`, `.txt`) — affiché mis en forme ;
- **HTML** (`.html`, `.htm`) — affiché mis en forme lui aussi, mais le bouton
  `< >` le **reconvertit en Markdown**. C'est le chemin inverse : un texte déjà
  mis en forme redevient du Markdown, avec ses `#`, ses `*`, ses listes et ses
  tableaux. « Copier tout » copie alors ce Markdown reconstruit.

Le format est deviné d'après l'extension du fichier : ouvrir un `.html` depuis
la page Markdown bascule tout seul sur le bon format.

**Coller du texte mis en forme** : sur la page HTML, le bouton *Coller du texte
mis en forme* ouvre un cadre. Colle dedans du texte copié depuis une page web ou
un traitement de texte : sa mise en forme est reconvertie en Markdown. Si tu
colles du texte simple, il est lu tel quel, sans conversion.

**Mise en forme ou texte d'origine** (bouton `< >` pendant la lecture) : par
défaut l'application *interprète* le Markdown — les `*` deviennent de l'italique
ou du gras, les `#` deviennent des titres, et ces marqueurs disparaissent de
l'affichage. Le bouton `< >` montre le fichier **tel qu'il est écrit**, marqueurs
compris, dans une police à chasse fixe. C'est cette vue qu'il faut utiliser pour
copier du texte et le recoller ailleurs sans rien perdre. Un bouton **Copier
tout** y copie le fichier entier en un geste. Ton choix est mémorisé : si tu
préfères toujours le texte brut, l'application s'ouvrira dessus.

**Copier du texte** : seul le texte du document est sélectionnable. La barre du
haut, le menu et les boutons ne le sont pas, ce qui évite que la sélection
déborde sur toute la page quand on tire la poignée au-delà du texte. « Tout
sélectionner » ne prend que le document, jamais l'habillage de l'application.

**Revenir à l'accueil** : la flèche ← en haut à gauche, ou le bouton *Retour*
d'Android (qui ferme aussi le menu latéral s'il est ouvert).

**Depuis ton gestionnaire de fichiers** : appui long sur un fichier `.md` →
**Partager** → **AppArq**. Le document s'ouvre directement.

**Les autres boutons de la barre du haut :**

| Bouton | Effet |
| --- | --- |
| ☰ | Ouvrir le menu des formats (sur l'accueil) |
| ← | Revenir à la page d'accueil (pendant la lecture) |
| 🔍 | Rechercher : dans les fichiers sur l'accueil, dans le texte pendant la lecture |
| `< >` | Basculer entre mise en forme et texte d'origine (pendant la lecture) |
| 📁 | Ouvrir un fichier (sur l'accueil) |
| A− / A+ | Réduire ou agrandir le texte (mémorisé) |
| 🌗 | Basculer entre thème automatique, clair et sombre |

Les 15 derniers fichiers restent proposés sur l'accueil, même après avoir fermé
l'application. Les contenus sont gardés jusqu'à environ 2 Mo au total : au-delà,
les plus anciens sont oubliés et leur ligne indique « à rouvrir ».

### Ce que l'application sait afficher

Titres, **gras**, *italique*, listes, listes de tâches (`- [x]`), tableaux,
citations, blocs de code, liens, images, traits de séparation — la syntaxe
Markdown standard (GitHub Flavored Markdown).

---

## 3. Ce qu'il y a dans le dépôt

| Fichier | À quoi il sert |
| --- | --- |
| `index.html` | La structure : barre du haut, menu latéral, accueil, document |
| `style.css` | L'apparence : couleurs, tailles, espacements |
| `app.js` | Le fonctionnement : ouvrir un fichier, l'afficher, les réglages |
| `sw.js` | Le *service worker* : mode hors connexion + réception des fichiers partagés |
| `manifest.webmanifest` | La carte d'identité de l'app (nom, icône, couleurs) |
| `icons/` | Le logo « AA », aux différentes tailles attendues par Android |
| `icons/logo.svg` | Le logo « AA » en vectoriel, source de toutes les icônes |
| `tools/make_logo.py` | Construit `logo.svg` à partir d'une dizaine de mesures |
| `tools/rasterise-logo.js` | Produit les PNG aux tailles attendues par Android |
| `vendor/` | Trois bibliothèques externes, copiées ici pour marcher hors connexion |

**Les bibliothèques utilisées :**
[marked](https://github.com/markedjs/marked) transforme le Markdown en HTML,
[Turndown](https://github.com/mixmark-io/turndown) fait le chemin inverse
(HTML vers Markdown), et [DOMPurify](https://github.com/cure53/DOMPurify)
nettoie le HTML pour qu'un fichier piégé ne puisse rien exécuter. Leurs licences
sont dans `vendor/`.

---

## 4. Modifier l'application

Tu peux tout changer directement sur GitHub (crayon ✏️ en haut d'un fichier) :
la modification est publiée automatiquement en une minute environ.

Quelques exemples faciles pour commencer :

- **Changer la couleur** : dans `style.css`, les lignes `--accent` (les boutons)
  et `--link` (les liens), tout en haut.
- **Retoucher le logo** : tout est dans les réglages en haut de
  `tools/make_logo.py` — les violets (`VIOLET_CLAIR`, `VIOLET`, `VIOLET_FONCE`),
  le fond (`FOND_1`, `FOND_2`), l'épaisseur des jambes (`EP_JAMBE`), la largeur
  du montant central (`EP_MONT`), la hauteur de la barre du A (`BARRE`) ou son
  galbe (`GALBE_2`). Puis `python3 tools/make_logo.py` pour refaire le SVG, et
  `node tools/rasterise-logo.js` pour refaire les PNG.
- **Changer le nom affiché** : dans `manifest.webmanifest`, les champs `name` et `short_name`.
- **Changer la taille de texte par défaut** : dans `app.js`, le `|| 17` de la ligne
  `var taille = parseInt(...) || 17;`.
- **Ajouter un format de fichier** : tout est prévu pour. En haut de `app.js`, la
  liste `FORMATS` décrit chaque format : son nom, sa pastille, les extensions
  acceptées, la fonction `rendu` (fichier → affichage mis en forme) et la
  fonction `source` (ce que montre le bouton `< >`, avec sa mention). Ajoute une
  entrée, ajoute sa clé dans `ORDRE`, et le menu latéral, la page d'accueil,
  l'historique et la détection par extension s'adaptent tout seuls.

> ⚠️ **Après chaque modification de `style.css` ou `app.js`**, change le numéro
> de version à deux endroits, sinon ton téléphone continuera d'afficher
> l'ancienne version gardée en mémoire :
>
> 1. dans `index.html` : `style.css?v=9` → `style.css?v=10` (et pareil pour `app.js`) ;
> 2. dans `sw.js` : `var VERSION = 'v10';` → `'v11'`.
>
> C'est le `?v=` qui oblige le navigateur à retélécharger le fichier : pour lui,
> `style.css?v=10` est une adresse qu'il n'a jamais vue.

### Essayer sur un ordinateur

Dans le dossier du projet :

```bash
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000` dans un navigateur.

---

## 5. Idées pour la suite

- Un sommaire cliquable pour les longs documents
- Une recherche insensible aux accents
- Un mode édition, pour écrire du Markdown et pas seulement le lire
- Transformer la PWA en vrai fichier `.apk` (avec PWABuilder ou Capacitor)
