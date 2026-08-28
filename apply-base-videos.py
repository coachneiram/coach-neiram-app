# -*- coding: utf-8 -*-
"""Alimente la bibliotheque d'exercices de l'app avec la base videos du Google Sheets.

- ajoute EXERCISE_VIDEO_SOURCE (nom -> lien YouTube), issu de l'onglet "Base Videos"
- construit EXERCISE_VIDEOS (index par exKey) et le helper videoFor()
- pousse un groupe "Base videos Coach Neiram" avec les exercices absents de la bibliotheque
- affiche un bouton lecture dans la modale Bibliotheque quand une video existe
"""
import io

P = '/home/claude/chk/coach-neiram-app-main/index.html'
s = io.open(P, encoding='utf-8').read()
orig = s

B = "https://youtube.com/shorts/"

# (nom exact du Sheets, id de la video ou None)
ROWS = [
    ("Abducteurs", "EqeOEtjAT1Y"), ("Adducteurs", "IARHerJ1_Ww"), ("Bench", None),
    ("Bench 2CT", None), ("Bench 4/2/0", None), ("Butterfly", "Z1AohjrZAQg"),
    ("Chest press", "PESSmrxQSAw"), ("Chest press debout", "l-Vk6_V3J6Y"),
    ("Comp Bench", None), ("Comp DL", None), ("Comp Squat", None),
    ("Curl biceps rotatiton", None), ("Curl marteau", "PYvRjPDa-GE"),
    ("Curl marteau corde", "PYvRjPDa-GE"), ("Curl marteau corde + Halteres", None),
    ("Curl marteau haltères", "VysBBkBHNnQ"), ("Curl pupitre", "vmoEP-ME2Hg"),
    ("Deadlift", None), ("Développé épaule machine", "gv4uJjNcEc0"),
    ("Développé épaules", "gv4uJjNcEc0"), ("Développé incliné machine", None),
    ("Développé militaire", "gqJT6D1DbeQ"), ("Dips", None),
    ("Dips assistées", "VkFtPkBOUOg"), ("Dips machine", "j4LMR8rdwOg"),
    ("Élévations frontales", "HKBWKsRzcgM"), ("Élévations latérales", "wGLidlVqI9s"),
    ("Extension triceps", "vkqd9_iTJ3k"), ("Facepull", "5Rr1Meo0dLQ"),
    ("Fentes arrière", None), ("Fentes bulgares", "BYJ3X_rGQkE"),
    ("Fentes unilaterales", "r3aZfPPVmQg"), ("Gainage", "XLDAZHTMdyE"),
    ("Hip thrust", "rA6QacIDBPE"), ("Larsen 4/2/0", None),
    ("Leg curl", "8oqpMStSWz0"), ("Leg curl + pause", None),
    ("Leg curl allongé", "p6geLJ-JRIM"), ("Leg curl unilatéral", "4ww4zAN8VaQ"),
    ("Leg extension", "meOJ_9YLPcw"), ("Leg extension + pause", None),
    ("Leg extension unilatéral", "51TgSnzAxUw"), ("Lombaires + pause", None),
    ("Lombaires lestés", None), ("Mollets assis", "JVDPgb5hy6k"),
    ("Mountain climber", "E6kOnrApXfY"), ("Paused Squat 3CT", None),
    ("Pendulum", "vHzfMG3BxB0"), ("Pendulum ou V Squat", None),
    ("Planche frontale", None), ("Pompes", "BZ2QZfLgfsI"),
    ("Pompes prise larges", "ue0NiIiID2Y"), ("Poulies vis à vis", None),
    ("Presse à cuisses", "YuLA9MY2sXg"), ("Presse unilatérale", None),
    ("RDL", "OVYq-Gi0A28"), ("Rowing barre pronation", None),
    ("Semi Sumo DL", None), ("Semi Sumo Paused DL", None),
    ("Squat", "NCDdI_ZzxXY"), ("Squat 3/1/0", None), ("T bar", "H4j-mSeLa24"),
    ("T bar 0/1/3", None), ("Tapis marche inclinée", None),
    ("Tirage dos unilatéral", "rYSq3nioAYc"), ("Tirage haut", "AvPSy_BlzjM"),
    ("Tirage horizontal", "IGUfxUfuNBs"), ("Tirage menton", "Bi32YLvMf1M"),
    ("Tirage menton poulie basse", "Bi32YLvMf1M"), ("Tirage vertical", "JdN64Ad98W8"),
    ("Tirage vertical pronation + supination", None),
    ("Tirage vertical supination", "rtd3XPQG9EA"),
    ("Tirage vertical unilatéral", "uUItT-_l_DA"), ("Tractions assistées", "I2jy0artTIQ"),
    ("Développé militaire machine", "wwuzkOtrMgw"), ("V Squat", "LOfNG1eWSZ8"),
    ("Pompes prise serrée", "9NVkVWuCHMw"), ("Curl biceps rotation", "K6iGNC1tid0"),
    ("Traineau", "8AgKPiZgNSI"), ("Tirage dos au sol", "_LMPOeR_DdA"),
    ("Chaise", "ptQeP4hokPc"), ("Montée sur pointe", "cf2usMSBeMc"),
    ("Extension lombaires", "P8_GzApYDf0"), ("Curl biceps poulies basse", "FqvatjRUhB4"),
    ("Leg curl assis", "8oqpMStSWz0"), ("Presse horizontale", "YuLA9MY2sXg"),
    ("Chest press convergent", "PESSmrxQSAw"), ("Développé couché barre", "C3L_5cza3Q0"),
    ("Tirage horizontal unilatéral", "rYSq3nioAYc"),
    ("Presse à cuisses inclinée", "fRxbecOYJ3Y"), ("Belt squat", "Rg41r2i_ZBU"),
    ("Développé épaules debout", "CgHTZnOcxVo"),
    ("Élévations latérales machine", "JdFKx_QvXuE"),
    ("Chest press incliné", "BxkT0eKWPxw"), ("Chest press allongé", "oz6HnDyW8VU"),
    ("Tirage vertical pronation", "JdN64Ad98W8"),
    ("Développé incliné haltères", "ImbzBExlwZQ"),
    ("Tirage dos poulie haute", "N2DIh8ETS0Q"),
    ("Tirage dos poulie basse", "brSP-yszxCk"), ("Tractions", "6JsOgiFnnfA"),
    ("Triceps extension", "vkqd9_iTJ3k"), ("Rowing supination", "ERODBSgTdBQ"),
    ("Rowing pronation", "vrvrgu-THt8"), ("Dips sur banc", "RpL4sCl1V-M"),
    ("Tirage bucheron", "97bGsPyUikA"),
    ("Développé militaire haltères", "gqJT6D1DbeQ"),
    ("Développé couché haltères", "nXM5LBIkwCY"), ("Lombaires", "P8_GzApYDf0"),
    ("Curl biceps", "FqvatjRUhB4"), ("Gobelet Squat", "Q_5o2CrwiTQ"),
    ("RDL aux haltères", "OVYq-Gi0A28"),
]

