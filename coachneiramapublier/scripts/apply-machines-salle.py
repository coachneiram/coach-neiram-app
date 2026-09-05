# -*- coding: utf-8 -*-
"""Ajoute a la bibliotheque les machines libres et guidees d'une salle Fitness Park.

Trois groupes : charge libre (Hammer / plate-loaded), Smith machine / barre guidee,
et les complements machines guidees / poulies / halteres.
Deduplique sur exKey : rien n'est ajoute si l'exercice existe deja.
"""
import io
import unicodedata
import re

P = '/home/claude/chk3/coach-neiram-app-main/index.html'
s = io.open(P, encoding='utf-8').read()
orig = s

M = 'muscu'

GROUPS = [
    ("Machines à charge libre (Hammer / plate-loaded)", "Machines à disques : trajectoire guidée mais résistance libre. Charge par côté, attention à l'équilibrage droite/gauche.", [("Développé couché convergent", 3, 10), ("Développé incliné convergent", 3, 10), ("Développé décliné convergent", 3, 10), ("Développé épaules convergent", 3, 10), ("Tirage vertical convergent", 3, 10), ("Tirage horizontal convergent", 3, 10), ("Rowing unilatéral appui poitrine", 3, 10), ("Tirage bûcheron machine", 3, 10), ("Pull-over plate-loaded", 3, 12), ("Shrug machine", 3, 12), ("Curl biceps plate-loaded", 3, 12), ("Extension triceps plate-loaded", 3, 12), ("Soulevé de terre machine", 3, 8)]),
    ("Smith machine / barre guidée", "Barre sur rails : utile pour charger lourd en sécurité ou fixer une trajectoire.", [("Développé couché à la Smith", 3, 10), ("Développé incliné à la Smith", 3, 10), ("Développé militaire à la Smith", 3, 10), ("Squat à la Smith", 3, 10), ("Squat bulgare à la Smith", 3, 10), ("Fentes à la Smith", 3, 10), ("Hip thrust à la Smith", 3, 12), ("Rowing à la Smith", 3, 10), ("Soulevé de terre roumain à la Smith", 3, 10), ("Mollets debout à la Smith", 4, 15), ("Shrug à la Smith", 3, 12)]),
    ("Machines guidées — complément", "Postes à charge sélectionnable moins courants dans la bibliothèque de base.", [("Crunch machine", 3, 15), ("Rotation du buste machine", 3, 15), ("Extension lombaires machine", 3, 12), ("Leg curl debout", 3, 12), ("Kickback fessier machine", 3, 12), ("Chest press unilatéral", 3, 10), ("Butterfly inversé machine", 3, 15), ("Tirage vertical prise large", 3, 10), ("Tirage vertical prise serrée", 3, 10)]),
    ("Poulies — complément", "Variantes de prise et d'angle sur la zone poulies.", [("Tirage nuque poulie haute", 3, 12), ("Crossover poulie haute", 3, 12), ("Crossover poulie basse", 3, 12), ("Kickback triceps poulie", 3, 15), ("Curl unilatéral poulie", 3, 12), ("Extension triceps unilatérale poulie", 3, 12), ("Crunch à la poulie haute", 3, 15), ("Rowing poulie basse prise large", 3, 12)]),
    ("Haltères & barre — complément", "Zone charges libres : barres olympiques, haltères, EZ, landmine.", [("Développé décliné haltères", 3, 10), ("Développé Arnold", 3, 10), ("Rowing Yates", 3, 10), ("Curl incliné haltères", 3, 12), ("Curl concentration", 3, 12), ("Curl barre EZ", 3, 12), ("Élévations frontales haltères", 3, 12), ("Shrugs haltères", 3, 12), ("Shrugs barre", 3, 12), ("Pull-over haltère", 3, 12), ("Good morning barre", 3, 10), ("Front squat barre", 3, 8), ("Soulevé de terre classique", 3, 6), ("Soulevé de terre sumo", 3, 6), ("Fentes latérales haltères", 3, 10), ("Step-up haltères", 3, 10), ("Landmine press", 3, 10), ("Landmine row", 3, 10), ("Kettlebell swing", 4, 15)]),
]


def strip_accents(x):
    return ''.join(c for c in unicodedata.normalize('NFD', x) if unicodedata.category(c) != 'Mn')


def ex_key(name):
    return re.sub(r'[^a-z0-9]+', ' ', strip_accents(name.lower())).strip()


existing = set()
for m in re.finditer(r'\{ name: "((?:[^"\\]|\\.)*)"', s):
    existing.add(ex_key(m.group(1).replace('\\"', '"')))
print('cles deja presentes :', len(existing))


def js(v):
    return '"' + v.replace('\\', '\\\\').replace('"', '\\"') + '"'


blocks = []
added = 0
skipped = []
for group, note, items in GROUPS:
    keep = []
    for name, sets, reps in items:
        k = ex_key(name)
        if k in existing:
            skipped.append(name)
            continue
        existing.add(k)
        keep.append('      { name: %s, mode: "%s", defaults: { sets: %d, reps: %d } }' % (js(name), M, sets, reps))
    if not keep:
        continue
    added += len(keep)
    blocks.append('    { group: %s, note: %s, items: [\n%s\n    ] }' % (js(group), js(note), ',\n'.join(keep)))

block = ('\n  // Machines libres et guidees d\'une salle Fitness Park (Gym80, Hammer,\n'
         '  // Technogym, Panatta, Smith, zone charges libres). Ajoute apres la base\n'
         '  // videos pour que la deduplication porte sur toute la bibliotheque.\n'
         '  [\n' + ',\n'.join(blocks) + '\n  ].forEach((g) => EXERCISE_LIBRARY.push(g));\n')

anchor = '  const videoFor = (name) => EXERCISE_VIDEOS[exKey(name)] || null;\n'
assert s.count(anchor) == 1
i = s.index(anchor)
j = s.index('\n  })();\n', i) + len('\n  })();\n')
s = s[:j] + block + s[j:]

s = s.replace('2026-08-28.02-base-videos', '2026-08-28.03-machines-salle', 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('ajoutes  :', added)
print('ignores  :', len(skipped), skipped)
print('delta    :', len(s) - len(orig))
