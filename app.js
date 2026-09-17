/* ---------------------------------------------------------------
   AppArq — logique de l'application
   Tout tient dans ce fichier. Il est commente pour etre lisible
   meme quand on debute.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  // Raccourci : $('#id') renvoie l'element correspondant.
  var $ = function (sel) { return document.querySelector(sel); };

  var elDoc      = $('#doc');
  var elWelcome  = $('#welcome');
  var elTitle    = $('#doc-title');
  var elInput    = $('#file-input');
  var elProgress = $('#progress');
  var elToTop    = $('#to-top');
  var elToast    = $('#toast');

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
  /* 1. Affichage du Markdown                                    */
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

    elDoc.hidden = false;
    elWelcome.hidden = true;
    elTitle.textContent = nomFichier || 'Document';
    document.title = (nomFichier || 'Document') + ' — AppArq';
    window.scrollTo(0, 0);
    majProgression();
  }

  // Memorise le document pour le retrouver a la prochaine ouverture.
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
  /* 2. Boutons                                                  */
  /* ----------------------------------------------------------- */

  function choisirFichier() { elInput.click(); }

  $('#btn-open').addEventListener('click', choisirFichier);
  $('#btn-open-big').addEventListener('click', choisirFichier);

  elInput.addEventListener('change', function () {
    ouvrirFichier(elInput.files && elInput.files[0]);
    elInput.value = '';        // permet de rouvrir deux fois le meme fichier
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
  /* 3. Confort de lecture                                       */
  /* ----------------------------------------------------------- */

  function majProgression() {
    var hauteur = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = hauteur > 0 ? window.scrollY / hauteur : 0;
    elProgress.style.width = (ratio * 100).toFixed(1) + '%';
    elToTop.hidden = elDoc.hidden || window.scrollY < 600;
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
  /* 4. Fichier recu par "Partager" depuis Android               */
  /* ----------------------------------------------------------- */

  function recupererPartage() {
    if (!('caches' in window)) return Promise.resolve(false);
    var cle = new URL('__partage__', location.href).href;
    return caches.open('apparq-partage').then(function (cache) {
      return cache.match(cle).then(function (reponse) {
        if (!reponse) return false;
        return reponse.json().then(function (donnees) {
          cache.delete(cle);
          afficher(donnees.texte, donnees.nom);
          memoriser(donnees.texte, donnees.nom);
          return true;
        });
      });
    }).catch(function () { return false; });
  }

  /* ----------------------------------------------------------- */
  /* 5. Demarrage                                                */
  /* ----------------------------------------------------------- */

  function demarrer() {
    var params = new URLSearchParams(location.search);
    var vientDuPartage = params.has('partage');
    if (vientDuPartage) {
      history.replaceState(null, '', location.pathname);   // nettoie l'adresse
    }

    recupererPartage().then(function (ok) {
      if (ok) return;
      if (vientDuPartage) {
        toast("Le fichier partagé n'a pas pu être récupéré.");
      }
      // Sinon : on rouvre le dernier document lu.
      var brut = lire(STORE.last);
      if (!brut) return;
      try {
        var d = JSON.parse(brut);
        if (d && typeof d.texte === 'string') afficher(d.texte, d.nom);
      } catch (e) {
        effacer(STORE.last);
      }
    });
  }

  demarrer();

  // Petit rappel d'installation, uniquement si l'app tourne dans le navigateur.
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    var hint = $('#install-hint');
    if (hint) hint.hidden = false;
  }

  /* ----------------------------------------------------------- */
  /* 6. Service worker (fonctionnement hors connexion)           */
  /* ----------------------------------------------------------- */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function () {
        /* pas bloquant : l'app marche, simplement pas hors connexion */
      });
    });
  }
})();