# modes et reglages par defaut hors muscu
PDC = ["Dips", "Tractions", "Pompes", "Pompes prise larges", "Pompes prise serrée",
       "Dips sur banc", "Mountain climber", "Montée sur pointe", "Fentes arrière",
       "Extension lombaires", "Lombaires", "Lombaires + pause", "Lombaires lestés",
       "Tirage dos au sol", "Traineau"]
TIME = ["Gainage", "Chaise", "Planche frontale"]
CARDIO = ["Tapis marche inclinée"]


def js(v):
    return '"' + v.replace('\\', '\\\\').replace('"', '\\"') + '"'


lines = []
for name, vid in ROWS:
    if name in CARDIO:
        mode = 'cardio'
    elif name in TIME or name in PDC:
        mode = 'pdc'
    else:
        mode = 'muscu'
    if name in TIME:
        d = '{ sets: 3, reps: 30, repUnit: "sec" }'
    elif mode == 'pdc':
        d = '{ sets: 3, reps: 12 }'
    elif mode == 'cardio':
        d = '{ sets: 1, reps: "" }'
    else:
        d = '{ sets: 3, reps: 10 }'
    url = js(B + vid) if vid else 'null'
    lines.append('    { name: %s, mode: "%s", video: %s, defaults: %s }' % (js(name), mode, url, d))

