/* ---------------------------------------------------------------
   AppArq — logique de l'application

   Deux ecrans, indiques par l'attribut data-vue sur <body> :
     - "accueil" : le menu lateral des formats + les fichiers recents
     - "doc"     : le document affiche

   Pour ajouter un format plus tard, il suffit d'ajouter une entree
   dans FORMATS ci-dessous : le menu, la page d'accueil et l'historique
   s'adaptent tout seuls.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };

  /* ----------------------------------------------------------- */
  /* 1. Les formats reconnus                                     */
  /* ----------------------------------------------------------- */

  var FORMATS = {
    markdown: {
      nom: 'Markdown',
      pastille: 'MD',
      detail: 'Fichiers .md et .markdown',
      bouton: 'Ouvrir un fichier .md',
      accept: '.md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain',
      // transforme le texte du fichier en HTML affichable
      rendu: function (texte) {
        return DOMPurify.sanitize(marked.parse(texte), { USE_PROFILES: { html: true } });
      }
    }
  };

  var ORDRE = ['markdown'];        // ordre d'affichage dans le menu
  var formatActif = 'markdown';

  /* ----------------------------------------------------------- */
  /* 2. Stockage                                                 */
  /* ----------------------------------------------------------- */

  var STORE = {
    recents: 'apparq:fichiers-recents',
    ancien:  'apparq:dernier-document',   // ancienne cle, reprise puis effacee
    size:    'apparq:taille-texte',
    theme:   'apparq:theme'
  };

  var MAX_FICHIERS = 15;          // nombre de fichiers gardes dans l'historique
  var MAX_UN_FICHIER = 400000;    // au-dela, le contenu n'est pas memorise
  var BUDGET_TOTAL = 2000000;     // place totale allouee aux contenus

  function lire(cle) {
    try { return localStorage.getItem(cle); } catch (e) { return null; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, valeur); return true; } catch (e) { return false; }
  }
  function effacer(cle) {
    try { localStorage.removeItem(cle); } catch (e) {}
  }

  function listeRecents() {
    var brut = lire(STORE.recents);
    if (!brut) return [];
    try {
      var liste = JSON.parse(brut);
      return Array.isArray(liste) ? liste : [];
    } catch (e) {
      effacer(STORE.recents);
      return [];
    }
  }

  // Ecrit l'historique. Si la place manque, on abandonne d'abord le contenu
  // des fichiers les plus anciens (leur ligne reste, mais il faudra les
  // rouvrir), puis les lignes elles-memes.
  function sauverRecents(liste) {
    var essai = liste.slice();
    for (var tentative = 0; tentative < 40; tentative++) {
      if (ecrire(STORE.recents, JSON.stringify(essai))) return essai;
      var vide = false;
      for (var i = essai.length - 1; i >= 0 && !vide; i--) {
        if (essai[i].texte) { essai[i] = Object.assign({}, essai[i], { texte: null }); vide = true; }
      }
      if (!vide) {
        if (!essai.length) return [];
        essai = essai.slice(0, essai.length - 1);
      }
    }
    return essai;
  }

  function ajouterRecent(nom, texte, format) {
    var liste = listeRecents().filter(function (f) {
      return !(f.nom === nom && f.format === format);
    });

    liste.unshift({
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7),
      format: format,
      nom: nom,
      taille: texte.length,
      date: Date.now(),
      texte: texte.length <= MAX_UN_FICHIER ? texte : null
    });

    liste = liste.slice(0, MAX_FICHIERS);

    // on reste dans le budget : les contenus les plus anciens sont laches
    var total = 0;
    for (var i = 0; i < liste.length; i++) {
      if (!liste[i].texte) continue;
      if (total + liste[i].texte.length > BUDGET_TOTAL) liste[i].texte = null;
      else total += liste[i].texte.length;
    }

    sauverRecents(liste);
    majAccueil();
  }

  function retirerRecent(id) {
    sauverRecents(listeRecents().filter(function (f) { return f.id !== id; }));
    majAccueil();
  }

  // Reprise de l'ancienne version, qui ne gardait qu'un seul document.
  function reprendreAncienStockage() {
    var brut = lire(STORE.ancien);
    if (!brut) return;
    try {
      var d = JSON.parse(brut);
      if (d && typeof d.texte === 'string') {
        ajouterRecent(d.nom || 'Document', d.texte, 'markdown');
      }
    } catch (e) { /* tant pis */ }
    effacer(STORE.ancien);
  }

  /* ----------------------------------------------------------- */
  /* 3. Petits utilitaires d'affichage                           */
  /* ----------------------------------------------------------- */

  var elToast = $('#toast');
  var toastTimer;
  function toast(message) {
    elToast.textContent = message;
    elToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elToast.hidden = true; }, 3400);
  }

  function tailleLisible(octets) {
    if (octets < 1024) return octets + ' o';
    if (octets < 1024 * 1024) return Math.round(octets / 1024) + ' ko';
    return (octets / (1024 * 1024)).toFixed(1).replace('.', ',') + ' Mo';
  }

  function quand(date) {
    var minutes = Math.round((Date.now() - date) / 60000);
    if (minutes < 1)  return "à l'instant";
    if (minutes < 60) return 'il y a ' + minutes + ' min';
    var heures = Math.round(minutes / 60);
    if (heures < 24)  return 'il y a ' + heures + ' h';
    var jours = Math.round(heures / 24);
    if (jours === 1)  return 'hier';
    if (jours < 7)    return 'il y a ' + jours + ' jours';
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  /* ----------------------------------------------------------- */
  /* 4. Le menu lateral                                          */
  /* ----------------------------------------------------------- */

  var elMenu   = $('#menu');
  var elVoile  = $('#voile');
  var elListe  = $('#menu-liste');

  function construireMenu() {
    elListe.innerHTML = '';
    ORDRE.forEach(function (cle) {
      var format = FORMATS[cle];
      var nb = listeRecents().filter(function (f) { return f.format === cle; }).length;

      var li = document.createElement('li');
      var bouton = document.createElement('button');
      bouton.className = 'menu-item';
      bouton.type = 'button';
      bouton.setAttribute('aria-current', cle === formatActif ? 'true' : 'false');

      var pastille = document.createElement('span');
      pastille.className = 'pastille';
      pastille.textContent = format.pastille;

      var texte = document.createElement('span');
      texte.className = 'menu-item-texte';
      var titre = document.createElement('span');
      titre.className = 'menu-item-titre';
      titre.textContent = format.nom;
      var detail = document.createElement('span');
      detail.className = 'menu-item-detail';
      detail.textContent = nb === 0 ? 'aucun fichier récent'
                         : nb === 1 ? '1 fichier récent'
                         : nb + ' fichiers récents';
      texte.appendChild(titre);
      texte.appendChild(detail);

      bouton.appendChild(pastille);
      bouton.appendChild(texte);
      bouton.addEventListener('click', function () {
        choisirFormat(cle);
        fermerMenu();
      });

      li.appendChild(bouton);
      elListe.appendChild(li);
    });
  }

  function ouvrirMenu() {
    if (history.state && history.state.menu) return;
    history.pushState({ vue: 'accueil', menu: true }, '');
    appliquerEtat(history.state);
  }

  function fermerMenu() {
    if (history.state && history.state.menu) history.back();
    else appliquerEtat({ vue: document.body.dataset.vue });
  }

  $('#btn-menu').addEventListener('click', ouvrirMenu);
  elVoile.addEventListener('click', fermerMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.dataset.menu === 'ouvert') fermerMenu();
  });

  /* ----------------------------------------------------------- */
  /* 5. La page d'accueil                                        */
  /* ----------------------------------------------------------- */

  var elRecents = $('#recents');
  var elVide    = $('#recents-vide');
  var elInput   = $('#file-input');

  function choisirFormat(cle) {
    formatActif = cle;
    var format = FORMATS[cle];
    $('#format-pastille').textContent = format.pastille;
    $('#format-titre').textContent = format.nom;
    $('#format-detail').textContent = format.detail;
    $('#btn-open-big').textContent = format.bouton;
    elInput.setAttribute('accept', format.accept);
    majAccueil();
  }

  function majAccueil() {
    construireMenu();

    var fichiers = listeRecents().filter(function (f) { return f.format === formatActif; });
    elRecents.innerHTML = '';
    elVide.hidden = fichiers.length > 0;

    fichiers.forEach(function (fichier) {
      var li = document.createElement('li');

      var ouvrir = document.createElement('button');
      ouvrir.className = 'recent-ouvrir';
      ouvrir.type = 'button';

      var nom = document.createElement('span');
      nom.className = 'recent-nom';
      nom.textContent = fichier.nom;

      var meta = document.createElement('span');
      meta.className = 'recent-meta';
      meta.textContent = quand(fichier.date) + ' · ' + tailleLisible(fichier.taille)
                       + (fichier.texte ? '' : ' · à rouvrir');

      ouvrir.appendChild(nom);
      ouvrir.appendChild(meta);
      ouvrir.addEventListener('click', function () { rouvrir(fichier.id); });

      var retirer = document.createElement('button');
      retirer.className = 'recent-retirer';
      retirer.type = 'button';
      retirer.setAttribute('aria-label', 'Retirer ' + fichier.nom + ' de la liste');
      retirer.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>';
      retirer.addEventListener('click', function () { retirerRecent(fichier.id); });

      li.appendChild(ouvrir);
      li.appendChild(retirer);
      elRecents.appendChild(li);
    });
  }

  function rouvrir(id) {
    var fichier = listeRecents().filter(function (f) { return f.id === id; })[0];
    if (!fichier) return;
    if (!fichier.texte) {
      toast('Ce fichier était trop volumineux pour être gardé en mémoire : ouvre-le à nouveau.');
      elInput.click();
      return;
    }
    afficher(fichier.texte, fichier.nom, fichier.format);
  }

  /* ----------------------------------------------------------- */
  /* 6. Affichage d'un document                                  */
  /* ----------------------------------------------------------- */

  marked.use({ gfm: true, breaks: false });

  var elDoc      = $('#doc');
  var elTitre     = $('#doc-title');
  var elProgress = $('#progress');
  var elToTop    = $('#to-top');

  function afficher(texte, nomFichier, format) {
    var html;
    try {
      html = FORMATS[format || formatActif].rendu(texte);
    } catch (e) {
      toast("Ce fichier n'a pas pu être affiché.");
      return;
    }

    elDoc.innerHTML = html;

    elDoc.querySelectorAll('a[href]').forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    elDoc.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    // Le bouton Retour d'Android doit ramener a l'accueil, pas fermer l'app.
    if (history.state && history.state.menu) history.replaceState({ vue: 'accueil' }, '');
    if (document.body.dataset.vue !== 'doc') history.pushState({ vue: 'doc' }, '');

    appliquerEtat(history.state);
    elTitre.textContent = nomFichier || 'Document';
    document.title = (nomFichier || 'Document') + ' — AppArq';
    window.scrollTo(0, 0);
    majProgression();
  }

  function ouvrirFichier(file) {
    if (!file) return;
    var nom = file.name || 'Document';
    var format = formatActif;
    var lecture = file.text
      ? file.text()
      : new Promise(function (resolve, reject) {      // secours navigateurs anciens
          var fr = new FileReader();
          fr.onload = function () { resolve(String(fr.result)); };
          fr.onerror = function () { reject(fr.error); };
          fr.readAsText(file);
        });

    lecture.then(function (texte) {
      ajouterRecent(nom, texte, format);
      afficher(texte, nom, format);
    }).catch(function () {
      toast('Impossible de lire ce fichier.');
    });
  }

  function choisirFichier() { elInput.click(); }
  $('#btn-open').addEventListener('click', choisirFichier);
  $('#btn-open-big').addEventListener('click', choisirFichier);
  elInput.addEventListener('change', function () {
    ouvrirFichier(elInput.files && elInput.files[0]);
    elInput.value = '';        // permet de rouvrir deux fois le meme fichier
  });

  /* ----------------------------------------------------------- */
  /* 7. Navigation (fleche retour, bouton Retour d'Android)      */
  /* ----------------------------------------------------------- */

  function appliquerEtat(etat) {
    var vue = (etat && etat.vue) || 'accueil';
    var menuOuvert = !!(etat && etat.menu);

    document.body.dataset.vue = vue;
    if (menuOuvert) document.body.dataset.menu = 'ouvert';
    else delete document.body.dataset.menu;

    elVoile.hidden = !menuOuvert;
    $('#btn-menu').setAttribute('aria-expanded', menuOuvert ? 'true' : 'false');

    if (vue === 'accueil') {
      elTitre.textContent = 'AppArq';
      document.title = 'AppArq — Lecteur Markdown';
      majAccueil();
      window.scrollTo(0, 0);
    }
    majProgression();
  }

  $('#btn-home').addEventListener('click', function () {
    if (history.state && history.state.vue === 'doc') history.back();
    else appliquerEtat({ vue: 'accueil' });
  });

  window.addEventListener('popstate', function (e) { appliquerEtat(e.state); });

  /* ----------------------------------------------------------- */
  /* 8. Confort de lecture                                       */
  /* ----------------------------------------------------------- */

  var taille = parseInt(lire(STORE.size), 10) || 17;
  function appliquerTaille() {
    taille = Math.min(26, Math.max(14, taille));
    document.documentElement.style.setProperty('--reading-size', taille + 'px');
    ecrire(STORE.size, String(taille));
  }
  appliquerTaille();
  $('#btn-bigger').addEventListener('click', function () { taille += 1; appliquerTaille(); toast('Texte : ' + taille + ' px'); });
  $('#btn-smaller').addEventListener('click', function () { taille -= 1; appliquerTaille(); toast('Texte : ' + taille + ' px'); });

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

  function majProgression() {
    var enLecture = document.body.dataset.vue === 'doc';
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
  /* 9. Fichier recu par "Partager" depuis Android               */
  /* ----------------------------------------------------------- */

  function recupererPartage() {
    if (!('caches' in window)) return Promise.resolve(false);
    var cle = new URL('__partage__', location.href).href;
    return caches.open('apparq-partage').then(function (cache) {
      return cache.match(cle).then(function (reponse) {
        if (!reponse) return false;
        return reponse.json().then(function (donnees) {
          cache.delete(cle);
          ajouterRecent(donnees.nom, donnees.texte, 'markdown');
          afficher(donnees.texte, donnees.nom, 'markdown');
          return true;
        });
      });
    }).catch(function () { return false; });
  }

  /* ----------------------------------------------------------- */
  /* 10. Demarrage                                               */
  /* ----------------------------------------------------------- */

  function demarrer() {
    var params = new URLSearchParams(location.search);
    var vientDuPartage = params.has('partage');
    if (vientDuPartage) history.replaceState(null, '', location.pathname);
    history.replaceState({ vue: 'accueil' }, '');

    reprendreAncienStockage();
    choisirFormat(formatActif);
    appliquerEtat(history.state);

    recupererPartage().then(function (ok) {
      if (!ok && vientDuPartage) toast("Le fichier partagé n'a pas pu être récupéré.");
    });
  }

  demarrer();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function () {
        /* pas bloquant : l'app marche, simplement pas hors connexion */
      });
    });
  }
})();
