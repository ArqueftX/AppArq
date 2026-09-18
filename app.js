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
      extensions: /\.(md|markdown|mdown|mkd|txt)$/i,
      // du Markdown vers l'affichage mis en forme
      rendu: function (texte) {
        return DOMPurify.sanitize(marked.parse(texte), { USE_PROFILES: { html: true } });
      },
      // ce que montre la vue "texte brut" : le fichier, inchange
      source: function (texte) {
        return { texte: texte, mention: "Texte brut, tous les caractères apparents" };
      }
    }
  };

  // Quel format pour ce nom de fichier ? (null si on ne sait pas)
  function formatPourFichier(nom) {
    for (var i = 0; i < ORDRE.length; i++) {
      if (FORMATS[ORDRE[i]].extensions.test(nom || '')) return ORDRE[i];
    }
    return null;
  }

  var ORDRE = ['markdown'];        // ordre d'affichage dans le menu
  var formatActif = 'markdown';
  var termeAccueil = '';           // filtre en cours sur la liste des fichiers

  /* ----------------------------------------------------------- */
  /* 2. Stockage                                                 */
  /* ----------------------------------------------------------- */

  var STORE = {
    recents: 'apparq:fichiers-recents',
    ancien:  'apparq:dernier-document',   // ancienne cle, reprise puis effacee
    size:    'apparq:taille-texte',
    mode:    'apparq:mode-lecture',
    astuce:  'apparq:astuce-brut',
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

  // Extrait la ligne autour d'un resultat, pour l'afficher sous le nom.
  function extrait(texte, position, longueur) {
    var debut = Math.max(0, position - 34);
    return {
      avant: (debut > 0 ? '…' : '') + texte.slice(debut, position).replace(/\s+/g, ' '),
      motif: texte.slice(position, position + longueur),
      apres: texte.slice(position + longueur, position + longueur + 70).replace(/\s+/g, ' ') + '…'
    };
  }

  function majAccueil() {
    construireMenu();

    var fichiers = listeRecents().filter(function (f) { return f.format === formatActif; });
    var cherche = termeAccueil.toLowerCase();

    if (cherche) {
      fichiers = fichiers.map(function (f) {
        var dansLeNom = f.nom.toLowerCase().indexOf(cherche) !== -1;
        var position = f.texte ? f.texte.toLowerCase().indexOf(cherche) : -1;
        if (!dansLeNom && position === -1) return null;
        var copie = Object.assign({}, f);
        copie.extrait = position === -1 ? null : extrait(f.texte, position, cherche.length);
        return copie;
      }).filter(Boolean);
    }

    elRecents.innerHTML = '';
    elVide.hidden = cherche ? true : fichiers.length > 0;
    $('#recherche-vide').hidden = !(cherche && fichiers.length === 0);

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

      if (fichier.extrait) {
        var ligne = document.createElement('span');
        ligne.className = 'recent-extrait';
        ligne.appendChild(document.createTextNode(fichier.extrait.avant));
        var surligne = document.createElement('mark');
        surligne.textContent = fichier.extrait.motif;
        ligne.appendChild(surligne);
        ligne.appendChild(document.createTextNode(fichier.extrait.apres));
        ouvrir.appendChild(ligne);
      }

      var termeClic = termeAccueil;
      ouvrir.addEventListener('click', function () { rouvrir(fichier.id, termeClic); });

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

  function rouvrir(id, terme) {
    var fichier = listeRecents().filter(function (f) { return f.id === id; })[0];
    if (!fichier) return;
    if (!fichier.texte) {
      toast('Ce fichier était trop volumineux pour être gardé en mémoire : ouvre-le à nouveau.');
      elInput.click();
      return;
    }
    afficher(fichier.texte, fichier.nom, fichier.format, terme);
  }

  /* ----------------------------------------------------------- */
  /* 6. Affichage d'un document                                  */
  /* ----------------------------------------------------------- */

  marked.use({ gfm: true, breaks: false });

  var elDoc         = $('#doc');
  var elSourceTexte = $('#source-texte');

  var texteOriginal = '';      // le fichier tel qu'il a ete ouvert, intact
  var htmlRendu  = null;       // instantanes sans surlignage, pour la recherche
  var htmlSource = null;
  var elTitre     = $('#doc-title');
  var elProgress = $('#progress');
  var elToTop    = $('#to-top');

  // Le texte brut est decoupe en petits blocs. Un seul bloc geant obligeait le
  // navigateur a parcourir tout le document a chaque appui long : la selection
  // mettait un temps fou a demarrer sur telephone (18 ms contre 3 ms en mise en
  // page, sur un fichier de 172 Ko).
  // Taille choisie par la mesure : au-dela, l'appui long ralentit ; en deca,
  // c'est le glissement de la selection vers le bas qui devient couteux.
  var LIGNES_PAR_BLOC = 400;

  function remplirTexteBrut(texte) {
    var lignes = texte.split('\n');
    var fragment = document.createDocumentFragment();
    var i = 0;

    while (i < lignes.length) {
      var fin = Math.min(lignes.length, i + LIGNES_PAR_BLOC);

      // Un bloc ne doit jamais finir par une ligne vide : a la copie, le
      // navigateur fusionnerait ce retour a la ligne avec la separation de
      // blocs, et le texte copie perdrait des lignes.
      while (fin > i + 1 && lignes[fin - 1] === '') fin--;

      // Cas limite : un bloc entierement vide. On avance jusqu'a une ligne pleine.
      if (fin === i + 1 && lignes[i] === '') {
        while (fin < lignes.length && lignes[fin] === '') fin++;
        if (fin < lignes.length) fin++;
      }

      var bloc = document.createElement('div');
      bloc.className = 'bloc-brut';
      bloc.textContent = lignes.slice(i, fin).join('\n');
      fragment.appendChild(bloc);
      i = fin;
    }

    elSourceTexte.textContent = '';
    elSourceTexte.appendChild(fragment);
  }

  function afficher(texte, nomFichier, format, terme) {
    var reglages = FORMATS[format || formatActif];
    var html;
    try {
      html = reglages.rendu(texte);
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

    // La seconde vue : le fichier tel quel pour le Markdown, le Markdown
    // reconstruit pour le HTML.
    var brut = reglages.source(texte);
    texteOriginal = brut.texte;
    remplirTexteBrut(brut.texte);
    $('.source-mention').textContent = brut.mention;

    // On garde le HTML propre : la recherche le reconstruit a chaque frappe.
    htmlRendu = elDoc.innerHTML;
    htmlSource = elSourceTexte.innerHTML;

    // Le bouton Retour d'Android doit ramener a l'accueil, pas fermer l'app.
    if (history.state && history.state.menu) history.replaceState({ vue: 'accueil' }, '');
    if (document.body.dataset.vue !== 'doc') history.pushState({ vue: 'doc' }, '');

    appliquerEtat(history.state);
    elTitre.textContent = nomFichier || 'Document';
    document.title = (nomFichier || 'Document') + ' — AppArq';
    window.scrollTo(0, 0);
    mesurerHauteur();
    majProgression();

    if (terme) ouvrirRecherche(terme);

    // A la toute premiere lecture, on signale le bouton de bascule :
    // sans cela il passe facilement inapercu.
    if (!lire(STORE.astuce) && mode === 'rendu') {
      ecrire(STORE.astuce, '1');
      setTimeout(function () {
        toast('Astuce : le bouton ‹ › en haut affiche le texte brut, avec les * et les #.');
      }, 1000);
    }
  }

  function ouvrirFichier(file) {
    if (!file) return;
    var nom = file.name || 'Document';
    var format = formatPourFichier(nom) || formatActif;
    if (format !== formatActif) choisirFormat(format);   // on suit le fichier
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
  /* 7. Mise en page propre ou texte brut                        */
  /* ----------------------------------------------------------- */

  var ICONES = {
    // vers quoi le bouton emmene : chevrons = le texte brut, lignes = le rendu
    source: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6z',
    rendu:  'M3 5h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3z'
  };

  var mode = lire(STORE.mode) === 'source' ? 'source' : 'rendu';

  function appliquerMode() {
    document.body.dataset.mode = mode;
    ecrire(STORE.mode, mode);

    var versSource = mode === 'rendu';
    var bouton = $('#btn-mode');
    $('#icone-mode').setAttribute('d', versSource ? ICONES.source : ICONES.rendu);
    bouton.setAttribute('aria-label', versSource ? "Voir le texte d'origine" : 'Voir la mise en forme');
    bouton.setAttribute('title', versSource ? "Texte d'origine" : 'Mise en forme');
  }

  appliquerMode();

  $('#btn-mode').addEventListener('click', function () {
    mode = mode === 'rendu' ? 'source' : 'rendu';
    appliquerMode();
    // le message reprend la mention du format : "texte d'origine" pour du
    // Markdown, "reconverti en Markdown" pour du HTML
    toast(mode === 'source' ? $('.source-mention').textContent : 'Texte mis en forme');
    if (!elRecherche.hidden) lancerRecherche();   // on resurligne dans la vue affichee
    window.scrollTo(0, 0);
    mesurerHauteur();
    majProgression();
  });

  // Copier l'integralite du fichier, avec ses * et ses # intacts.
  $('#btn-copier').addEventListener('click', function () {
    var fini = function (ok) {
      toast(ok ? 'Texte copié, tel qu\'il est écrit dans le fichier.'
               : 'La copie a échoué. Sélectionne le texte à la main.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texteOriginal).then(function () { fini(true); },
                                                        function () { fini(copieDeSecours()); });
    } else {
      fini(copieDeSecours());
    }
  });

  // Methode de secours pour les navigateurs sans presse-papier moderne.
  function copieDeSecours() {
    try {
      var zone = document.createElement('textarea');
      zone.value = texteOriginal;
      zone.setAttribute('readonly', '');
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(zone);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ----------------------------------------------------------- */
  /* 8. Recherche                                                */
  /*    - dans un document : surligne et fait defiler            */
  /*    - sur l'accueil    : filtre les fichiers recents         */
  /* ----------------------------------------------------------- */

  var elRecherche = $('#recherche');
  var elChamp     = $('#recherche-champ');
  var elCompteur  = $('#recherche-compteur');

  var marques = [];            // les <mark> du document
  var indexMarque = 0;
  var MAX_MARQUES = 2000;      // garde-fou sur les tres gros documents
  var minuteur;

  function ouvrirRecherche(terme) {
    elRecherche.hidden = false;
    if (typeof terme === 'string') elChamp.value = terme;
    lancerRecherche();
    elChamp.focus();
    elChamp.select();
  }

  function fermerRecherche() {
    elRecherche.hidden = true;
    elChamp.value = '';
    elCompteur.textContent = '';
    if (termeAccueil) { termeAccueil = ''; majAccueil(); }
    restaurerDocument();
  }

  // La recherche s'applique a la vue affichee : le rendu, ou le texte d'origine.
  function conteneurLecture() {
    return document.body.dataset.mode === 'source' ? elSourceTexte : elDoc;
  }

  function restaurerDocument() {
    if (marques.length) {
      if (htmlRendu !== null) elDoc.innerHTML = htmlRendu;
      if (htmlSource !== null) elSourceTexte.innerHTML = htmlSource;
    }
    marques = [];
    indexMarque = 0;
  }

  function lancerRecherche() {
    var terme = elChamp.value.trim();
    if (document.body.dataset.vue === 'doc') chercherDansDocument(terme);
    else { termeAccueil = terme; majAccueil(); }
  }

  function chercherDansDocument(terme) {
    restaurerDocument();
    if (!terme) { elCompteur.textContent = ''; return; }

    var cible = terme.toLowerCase();
    var parcours = document.createTreeWalker(conteneurLecture(), NodeFilter.SHOW_TEXT);
    var noeuds = [];
    while (parcours.nextNode()) noeuds.push(parcours.currentNode);

    noeuds.forEach(function (noeud) {
      if (marques.length >= MAX_MARQUES) return;
      var texte = noeud.nodeValue;
      var bas = texte.toLowerCase();
      var i = bas.indexOf(cible);
      if (i === -1) return;

      var morceaux = document.createDocumentFragment();
      var position = 0;
      while (i !== -1 && marques.length < MAX_MARQUES) {
        if (i > position) morceaux.appendChild(document.createTextNode(texte.slice(position, i)));
        var marque = document.createElement('mark');
        marque.className = 'surlignage';
        marque.textContent = texte.slice(i, i + cible.length);
        morceaux.appendChild(marque);
        marques.push(marque);
        position = i + cible.length;
        i = bas.indexOf(cible, position);
      }
      if (position < texte.length) morceaux.appendChild(document.createTextNode(texte.slice(position)));
      noeud.parentNode.replaceChild(morceaux, noeud);
    });

    if (!marques.length) {
      elCompteur.textContent = 'aucun';
      return;
    }
    indexMarque = 0;
    allerAuResultat(0);
  }

  function allerAuResultat(pas) {
    if (!marques.length) return;
    marques[indexMarque].classList.remove('actif');
    indexMarque = (indexMarque + pas + marques.length) % marques.length;
    var marque = marques[indexMarque];
    marque.classList.add('actif');
    marque.scrollIntoView({ block: 'center', behavior: 'smooth' });
    elCompteur.textContent = (indexMarque + 1) + ' / ' + marques.length
                           + (marques.length === MAX_MARQUES ? '+' : '');
  }

  $('#btn-recherche').addEventListener('click', function () {
    if (elRecherche.hidden) ouvrirRecherche('');
    else fermerRecherche();
  });
  $('#recherche-fermer').addEventListener('click', fermerRecherche);
  $('#recherche-suiv').addEventListener('click', function () { allerAuResultat(1); });
  $('#recherche-prec').addEventListener('click', function () { allerAuResultat(-1); });

  elChamp.addEventListener('input', function () {
    clearTimeout(minuteur);
    minuteur = setTimeout(lancerRecherche, 170);
  });

  elChamp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(minuteur);
      if (!marques.length) lancerRecherche();
      else allerAuResultat(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      fermerRecherche();
    }
  });

  // Ctrl+F (ou Cmd+F) ouvre la recherche de l'application.
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      ouvrirRecherche(elChamp.value);
    }
  });

  /* ----------------------------------------------------------- */
  /* 9. Navigation (fleche retour, bouton Retour d'Android)      */
  /* ----------------------------------------------------------- */

  var vuePrecedente = null;

  function appliquerEtat(etat) {
    var vue = (etat && etat.vue) || 'accueil';
    var menuOuvert = !!(etat && etat.menu);

    document.body.dataset.vue = vue;
    if (vue !== vuePrecedente) {          // on change d'ecran : recherche remise a zero
      vuePrecedente = vue;
      elRecherche.hidden = true;
      elChamp.value = '';
      elCompteur.textContent = '';
      termeAccueil = '';
      restaurerDocument();
    }
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
    mesurerHauteur();
    majProgression();
  }

  $('#btn-home').addEventListener('click', function () {
    if (history.state && history.state.vue === 'doc') history.back();
    else appliquerEtat({ vue: 'accueil' });
  });

  window.addEventListener('popstate', function (e) { appliquerEtat(e.state); });

  /* ----------------------------------------------------------- */
  /* 10. Confort de lecture                                       */
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

  // La hauteur du document est mesuree quand elle change, pas a chaque
  // defilement : la relire en boucle forcait un recalcul de mise en page a
  // chaque image, ce qui rendait le defilement pateux pendant une selection.
  var hauteurDefilement = 0;
  function mesurerHauteur() {
    hauteurDefilement = document.documentElement.scrollHeight - window.innerHeight;
  }

  // On ne redessine qu'une fois par image, jamais plus.
  var redessinDemande = false;
  function majProgression() {
    if (redessinDemande) return;
    redessinDemande = true;
    requestAnimationFrame(function () {
      redessinDemande = false;
      dessinerProgression();
    });
  }

  function dessinerProgression() {
    var enLecture = document.body.dataset.vue === 'doc';
    var ratio = (enLecture && hauteurDefilement > 0) ? window.scrollY / hauteurDefilement : 0;
    // scaleX plutot qu'une largeur en pourcentage : c'est la carte graphique
    // qui s'en charge, sans repasser par la mise en page.
    elProgress.style.transform = 'scaleX(' + Math.min(1, ratio).toFixed(4) + ')';
    var montrer = enLecture && window.scrollY >= 600;
    if (montrer === elToTop.hidden) elToTop.hidden = !montrer;
  }

  window.addEventListener('scroll', majProgression, { passive: true });
  window.addEventListener('resize', function () { mesurerHauteur(); majProgression(); });
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
  /* 11. Fichier recu par "Partager" depuis Android               */
  /* ----------------------------------------------------------- */

  function recupererPartage() {
    if (!('caches' in window)) return Promise.resolve(false);
    var cle = new URL('__partage__', location.href).href;
    return caches.open('apparq-partage').then(function (cache) {
      return cache.match(cle).then(function (reponse) {
        if (!reponse) return false;
        return reponse.json().then(function (donnees) {
          cache.delete(cle);
          var format = formatPourFichier(donnees.nom) || 'markdown';
          if (format !== formatActif) choisirFormat(format);
          ajouterRecent(donnees.nom, donnees.texte, format);
          afficher(donnees.texte, donnees.nom, format);
          return true;
        });
      });
    }).catch(function () { return false; });
  }

  /* ----------------------------------------------------------- */
  /* 12. Demarrage                                              */
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
    // L'application etait-elle deja pilotee par un service worker au chargement ?
    // Si oui, un changement de pilote signifie qu'une nouvelle version vient
    // d'etre installee : la page en cours execute encore l'ancien code.
    var deja = !!navigator.serviceWorker.controller;
    var rechargeFaite = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!deja || rechargeFaite) return;
      rechargeFaite = true;
      location.reload();
    });

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then(function (enregistrement) {
          // A chaque retour dans l'application, on verifie s'il existe une
          // version plus recente. Sans cela, une application installee peut
          // tourner des jours sur du code perime.
          document.addEventListener('visibilitychange', function () {
            if (!document.hidden) enregistrement.update();
          });
        })
        .catch(function () {
          /* pas bloquant : l'app marche, simplement pas hors connexion */
        });
    });
  }
})();
