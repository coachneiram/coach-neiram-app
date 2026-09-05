from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
marker = "\n  ];\n  function fmtExercise(ex) {"
if marker not in s:
    raise SystemExit('EXERCISE_LIBRARY closing marker not found')

if 'Golf — Mobilité & rotation' not in s:
    additions = r'''
    { group: "Golf — Mobilité & rotation", note: "Préparation spécifique au swing : thorax, hanches, épaules et chevilles.", items: [
      { name: "Open book rotation", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "Rotation thoracique quadrupédie", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "90/90 transitions hanches", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "90/90 rotation interne hanche", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "Fente avec rotation thoracique", mode: "pdc", defaults: { sets: 2, reps: 6 } },
      { name: "World's Greatest Stretch", mode: "pdc", defaults: { sets: 2, reps: 5 } },
      { name: "Mobilité cheville genou au mur", mode: "pdc", defaults: { sets: 2, reps: 10 } },
      { name: "Wall slide épaules", mode: "pdc", defaults: { sets: 2, reps: 10 } },
      { name: "Rotation épaules avec élastique", mode: "pdc", defaults: { sets: 2, reps: 10 } }
    ] },
    { group: "Golf — Force & puissance du swing", note: "Force, dissociation haut/bas du corps et production de puissance rotationnelle.", items: [
      { name: "Landmine rotation", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Woodchop câble haut vers bas", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Woodchop câble bas vers haut", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Med ball rotational throw", mode: "muscu", defaults: { sets: 4, reps: 5 } },
      { name: "Med ball scoop toss", mode: "muscu", defaults: { sets: 3, reps: 6 } },
      { name: "Cable lift rotationnel", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Split squat", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Bulgarian split squat", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Soulevé de terre roumain unilatéral", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Hip thrust", mode: "muscu", defaults: { sets: 3, reps: 10 } }
    ] },
    { group: "Golf — Gainage & stabilité", note: "Contrôle du bassin, anti-rotation, équilibre et transfert de force.", items: [
      { name: "Pallof press", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Pallof press en demi-genou", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Suitcase carry", mode: "muscu", defaults: { sets: 3, reps: 30, repUnit: "sec" } },
      { name: "Farmer carry unilatéral", mode: "muscu", defaults: { sets: 3, reps: 30, repUnit: "sec" } },
      { name: "Dead bug", mode: "pdc", defaults: { sets: 3, reps: 8 } },
      { name: "Bird dog avec pause", mode: "pdc", defaults: { sets: 3, reps: 8 } },
      { name: "Planche latérale", mode: "pdc", defaults: { sets: 3, reps: 30, repUnit: "sec" } },
      { name: "Hip airplane", mode: "pdc", defaults: { sets: 2, reps: 6 } },
      { name: "Équilibre unipodal yeux ouverts", mode: "pdc", defaults: { sets: 2, reps: 30, repUnit: "sec" } }
    ] },
    { group: "Golf — Endurance parcours", note: "Conditionnement pour maintenir la qualité technique et physique sur 18 trous.", items: [
      { name: "Marche inclinée tapis", mode: "cardio", fields: ["durationMin", "speedKmh", "inclinePct"], defaults: { durationMin: 20 } },
      { name: "Marche active", mode: "cardio", fields: ["durationMin", "speedKmh"], defaults: { durationMin: 30 } },
      { name: "Vélo endurance zone 2", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 25 } },
      { name: "Rameur endurance", mode: "cardio", fields: ["durationMin", "level", "distanceM"], defaults: { durationMin: 15 } }
    ] },
    { group: "Échauffement / Warm-up", note: "À placer en début de séance. Général ou spécifique golf avant le travail principal.", items: [
      { name: "Respiration diaphragmatique", mode: "warmup", defaults: { sets: 1, reps: 60, repUnit: "sec" } },
      { name: "Marche dynamique", mode: "warmup", defaults: { sets: 1, reps: 120, repUnit: "sec" } },
      { name: "Montées de genoux contrôlées", mode: "warmup", defaults: { sets: 1, reps: 30 } },
      { name: "Talons-fesses contrôlés", mode: "warmup", defaults: { sets: 1, reps: 30 } },
      { name: "Cercles de bras", mode: "warmup", defaults: { sets: 1, reps: 10 } },
      { name: "Cat-cow dynamique", mode: "warmup", defaults: { sets: 1, reps: 8 } },
      { name: "Rotation thoracique debout", mode: "warmup", defaults: { sets: 1, reps: 8 } },
      { name: "Squat poids du corps", mode: "warmup", defaults: { sets: 1, reps: 10 } },
      { name: "Fente arrière dynamique", mode: "warmup", defaults: { sets: 1, reps: 6 } },
      { name: "World's Greatest Stretch dynamique", mode: "warmup", defaults: { sets: 1, reps: 5 } },
      { name: "90/90 dynamique", mode: "warmup", defaults: { sets: 1, reps: 6 } },
      { name: "Mobilité cheville dynamique", mode: "warmup", defaults: { sets: 1, reps: 10 } },
      { name: "Monster walk élastique", mode: "warmup", defaults: { sets: 1, reps: 10 } },
      { name: "Pallof press léger", mode: "warmup", defaults: { sets: 1, reps: 8 } },
      { name: "Rotations avec club de golf", mode: "warmup", defaults: { sets: 1, reps: 10 } },
      { name: "Demi-swings progressifs", mode: "warmup", defaults: { sets: 2, reps: 8 } },
      { name: "Swings progressifs 50 → 75 → 90 %", mode: "warmup", defaults: { sets: 3, reps: 5 } }
    ] },'''
    s = s.replace(marker, additions + marker, 1)

old_select = 'React.createElement("option", { value: "muscu" }, "Muscu"), /* @__PURE__ */ React.createElement("option", { value: "pdc" }, "PDC"), /* @__PURE__ */ React.createElement("option", { value: "cardio" }, "Cardio")'
new_select = old_select + ', /* @__PURE__ */ React.createElement("option", { value: "warmup" }, "Warm-up")'
if 'value: "warmup"' not in s:
    if old_select not in s:
        raise SystemExit('exercise mode selector not found')
    s = s.replace(old_select, new_select, 1)

s = s.replace('gridTemplateColumns: mode === "pdc" ? "1fr 1fr 1fr" : "1fr 1fr 0.8fr 1fr"', 'gridTemplateColumns: mode === "pdc" || mode === "warmup" ? "1fr 1fr 1fr" : "1fr 1fr 0.8fr 1fr"', 1)
s = s.replace('mode !== "pdc" && /* @__PURE__ */ React.createElement("div"', 'mode !== "pdc" && mode !== "warmup" && /* @__PURE__ */ React.createElement("div"', 1)

p.write_text(s, encoding='utf-8')
print('Training library and warm-up updates applied.')