block = (
    '\n  // Base videos Coach Neiram - reprise de l\'onglet "Base Videos" du Google Sheets\n'
    '  // du programme. Un exercice = un lien, une seule fois : la meme cle sert a\n'
    '  // retrouver la video depuis n\'importe quel exercice deja present ailleurs\n'
    '  // dans la bibliotheque, sans dupliquer la ligne.\n'
    '  const EXERCISE_VIDEO_SOURCE = [\n'
    + ',\n'.join(lines) + '\n  ];\n'
    '  const EXERCISE_VIDEOS = EXERCISE_VIDEO_SOURCE.reduce((acc, it) => {\n'
    '    if (it.video) acc[exKey(it.name)] = it.video;\n'
    '    return acc;\n'
    '  }, {});\n'
    '  const videoFor = (name) => EXERCISE_VIDEOS[exKey(name)] || null;\n'
    '  (() => {\n'
    '    const known = LIBRARY_NAMES();\n'
    '    const seen = /* @__PURE__ */ new Set();\n'
    '    const items = EXERCISE_VIDEO_SOURCE.filter((it) => {\n'
    '      const k = exKey(it.name);\n'
    '      if (known.has(k) || seen.has(k)) return false;\n'
    '      seen.add(k);\n'
    '      return true;\n'
    '    }).map((it) => ({ name: it.name, mode: it.mode, defaults: it.defaults }));\n'
    '    if (items.length) EXERCISE_LIBRARY.push({ group: "Base vid\\xE9os Coach Neiram", '
    'note: "Exercices de ton Google Sheets. Le bouton \\u25B6 ouvre la d\\xE9mo YouTube.", items });\n'
    '  })();\n'
)

anchor = '  EXERCISE_LIBRARY.push(PL_LIBRARY_GROUP);\n'
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + block, 1)

# --- bouton video dans la modale Bibliotheque ---------------------------------
old = ('      if (!group.custom) return /* @__PURE__ */ React.createElement(React.Fragment, '
       '{ key: item.name }, pick);\n')
assert s.count(old) == 1
new = (
    '      const vid = videoFor(item.name);\n'
    '      const playBtn = vid ? /* @__PURE__ */ React.createElement("button", '
    '{ onClick: () => window.open(vid, "_blank", "noopener"), "aria-label": "Voir la d\\xE9mo", '
    'style: { background: "none", border: "none", color: COLORS.gold, cursor: "pointer", '
    'padding: 6, display: "flex", flexShrink: 0, fontSize: 13 } }, "\\u25B6") : null;\n'
    '      if (!group.custom) return /* @__PURE__ */ React.createElement("div", '
    '{ key: item.name, style: { display: "flex", alignItems: "center", gap: 2, '
    'background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, '
    'paddingRight: vid ? 4 : 0 } }, pick, playBtn);\n'
)
s = s.replace(old, new, 1)

# le bouton pick porte deja son propre fond : on l'enleve pour eviter le double cadre
old2 = ('background: group.custom ? "none" : COLORS.bgAlt, border: group.custom ? "none" : '
        '`1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 11px"')
assert s.count(old2) == 1
s = s.replace(old2, 'background: "none", border: "none", borderRadius: 8, padding: "9px 11px"', 1)

s = s.replace('2026-08-28.01-seances-sheets', '2026-08-28.02-base-videos', 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('exercices source :', len(ROWS))
print('avec video       :', sum(1 for _, v in ROWS if v))
print('delta octets     :', len(s) - len(orig))
