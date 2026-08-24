from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

library = r'''  const EXERCISE_LIBRARY = [
    { group: "Machines guidées — haut du corps", note: "Bibliothèque Coach Neiram — exercices courants en salle.", items: [
      { name: "Développé poitrine machine", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Développé incliné machine", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Pec deck / écarté machine", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Tirage vertical poitrine", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Tirage horizontal assis", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Rowing machine convergente", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Tirage vertical prise neutre", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Pullover machine", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Développé épaules machine", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Élévations latérales machine", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Oiseau machine", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Curl biceps machine", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Extension triceps machine", mode: "muscu", defaults: { sets: 3, reps: 12 } }
    ] },
    { group: "Machines guidées — bas du corps", note: "Amplitude confortable et exécution contrôlée.", items: [
      { name: "Presse à cuisses", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Hack squat machine", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Leg extension", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Leg curl assis", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Leg curl allongé", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Hip thrust machine", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Abducteurs machine", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Adducteurs machine", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Mollets à la presse", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Mollets debout machine", mode: "muscu", defaults: { sets: 3, reps: 15 } }
    ] },
    { group: "Haltères / barre", note: "Charge à adapter au niveau du client et à la qualité d'exécution.", items: [
      { name: "Développé couché haltères", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Développé incliné haltères", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Développé couché barre", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Développé incliné barre", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Développé militaire haltères", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Développé militaire barre", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Élévations latérales haltères", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Oiseau haltères", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Rowing haltère un bras", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Rowing barre", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Soulevé de terre roumain", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Soulevé de terre trap bar", mode: "muscu", defaults: { sets: 3, reps: 6 } },
      { name: "Squat goblet", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Squat barre", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Fentes marchées haltères", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Fentes arrière haltères", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Bulgarian split squat", mode: "muscu", defaults: { sets: 3, reps: 8 } },
      { name: "Hip thrust barre", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Curl biceps haltères", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Curl marteau haltères", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Extension triceps au-dessus de la tête", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Skull crushers barre", mode: "muscu", defaults: { sets: 3, reps: 10 } }
    ] },
    { group: "Poulies / câbles", note: "Réglage selon la morphologie et l'objectif.", items: [
      { name: "Chest press à la poulie", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Écarté poulie vis-à-vis", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Tirage vertical poulie", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Rowing poulie basse", mode: "muscu", defaults: { sets: 3, reps: 10 } },
      { name: "Face pull", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Élévation latérale poulie", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Curl poulie basse", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Curl poulie corde", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Extension triceps corde", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Extension triceps barre", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Pull-over à la poulie haute", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Woodchop à la poulie", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Pallof press", mode: "muscu", defaults: { sets: 3, reps: 12 } },
      { name: "Kickback fessier à la poulie", mode: "muscu", defaults: { sets: 3, reps: 15 } },
      { name: "Abduction hanche à la poulie", mode: "muscu", defaults: { sets: 3, reps: 15 } }
    ] },
    { group: "Poids du corps / fonctionnel", note: "Réglage des répétitions ou du temps selon le niveau.", items: [
      { name: "Burpees", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Pompes", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Pompes inclinées", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Pompes genoux", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Squats au poids du corps", mode: "pdc", defaults: { sets: 3, reps: 15 } },
      { name: "Squats tempo", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Fentes alternées", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Fentes arrière", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Step-up", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Squat jump", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Jumping jacks", mode: "pdc", defaults: { sets: 3, reps: 30 } },
      { name: "Mountain climbers", mode: "pdc", defaults: { sets: 3, reps: 30 } },
      { name: "Skater jumps", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Box jumps", mode: "pdc", defaults: { sets: 3, reps: 8 } },
      { name: "Dips sur banc", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Tractions", mode: "pdc", defaults: { sets: 3, reps: 6 } },
      { name: "Tractions assistées", mode: "pdc", defaults: { sets: 3, reps: 8 } },
      { name: "Gainage planche", mode: "pdc", defaults: { sets: 3, reps: 45, repUnit: "sec" } },
      { name: "Gainage latéral", mode: "pdc", defaults: { sets: 3, reps: 30, repUnit: "sec" } },
      { name: "Dead bug", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Bird dog", mode: "pdc", defaults: { sets: 3, reps: 10 } },
      { name: "Glute bridge", mode: "pdc", defaults: { sets: 3, reps: 15 } },
      { name: "Hip thrust au poids du corps", mode: "pdc", defaults: { sets: 3, reps: 15 } },
      { name: "Crunchs", mode: "pdc", defaults: { sets: 3, reps: 15 } },
      { name: "Reverse crunch", mode: "pdc", defaults: { sets: 3, reps: 12 } },
      { name: "Russian twists", mode: "pdc", defaults: { sets: 3, reps: 20 } },
      { name: "Superman", mode: "pdc", defaults: { sets: 3, reps: 15 } },
      { name: "Chaise contre le mur", mode: "pdc", defaults: { sets: 3, reps: 45, repUnit: "sec" } }
    ] },
    { group: "Cardio / Ergomètres", note: "Réglages indicatifs — à adapter au niveau et à l'objectif.", items: [
      { name: "Marche inclinée (tapis)", mode: "cardio", fields: ["durationMin", "speedKmh", "inclinePct"], defaults: { durationMin: 20, speedKmh: 5.5, inclinePct: 10 } },
      { name: "Course sur tapis", mode: "cardio", fields: ["durationMin", "speedKmh", "inclinePct"], defaults: { durationMin: 20, speedKmh: 9, inclinePct: 1 } },
      { name: "Vélo droit / assis", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 20, level: 8 } },
      { name: "Vélo RPM / spinning", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 30, level: 10 } },
      { name: "Elliptique", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 20, level: 8 } },
      { name: "Rameur (Skillrow)", mode: "cardio", fields: ["durationMin", "level", "distanceM"], defaults: { durationMin: 15, level: 5 } },
      { name: "Rameur — distance", mode: "cardio", fields: ["distanceM", "durationMin"], defaults: { distanceM: 1000, durationMin: 5 } },
      { name: "Escalier (Climb)", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 15, level: 7 } },
      { name: "Skillmill (tapis non motorisé)", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 10, level: 5 } },
      { name: "Assault bike / Air bike", mode: "cardio", fields: ["durationMin", "level"], defaults: { durationMin: 10, level: 8 } },
      { name: "Corde à sauter", mode: "cardio", fields: ["durationMin"], defaults: { durationMin: 10 } }
    ] },
    { group: "Mobilité / activation", note: "Échauffement, récupération ou travail de mobilité selon le besoin.", items: [
      { name: "Mobilité cheville contre mur", mode: "pdc", defaults: { sets: 2, reps: 10 } },
      { name: "90/90 hanches", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "Rotation thoracique quadrupédie", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "Cat-cow", mode: "pdc", defaults: { sets: 2, reps: 10 } },
      { name: "Pont fessier activation", mode: "pdc", defaults: { sets: 2, reps: 15 } },
      { name: "Clamshell", mode: "pdc", defaults: { sets: 2, reps: 15 } },
      { name: "Monster walk", mode: "pdc", defaults: { sets: 2, reps: 12 } },
      { name: "Bird dog contrôlé", mode: "pdc", defaults: { sets: 2, reps: 8 } },
      { name: "Planche latérale courte", mode: "pdc", defaults: { sets: 2, reps: 20, repUnit: "sec" } },
      { name: "Respiration diaphragmatique", mode: "pdc", defaults: { sets: 2, reps: 60, repUnit: "sec" } }
    ] }
  ];'''

pattern = r"  const EXERCISE_LIBRARY = \[.*?\n  \];\n  function fmtExercise"
new_text, count = re.subn(pattern, library + "\n  function fmtExercise", text, count=1, flags=re.S)
if count != 1:
    raise SystemExit('EXERCISE_LIBRARY block not found; no changes made')
path.write_text(new_text, encoding='utf-8')
print('Exercise library restored: 109+ exercises')
