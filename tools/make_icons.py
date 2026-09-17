#!/usr/bin/env python3
"""Genere les icones PNG de l'application (aucune dependance externe).

Usage : python3 tools/make_icons.py
Les couleurs se changent dans BG et FG ci-dessous.
"""
import struct, zlib, math, os

BG = (0x12, 0x10, 0x19)   # noir violace du fond
FG = (0x9B, 0x6B, 0xFF)   # violet du monogramme
FG2 = (0xC4, 0xA6, 0xFF)  # violet clair du second A
SS = 4                    # super-echantillonnage (anti-aliasing)


def blend(dst, color, alpha):
    return tuple(round(c * alpha + d * (1 - alpha)) for c, d in zip(color, dst))


class Canvas:
    def __init__(self, size, bg=(0, 0, 0), alpha=0):
        self.n = size
        self.px = [[(bg, alpha) for _ in range(size)] for _ in range(size)]

    def set(self, x, y, color):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.px[y][x] = (color, 1.0)

    def rounded_rect(self, x0, y0, x1, y1, r, color):
        for y in range(max(0, int(y0)), min(self.n, int(y1) + 1)):
            for x in range(max(0, int(x0)), min(self.n, int(x1) + 1)):
                cx = min(max(x, x0 + r), x1 - r)
                cy = min(max(y, y0 + r), y1 - r)
                if math.hypot(x - cx, y - cy) <= r:
                    self.set(x, y, color)

    def thick_line(self, ax, ay, bx, by, w, color):
        half = w / 2
        minx, maxx = int(min(ax, bx) - w), int(max(ax, bx) + w)
        miny, maxy = int(min(ay, by) - w), int(max(ay, by) + w)
        dx, dy = bx - ax, by - ay
        ll = dx * dx + dy * dy
        for y in range(max(0, miny), min(self.n, maxy + 1)):
            for x in range(max(0, minx), min(self.n, maxx + 1)):
                t = 0 if ll == 0 else max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / ll))
                if math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= half:
                    self.set(x, y, color)

    def triangle(self, p1, p2, p3, color):
        xs = [p[0] for p in (p1, p2, p3)]
        ys = [p[1] for p in (p1, p2, p3)]
        d = (p2[1] - p3[1]) * (p1[0] - p3[0]) + (p3[0] - p2[0]) * (p1[1] - p3[1])
        for y in range(max(0, int(min(ys))), min(self.n, int(max(ys)) + 1)):
            for x in range(max(0, int(min(xs))), min(self.n, int(max(xs)) + 1)):
                a = ((p2[1] - p3[1]) * (x - p3[0]) + (p3[0] - p2[0]) * (y - p3[1])) / d
                b = ((p3[1] - p1[1]) * (x - p3[0]) + (p1[0] - p3[0]) * (y - p3[1])) / d
                c = 1 - a - b
                if a >= 0 and b >= 0 and c >= 0:
                    self.set(x, y, color)

    def downsample(self, factor):
        out = Canvas(self.n // factor)
        for y in range(out.n):
            for x in range(out.n):
                rs = gs = bs = a_sum = 0.0
                for j in range(factor):
                    for i in range(factor):
                        (col, a) = self.px[y * factor + j][x * factor + i]
                        rs += col[0] * a; gs += col[1] * a; bs += col[2] * a; a_sum += a
                k = factor * factor
                if a_sum == 0:
                    out.px[y][x] = ((0, 0, 0), 0.0)
                else:
                    out.px[y][x] = ((round(rs / a_sum), round(gs / a_sum), round(bs / a_sum)), a_sum / k)
        return out

    def write_png(self, path):
        raw = bytearray()
        for row in self.px:
            raw.append(0)
            for (col, a) in row:
                raw += bytes((col[0], col[1], col[2], round(a * 255)))

        def chunk(tag, data):
            c = tag + data
            return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

        png = b'\x89PNG\r\n\x1a\n'
        png += chunk(b'IHDR', struct.pack('>IIBBBBB', self.n, self.n, 8, 6, 0, 0, 0))
        png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        png += chunk(b'IEND', b'')
        with open(path, 'wb') as f:
            f.write(png)


def draw_icon(size, padding_ratio=0.0, radius_ratio=0.22):
    """padding_ratio > 0 : marge de securite pour les icones 'maskable'."""
    c = Canvas(size * SS)
    n = size * SS
    # fond
    if padding_ratio > 0:
        c.rounded_rect(0, 0, n - 1, n - 1, 0, BG)          # plein cadre (maskable)
    else:
        c.rounded_rect(0, 0, n - 1, n - 1, n * radius_ratio, BG)
    # zone du logo
    m = n * (0.20 + padding_ratio)
    w = n - 2 * m
    h = w * 0.74
    top = m + (w - h) / 2
    bot = top + h
    stroke = w * 0.10

    def lettre_a(cx, largeur, couleur, epaisseur=None):
        """Un A : deux jambes obliques et une barre horizontale."""
        e = epaisseur or stroke
        gauche = cx - largeur / 2
        droite = cx + largeur / 2
        c.thick_line(gauche, bot, cx, top, e, couleur)
        c.thick_line(cx, top, droite, bot, e, couleur)
        # la barre est posee a 62 % de la hauteur, entre les deux jambes
        y = top + h * 0.62
        k = (y - top) / h * (largeur / 2)
        c.thick_line(cx - k, y, cx + k, y, e * 0.82, couleur)

    # Deux A cote a cote, avec un petit espace : c'est ce qui reste le plus
    # lisible quand l'icone est affichee tout petit.
    largeur_a = w * 0.455
    lettre_a(m + w * 0.238, largeur_a, FG)         # premier A
    lettre_a(m + w * 0.762, largeur_a, FG2)        # second A, violet plus clair

    return c.downsample(SS)


if __name__ == '__main__':
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(here, 'icons')
    os.makedirs(out, exist_ok=True)
    for size in (192, 512):
        draw_icon(size).write_png(os.path.join(out, 'icon-%d.png' % size))
        print('icons/icon-%d.png' % size)
    draw_icon(512, padding_ratio=0.08).write_png(os.path.join(out, 'maskable-512.png'))
    print('icons/maskable-512.png')
    draw_icon(180).write_png(os.path.join(out, 'apple-touch-180.png'))
    print('icons/apple-touch-180.png')
