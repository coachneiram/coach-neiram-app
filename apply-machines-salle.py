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
    ("Machines \u00e0 charge libre (Hammer / plate-loaded)",
     "Machines \u00e0 disques : trajectoire guid\u00e9e mais r\u00e9sistance libre. Charge par c\u00f4t\u00e9, "
     "attention \u00e0 l'\u00e9quilibrage droite/gauche.",
     [
         ("D\u00e9velopp\u00e9 couch\u00e9 convergent", 3, 10),
         ("D\u00e9velopp\u00e9 inclin\u00e9 convergent", 3, 10),
         ("D\u00e9velopp\u00e9 d\u00e9clin\u00e9 convergent", 3, 10),
         ("D\u00e9velopp\u00e9 \u00e9paules convergent", 3, 10),
         ("Tirage vertical convergent", 3, 10),
         ("Tirage horizontal convergent", 3, 10),
         ("Rowing unilat\u00e9ral appui poitrine", 3, 10),
         ("Tirage b\u00fbcheron machine", 3, 10),
         ("Pull-over plate-loaded", 3, 12),
         ("Shrug machine", 3, 12),
         ("Curl biceps plate-loaded", 3, 12),
         ("Extension triceps plate-loaded", 3, 12),
         ("Soulev\u00e9 de terre machine", 3, 8),
     ]),
    ("Smith machine / barre guid\u00e9e",
     "Barre sur rails : utile pour charger lourd en s\u00e9curit\u00e9 ou fixer une trajectoire.",
     [
         ("D\u00e9velopp\u00e9 couch\u00e9 \u00e0 la Smith", 3, 10),
         ("D\u00e9velopp\u00e9 inclin\u00e9 \u00e0 la Smith", 3, 10),
         ("D\u00e9velopp\u00e9 militaire \u00e0 la Smith", 3, 10),
         ("Squat \u00e0 la Smith", 3, 10),
         ("Squat bulgare \u00e0 la Smith", 3, 10),
         ("Fentes \u00e0 la Smith", 3, 10),
         ("Hip thrust \u00e0 la Smith", 3, 12),
         ("Rowing \u00e0 la Smith", 3, 10),
         ("Soulev\u00e9 de terre roumain \u00e0 la Smith", 3, 10),
         ("Mollets debout \u00e0 la Smith", 4, 15),
         ("Shrug \u00e0 la Smith", 3, 12),
     ]),
    ("Machines guid\u00e9es \u2014 compl\u00e9ment",
     "Postes \u00e0 charge s\u00e9lectionnable moins courants dans la biblioth\u00e8que de base.",
     [
         ("Crunch machine", 3, 15),
         ("Rotation du buste machine", 3, 15),
         ("Extension lombaires machine", 3, 12),
         ("Leg curl debout", 3, 12),
         ("Kickback fessier machine", 3, 12),
         ("Chest press unilat\u00e9ral", 3, 10),
         ("Butterfly invers\u00e9 machine", 3, 15),
         ("Tirage vertical prise large", 3, 10),
         ("Tirage vertical prise serr\u00e9e", 3, 10),
     ]),
    ("Poulies \u2014 compl\u00e9ment",
     "Variantes de prise et d'angle sur la zone poulies.",
     [
         ("Tirage nuque poulie haute", 3, 12),
         ("Crossover poulie haute", 3, 12),
         ("Crossover poulie basse", 3, 12),
         ("Kickback triceps poulie", 3, 15),
         ("Curl unilat\u00e9ral poulie", 3, 12),
         ("Extension triceps unilat\u00e9rale poulie", 3, 12),
         ("Crunch \u00e0 la poulie haute", 3, 15),
         ("Rowing poulie basse prise large", 3, 12),
     ]),
    ("Halt\u00e8res & barre \u2014 compl\u00e9ment",
     "Zone charges libres : barres olympiques, halt\u00e8res, EZ, landmine.",
     [
         ("D\u00e9velopp\u00e9 d\u00e9clin\u00e9 halt\u00e8res", 3, 10),
         ("D\u00e9velopp\u00e9 Arnold", 3, 10),
         ("Rowing Yates", 3, 10),
         ("Curl inclin\u00e9 halt\u00e8res", 3, 12),
         ("Curl concentration", 3, 12),
         ("Curl barre EZ", 3, 12),
         ("\u00c9l\u00e9vations frontales halt\u00e8res", 3, 12),
         ("Shrugs halt\u00e8res", 3, 12),
         ("Shrugs barre", 3, 12),
         ("Pull-over halt\u00e8re", 3, 12),
         ("Good morning barre", 3, 10),
         ("Front squat barre", 3, 8),
         ("Soulev\u00e9 de terre classique", 3, 6),
         ("Soulev\u00e9 de terre sumo", 3, 6),
         ("Fentes lat\u00e9rales halt\u00e8res", 3, 10),
         ("Step-up halt\u00e8res", 3, 10),
         ("Landmine press", 3, 10),
         ("Landmine row", 3, 10),
         ("Kettlebell swing", 4, 15),
     ]),
]


def strip_accents(x):
    return ''.join(c for c in unicodedata.normalize('NFD', x)
                   if unicodedata.category(c) != 'Mn')


def ex_key(name):
    return re.sub(r'[^a-z0-9]+', ' ', strip_accents(name.lower())).strip()


# --- cles deja utilisees : EXERCISE_LIBRARY + PL_LIBRARY_GROUP + base videos ---
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
        keep.append('      { name: %s, mode: "%s", defaults: { sets: %d, reps: %d } }'
                    % (js(name), M, sets, reps))
    if not keep:
        continue
    added += len(keep)
    blocks.append('    { group: %s, note: %s, items: [\n%s\n    ] }'
                  % (js(group), js(note), ',\n'.join(keep)))

block = (
    '\n  // Machines libres et guidees d\'une salle Fitness Park (Gym80, Hammer,\n'
    '  // Technogym, Panatta, Smith, zone charges libres). Ajoute apres la base\n'
    '  // videos pour que la deduplication porte sur toute la bibliotheque.\n'
    '  [\n' + ',\n'.join(blocks) + '\n  ].forEach((g) => EXERCISE_LIBRARY.push(g));\n'
)

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
