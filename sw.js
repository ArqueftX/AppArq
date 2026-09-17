/* ---------------------------------------------------------------
   AppArq — service worker
   Role : 1) garder l'application disponible sans connexion,
          2) recevoir les fichiers envoyes via "Partager" sur Android.
   Apres une modification des fichiers, incremente VERSION.
   --------------------------------------------------------------- */

var VERSION = 'v3';
var CACHE_APP     = 'apparq-app-' + VERSION;
var CACHE_PARTAGE = 'apparq-partage';

var FICHIERS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './vendor/marked.umd.js',
  './vendor/purify.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-180.png'
];

// Installation : on met l'application entiere en cache.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then(function (cache) {
        // 'reload' : on force le telechargement depuis le serveur, sans passer
        // par le cache du navigateur (sinon on risque de figer un vieux fichier).
        return cache.addAll(FICHIERS.map(function (url) {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// Activation : on supprime les caches des versions precedentes.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (nom) {
        if (nom !== CACHE_APP && nom !== CACHE_PARTAGE) return caches.delete(nom);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Reception d'un fichier partage depuis une autre application.
function traiterPartage(request) {
  return request.formData().then(function (form) {
    var fichiers = form.getAll('file');
    var fichier = fichiers && fichiers.length ? fichiers[0] : null;

    var lecture = fichier
      ? fichier.text().then(function (texte) {
          return { nom: fichier.name || 'Document partagé', texte: texte };
        })
      : Promise.resolve({
          nom: form.get('title') || 'Texte partagé',
          texte: form.get('text') || ''
        });

    return lecture.then(function (donnees) {
      var cle = new URL('__partage__', self.registration.scope).href;
      return caches.open(CACHE_PARTAGE).then(function (cache) {
        return cache.put(cle, new Response(JSON.stringify(donnees), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
  }).then(function () {
    return Response.redirect(new URL('./?partage=1', self.registration.scope).href, 303);
  }).catch(function () {
    return Response.redirect(new URL('./?partage=erreur', self.registration.scope).href, 303);
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // 1) Fichier envoye par le bouton "Partager" d'Android.
  if (request.method === 'POST' && url.pathname.endsWith('/share-target/')) {
    event.respondWith(traiterPartage(request));
    return;
  }

  // 2) On ne s'occupe que des lectures de nos propres fichiers.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 3) Navigation : on sert la page en cache, le reseau sert de secours.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(function (cache) {
        return cache || fetch(request);
      })
    );
    return;
  }

  // 4) Le reste : cache d'abord (rapide, hors connexion),
  //    avec mise a jour discrete en arriere-plan.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (enCache) {
      var reseau = fetch(request).then(function (reponse) {
        if (reponse && reponse.status === 200 && reponse.type === 'basic') {
          var copie = reponse.clone();
          caches.open(CACHE_APP).then(function (cache) { cache.put(request, copie); });
        }
        return reponse;
      }).catch(function () { return enCache; });
      return enCache || reseau;
    })
  );
});
