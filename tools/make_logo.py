#!/usr/bin/env python3
"""Construit icons/logo.svg : le monogramme "AA" d'AppArq.

Le logo est entierement decrit par les mesures ci-dessous, dans un carre de
100 x 100. Le script en deduit les contours exacts (y compris le bord
interieur des jambes galbees, calcule comme courbe parallele), ce qui permet
de changer une epaisseur ou un ecartement sans rien redessiner a la main.

Usage : python3 tools/make_logo.py
"""
import math, os

# ---------------------------------------------------------------- reglages
FOND_1, FOND_2 = '#1a1226', '#07050c'   # halo central et coins du fond
VIOLET_CLAIR   = '#e7daff'              # haut des lettres
VIOLET         = '#a274f7'              # milieu
VIOLET_FONCE   = '#7c3aed'              # bas des lettres
RAYON_FOND     = 22.0                   # arrondi du carre

SEAM      = 49.55          # bord interieur de la lettre de gauche (charniere)
POINTE    = (49.55, 16.2)  # sommet du monogramme
GALBE_1   = 0.42           # 1er point de controle, pose sur la droite pointe->bas
GALBE_2   = (15.7, 59.3)   # 2e point de controle : c'est lui qui donne le coup
                           # de rein en bas de la jambe
JAMBE_BAS = (10.6, 73.0)   # extremite exterieure de la jambe
EP_JAMBE  = 9.5            # epaisseur de la jambe
EP_MONT   = 8.2            # largeur du montant vertical central
BARRE     = (57.5, 65.5)   # haut et bas de la barre horizontale du A
PIED_BAS  = 79.2           # bas du montant central
PIED_JEU  = 4.4            # evasement du pied vers l'exterieur


# --------------------------------------------------- petites aides vectorielles
def sous(a, b):   return (a[0] - b[0], a[1] - b[1])
def plus(a, b):   return (a[0] + b[0], a[1] + b[1])
def fois(a, k):   return (a[0] * k, a[1] * k)
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

def norme(v):
    d = math.hypot(*v)
    return (v[0] / d, v[1] / d)

def normale(v):
    """Perpendiculaire a v, tournee vers l'interieur de la lettre."""
    u = norme(v)
    return (u[1], -u[0])


class Cubique:
    """Courbe de Bezier cubique, avec ce qu'il faut pour la decouper."""

    def __init__(self, p0, p1, p2, p3):
        self.p = (p0, p1, p2, p3)

    def point(self, t):
        a, b, c = self.p[0], self.p[1], self.p[2]
        d = self.p[3]
        ab, bc, cd = lerp(a, b, t), lerp(b, c, t), lerp(c, d, t)
        return lerp(lerp(ab, bc, t), lerp(bc, cd, t), t)

    def coupe(self, t):
        """Decoupe en deux : renvoie (avant, apres)."""
        a, b, c, d = self.p
        ab, bc, cd = lerp(a, b, t), lerp(b, c, t), lerp(c, d, t)
        abc, bcd = lerp(ab, bc, t), lerp(bc, cd, t)
        m = lerp(abc, bcd, t)
        return Cubique(a, ab, abc, m), Cubique(m, bcd, cd, d)

    def morceau(self, a, b):
        """Sous-courbe entre les parametres a et b."""
        _, apres = self.coupe(a)
        t = 0.0 if b >= 1.0 else (b - a) / (1.0 - a)
        avant, _ = apres.coupe(t) if t > 0 else (apres, None)
        return avant

    def decalee(self, d):
        """Courbe parallele, decalee de d vers l'interieur (approximation)."""
        n_haut = normale(sous(self.p[1], self.p[0]))
        n_bas  = normale(sous(self.p[3], self.p[2]))
        return Cubique(plus(self.p[0], fois(n_haut, d)),
                       plus(self.p[1], fois(n_haut, d)),
                       plus(self.p[2], fois(n_bas, d)),
                       plus(self.p[3], fois(n_bas, d)))

    def t_pour(self, valeur, axe):
        """Parametre t ou la courbe atteint une abscisse (axe=0) ou ordonnee (1)."""
        bas, haut = 0.0, 1.0
        croissant = self.point(1.0)[axe] > self.point(0.0)[axe]
        for _ in range(60):
            milieu = (bas + haut) / 2
            if (self.point(milieu)[axe] < valeur) == croissant:
                bas = milieu
            else:
                haut = milieu
        return (bas + haut) / 2


def f(p):
    return f"{p[0]:.2f} {p[1]:.2f}"


