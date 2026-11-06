/* AppArq — choix de l'affichage : telephone ou ordinateur.
   Charge dans <head>, avant la page, pour qu'elle s'affiche tout de suite
   avec la bonne mise en page.

   - « telephone » : menu en tiroir, une seule colonne.
   - « ordinateur » : menu toujours visible a gauche.
   - « automatique » : telephone sur un telephone, sinon selon la largeur.

   Cas particulier : quand Chrome affiche la « version pour ordinateur »,
   il fait croire a la page que l'ecran mesure 980 px de large, puis la
   reduit pour la faire tenir. On compense en agrandissant la page d'autant,
   pour retrouver la taille d'un vrai telephone. */
(function () {
  var CLE = 'apparq:affichage';
  var racine = document.documentElement;

  function lireChoix() {
    try { return localStorage.getItem(CLE) || 'auto'; } catch (e) { return 'auto'; }
  }

  function estTelephone() {
    var tactile = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return !!tactile && Math.min(screen.width, screen.height) < 600;
  }

  // largeur reelle de l'ecran, dans le sens ou il est tenu
  function largeurEcran() {
    var paysage = window.innerWidth > window.innerHeight;
    return paysage ? Math.max(screen.width, screen.height)
                   : Math.min(screen.width, screen.height);
  }

  function appliquer() {
    var choix = lireChoix();
    var telephone = choix === 'tel' || (choix === 'auto' && estTelephone());
    var large = choix === 'ordi' || (choix === 'auto' && !telephone && window.innerWidth >= 900);

    racine.setAttribute('data-affichage', choix);
    racine.setAttribute('data-gabarit', large ? 'ordi' : 'tel');

    var zoom = 1;
    if (telephone && !large) {
      var rapport = window.innerWidth / largeurEcran();
      if (rapport > 1.25) zoom = Math.round(rapport * 1000) / 1000;
    }
    if (zoom > 1) {
      racine.style.zoom = String(zoom);
      // vh et vw sont eux aussi agrandis par le zoom : on les ramene a
      // la taille de l'ecran
      racine.style.setProperty('--vh', 'calc(1vh / ' + zoom + ')');
      racine.style.setProperty('--vw', 'calc(1vw / ' + zoom + ')');
    } else {
      racine.style.removeProperty('zoom');
      racine.style.removeProperty('--vh');
      racine.style.removeProperty('--vw');
    }
  }

  function changer(choix) {
    try { localStorage.setItem(CLE, choix); } catch (e) { /* tant pis */ }
    appliquer();
  }

  appliquer();
  window.addEventListener('resize', appliquer);
  window.addEventListener('orientationchange', appliquer);

  window.AppArqAffichage = { choix: lireChoix, changer: changer, appliquer: appliquer };
})();
