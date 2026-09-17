/* ---------------------------------------------------------------
   AppArq — logique de l'application
   L'application a deux ecrans :
     - l'accueil (data-vue="accueil" sur <body>)
     - le document affiche (data-vue="doc")
   Tout tient dans ce fichier, commente pour rester lisible.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };

  var elDoc      = $('#doc');
  var elTitle    = $('#doc-title');
  var elInput    = $('#file-input');
  var elProgress = $('#progress');
  var elToTop    = $('#to-top');
  var elToast    = $('#toast');
  var elReprise  = $('#carte-reprise');
  var elRepriseN = $('#reprise-nom');

  var STORE = {
    last:  'apparq:dernier-document',
    size:  'apparq:taille-texte',
    theme: 'apparq:theme'
  };

  // localStorage peut echouer (navigation privee, stockage bloque) :
  // on l'enveloppe pour que l'app continue de marcher dans tous les cas.
  function lire(cle) {
    try { return localStorage.getItem(cle); } catch (e) { return null; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, valeur); return true; } catch (e) { return false; }
  }
  function effacer(cle) {
    try { localStorage.removeItem(cle); } catch (e) {}
  }

  var toastTimer;
  function toast(message) {
    elToast.textContent = message;
    elToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elToast.hidden = true; }, 3200);
  }

  /* ----------------------------------------------------------- */
  /* 1. Passer d'un ecran a l'autre                              */
  /* ----------------------------------------------------------- */

  function vueActuelle() { return document.body.dataset.vue; }

  function allerAccueil() {
    document.body.dataset.vue = 'accueil';
    elTitle.textContent = 'AppArq';
    document.title = 'AppArq — Lecteur Markdown';
    majCarteReprise();
    window.scrollTo(0, 0);
    majProgression();
  }

  // Affiche la carte "Reprendre la lecture" si un document a deja ete lu.
  function majCarteReprise() {
    var d = dernierDocument();
    if (d) {
      elRepriseN.textContent = d.nom || 'Document';
      elReprise.hidden = false;
    } else {
      elReprise.hidden = true;
    }
  }

  function dernierDocument() {
    var brut = lire(STORE.last);
    if (!brut) return null;
    try {
      var d = JSON.parse(brut);
      return (d && typeof d.texte === 'string') ? d : null;
    } catch (e) {
      effacer(STORE.last);
      return null;
    }
  }

  /* ----------------------------------------------------------- */
  /* 2. Affichage du Markdown                                    */
  /* ----------------------------------------------------------- */

  marked.use({ gfm: true, breaks: false });

  function afficher(texte, nomFichier) {
    var html;
    try {
      html = marked.parse(texte);
    } catch (e) {
      toast("Ce fichier n'a pas pu être lu comme du Markdown.");
      return;
    }

    // DOMPurify retire tout code potentiellement dangereux du HTML produit.
    elDoc.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

    // Les liens s'ouvrent dans un nouvel onglet.
    elDoc.querySelectorAll('a[href]').forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    // Les tableaux larges deviennent defilables horizontalement.
    elDoc.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    // On empile une etape d'historique : le bouton Retour d'Android
    // ramene alors a l'accueil au lieu de fermer l'application.
    if (vueActuelle() !== 'doc') {
      history.pushState({ vue: 'doc' }, '');
    }

    document.body.dataset.vue = 'doc';
    elTitle.textContent = nomFichier || 'Document';
    document.title = (nomFichier || 'Document') + ' — AppArq';
    window.scrollTo(0, 0);
    majProgression();
  }

  // Memorise le document pour pouvoir le reprendre depuis l'accueil.
  function memoriser(texte, nom) {
    if (texte.length > 1500000) return;           // trop gros : on ne stocke pas
    ecrire(STORE.last, JSON.stringify({ nom: nom, texte: texte }));
  }

  function ouvrirFichier(file) {
    if (!file) return;
    var nom = file.name || 'Document';
    var lecture = file.text
      ? file.text()
      : new Promise(function (resolve, reject) {      // secours navigateurs anciens
          var fr = new FileReader();
          fr.onload = function () { resolve(String(fr.result)); };
          fr.onerror = function () { reject(fr.error); };
          fr.readAsText(file);
        });

    lecture.then(function (texte) {
      afficher(texte, nom);
      memoriser(texte, nom);
    }).catch(function () {
      toast("Impossible de lire ce fichier.");
    });
  }

  /* ----------------------------------------------------------- */
  /* 3. Boutons                                                  */
  /* ----------------------------------------------------------- */

  function choisirFichier() { elInput.click(); }

  $('#btn-open').addEventListener('click', choisirFichier);
  $('#btn-open-big').addEventListener('click', choisirFichier);

  elInput.addEventListener('change', function () {
    ouvrirFichier(elInput.files && elInput.files[0]);
    elInput.value = '';        // permet de rouvrir deux fois le meme fichier
  });

  // Carte "Reprendre la lecture"
  elReprise.addEventListener('click', function () {
    var d = dernierDocument();
    if (d) afficher(d.texte, d.nom);
  });

  // Fleche retour de la barre du haut
  $('#btn-home').addEventListener('click', function () {
    if (history.state && history.state.vue === 'doc') history.back();
    else allerAccueil();
  });

  // Bouton Retour d'Android (et retour arriere du navigateur)
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.vue === 'doc') document.body.dataset.vue = 'doc';
    else allerAccueil();
  });

  // Taille du texte (de 14 a 26 pixels).
  var taille = parseInt(lire(STORE.size), 10) || 17;
  function appliquerTaille() {
    taille = Math.min(26, Math.max(14, taille));
    document.documentElement.style.setProperty('--reading-size', taille + 'px');
    ecrire(STORE.size, String(taille));
  }
  appliquerTaille();
  $('#btn-bigger').addEventListener('click', function () { taille += 1; appliquerTaille(); toast('Texte : ' + taille + ' px'); });
  $('#btn-smaller').addEventListener('click', function () { taille -= 1; appliquerTaille(); toast('Texte : ' + taille + ' px'); });

  // Theme : automatique -> clair -> sombre -> automatique ...
  var THEMES = ['auto', 'light', 'dark'];
  var NOMS   = { auto: 'Thème : automatique', light: 'Thème : clair', dark: 'Thème : sombre' };
  var theme  = lire(STORE.theme) || 'auto';
  function appliquerTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    ecrire(STORE.theme, theme);
  }
  appliquerTheme();
  $('#btn-theme').addEventListener('click', function () {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    appliquerTheme();
    toast(NOMS[theme]);
  });

  /* ----------------------------------------------------------- */
  /* 4. Confort de lecture                                       */
  /* ----------------------------------------------------------- */

  function majProgression() {
    var enLecture = vueActuelle() === 'doc';
    var hauteur = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = (enLecture && hauteur > 0) ? window.scrollY / hauteur : 0;
    elProgress.style.width = (ratio * 100).toFixed(1) + '%';
    elToTop.hidden = !enLecture || window.scrollY < 600;
  }
  window.addEventListener('scroll', majProgression, { passive: true });
  window.addEventListener('resize', majProgression);

  elToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Glisser-deposer (utile sur ordinateur).
  ['dragenter', 'dragover'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      e.preventDefault();
      document.body.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      e.preventDefault();
      document.body.classList.remove('dragging');
      if (type === 'drop' && e.dataTransfer && e.dataTransfer.files.length) {
        ouvrirFichier(e.dataTransfer.files[0]);
      }
    });
  });

  /* ----------------------------------------------------------- */
  /* 5. Fichier recu par "Partager" depuis Android               */
  /* ----------------------------------------------------------- */

  function recupererPartage() {
    if (!('caches' in window)) return Promise.resolve(false);
    var cle = new URL('__partage__', location.href).href;
    return caches.open('apparq-partage').then(function (cache) {
      return cache.match(cle).then(function (reponse) {
        if (!reponse) return false;
        return reponse.json().then(function (donnees) {
          cache.delete(cle);
          memoriser(donnees.texte, donnees.nom);
          afficher(donnees.texte, donnees.nom);
          return true;
        });
      });
    }).catch(function () { return false; });
  }

  /* ----------------------------------------------------------- */
  /* 6. Demarrage                                                */
  /* ----------------------------------------------------------- */

  function demarrer() {
    var params = new URLSearchParams(location.search);
    var vientDuPartage = params.has('partage');
    if (vientDuPartage) {
      history.replaceState(null, '', location.pathname);   // nettoie l'adresse
    }
    history.replaceState({ vue: 'accueil' }, '');

    // On commence toujours par l'accueil...
    allerAccueil();

    // ...sauf si un fichier vient d'etre partage depuis une autre application.
    recupererPartage().then(function (ok) {
      if (!ok && vientDuPartage) {
        toast("Le fichier partagé n'a pas pu être récupéré.");
      }
    });
  }

  demarrer();

  // L'etape 3 de l'aide ne sert que tant que l'app n'est pas installee.
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    var aide = $('#aide-installer');
    if (aide) aide.hidden = false;
  }

  /* ----------------------------------------------------------- */
  /* 7. Service worker (fonctionnement hors connexion)           */
  /* ----------------------------------------------------------- */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function () {
        /* pas bloquant : l'app marche, simplement pas hors connexion */
      });
    });
  }
})();