def lettre_gauche():
    """Contour de la lettre A de gauche (chemin SVG, regle even-odd)."""
    corde = sous(JAMBE_BAS, POINTE)
    exterieur = Cubique(POINTE, plus(POINTE, fois(corde, GALBE_1)), GALBE_2, JAMBE_BAS)
    interieur = exterieur.decalee(EP_JAMBE)
    rayon = EP_JAMBE / 2
    x_mont = SEAM - EP_MONT

    t_barre_bas  = interieur.t_pour(BARRE[1], 1)
    t_barre_haut = interieur.t_pour(BARRE[0], 1)
    t_creux      = interieur.t_pour(x_mont, 0)      # pointe du contre-poincon

    bas_int = interieur.morceau(t_barre_bas, 1.0)
    creux   = interieur.morceau(t_creux, t_barre_haut)

    # extremites du bout arrondi de la jambe
    fin_int = interieur.point(1.0)
    fin_ext = exterieur.point(1.0)

    contour = [
        f"M {f(POINTE)}",
        # bord droit : le montant central descend jusqu'au pied
        f"L {SEAM:.2f} {PIED_BAS - 7.2:.2f}",
        f"C {SEAM:.2f} {PIED_BAS - 1.6:.2f} {SEAM - 1.9:.2f} {PIED_BAS:.2f} {SEAM - 4.3:.2f} {PIED_BAS:.2f}",
        # le pied s'evase vers la gauche, puis remonte
        f"C {SEAM - 8.4:.2f} {PIED_BAS:.2f} {x_mont - PIED_JEU:.2f} {PIED_BAS - 2.6:.2f} "
        f"{x_mont - PIED_JEU * 0.5:.2f} {PIED_BAS - 7.6:.2f}",
        f"L {x_mont:.2f} {BARRE[1]:.2f}",
        # dessous de la barre horizontale, jusqu'a la jambe
        f"L {f(bas_int.p[0])}",
        # bord interieur galbe de la jambe, jusqu'en bas
        f"C {f(bas_int.p[1])} {f(bas_int.p[2])} {f(bas_int.p[3])}",
        # bout arrondi
        f"A {rayon:.2f} {rayon:.2f} 0 0 1 {f(fin_ext)}",
        # remontee du bord exterieur galbe jusqu'a la pointe
        f"C {f(exterieur.p[2])} {f(exterieur.p[1])} {f(POINTE)}",
        "Z",
    ]

    contre_poincon = [
        f"M {f(creux.p[0])}",
        f"C {f(creux.p[1])} {f(creux.p[2])} {f(creux.p[3])}",
        f"L {x_mont:.2f} {BARRE[0]:.2f}",
        "Z",
    ]
    return ' '.join(contour) + ' ' + ' '.join(contre_poincon)


def svg(taille_logo=1.0, fond_plein=False):
    d = lettre_gauche()
    decalage = (1 - taille_logo) * 50
    fond = ('<rect width="100" height="100" fill="url(#halo)"/>' if fond_plein else
            f'<rect width="100" height="100" rx="{RAYON_FOND}" fill="url(#halo)"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="halo" cx="50%" cy="36%" r="74%">
      <stop offset="0" stop-color="{FOND_1}"/>
      <stop offset="1" stop-color="{FOND_2}"/>
    </radialGradient>
    <linearGradient id="violetG" gradientUnits="userSpaceOnUse" x1="52" y1="18" x2="14" y2="80">
      <stop offset="0" stop-color="{VIOLET_CLAIR}"/>
      <stop offset=".45" stop-color="{VIOLET}"/>
      <stop offset="1" stop-color="{VIOLET_FONCE}"/>
    </linearGradient>
    <linearGradient id="violetD" gradientUnits="userSpaceOnUse" x1="48" y1="18" x2="86" y2="80">
      <stop offset="0" stop-color="{VIOLET_CLAIR}"/>
      <stop offset=".45" stop-color="{VIOLET}"/>
      <stop offset="1" stop-color="{VIOLET_FONCE}"/>
    </linearGradient>
  </defs>
  {fond}
  <g transform="translate({decalage:.3f} {decalage:.3f}) scale({taille_logo:.3f})">
    <path d="{d}" fill="url(#violetG)" fill-rule="evenodd"/>
    <g transform="translate(100 0) scale(-1 1)">
      <path d="{d}" fill="url(#violetD)" fill-rule="evenodd"/>
    </g>
  </g>
</svg>
'''


if __name__ == '__main__':
    racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icones = os.path.join(racine, 'icons')
    os.makedirs(icones, exist_ok=True)
    open(os.path.join(icones, 'logo.svg'), 'w').write(svg())
    # version "maskable" : fond plein bord a bord, logo reduit dans la zone sure
    open(os.path.join(icones, 'logo-maskable.svg'), 'w').write(svg(taille_logo=0.78, fond_plein=True))
    print('icons/logo.svg et icons/logo-maskable.svg ecrits')
