// Produit les icones PNG de l'application a partir de icons/logo.svg.
//
// Prerequis : Node et Playwright (npm i playwright), puis :
//   node tools/rasterise-logo.js
//
// A relancer apres chaque modification de tools/make_logo.py.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const racine = path.resolve(__dirname, '..');
const sorties = [
  ['icons/logo.svg',          'icons/icon-512.png',       512],
  ['icons/logo.svg',          'icons/icon-192.png',       192],
  ['icons/logo.svg',          'icons/apple-touch-180.png',180],
  ['icons/logo-maskable.svg', 'icons/maskable-512.png',   512],
];

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const p = await b.newPage();
  for (const [src, dst, taille] of sorties) {
    const svg = fs.readFileSync(path.join(racine, src), 'utf8');
    await p.setViewportSize({ width: taille, height: taille });
    await p.setContent(
      `<body style="margin:0;background:transparent">
         <div style="width:${taille}px;height:${taille}px">${svg.replace(/width="100" height="100"/, `width="${taille}" height="${taille}"`)}</div>
       </body>`);
    await p.screenshot({ path: path.join(racine, dst), omitBackground: true });
    console.log(dst, taille + 'x' + taille);
  }
  await b.close();
})();
