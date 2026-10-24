/**
 * Performances, niveau officiel et transformation dans le bilan envoyé au
 * coach (24 octobre 2026, demande du coach : « envoyer les performances et
 * le niveau atteint au coach », « excellent pour le bilan »).
 *
 * Passe par le bilan que le client partage déjà (lib/bilan-html.js) : pas
 * de nouvel envoi automatique, donc rien à changer au script Google.
 */

import { EPREUVES, fmtTemps, maxisRetenus } from "./performances.js";
import { niveauCourse, niveauFFForce, niveauFFHM, niveauNatation, pointsGL, pointsSinclair } from "./niveaux.js";
import { periodes, transformation } from "./transformation.js";

const kg = (v) => `${String(v).replace(".", ",")} kg`;
const pts = (v) => String(v).replace(".", ",");

export function lignesPerformancesBilan({ performances = {}, maxisForce, seances, profil = {}, poidsKg, bodyLogs, date }) {
  const lignes = [];
  const sexe = profil.sex === "femme" ? "femme" : "homme";

  const m = maxisRetenus(maxisForce, seances);
  if (m.total) {
    const n = niveauFFForce({ discipline: "FA", sexe, age: profil.age, poids: poidsKg, valeur: m.total });
    const gl = poidsKg ? pointsGL(m.total, poidsKg, sexe) : null;
    const estime = Object.values(m.source).includes("estime") ? " (en partie estimé depuis les séries)" : "";
    lignes.push(
      `Force athlétique : total ${kg(m.total)} — squat ${kg(m.squat)}, développé couché ${kg(m.bench)}, soulevé de terre ${kg(m.deadlift)}${estime}` +
        (n ? ` · FFForce : ${n.atteint ? `${n.atteint.libelle} (${n.atteint.id})` : "départemental"}` : "") +
        (gl ? ` · ${pts(gl)} pts IPF GL` : "")
    );
  }

  const a = performances.halt_arrache;
  const e = performances.halt_epj;
  if (a && e) {
    const total = a.valeur + e.valeur;
    const n = niveauFFHM({ sexe, age: profil.age, poids: poidsKg, valeur: total });
    const s = poidsKg ? pointsSinclair(total, poidsKg, sexe) : null;
    lignes.push(
      `Haltérophilie : arraché ${kg(a.valeur)}, épaulé-jeté ${kg(e.valeur)}, total ${kg(total)}` +
        (n && !n.horsGrille ? ` · FFHM : ${n.atteint ? `série ${n.atteint.libelle}` : "sous Débutant"}` : "") +
        (s ? ` · Sinclair ${pts(s)}` : "")
    );
  }

  for (const ep of EPREUVES) {
    const p = performances[ep.id];
    if (!p || ep.discipline === "halterophilie") continue;
    if (ep.discipline === "course") {
      const n = niveauCourse(ep.id, p.valeur, sexe, profil.age);
      lignes.push(`Course ${ep.label} : ${fmtTemps(p.valeur)}${n ? ` · FFA ${n.atteint ? n.atteint.id : "sous D7"}` : ""}`);
    } else if (ep.discipline === "natation") {
      const n = niveauNatation(ep.id, p.valeur, sexe);
      lignes.push(`Natation ${ep.label} (bassin ${ep.bassin} m) : ${fmtTemps(p.valeur)}${n ? ` · ${n.points} pts World Aquatics` : ""}`);
    }
  }

  if (date) {
    const t = transformation({ bodyLogs: bodyLogs || [], profil, ...periodes(date).j90 });
    if (t && (t.gras || t.muscle)) {
      const morceaux = [];
      if (t.gras) morceaux.push(t.gras.perduKg >= 0 ? `${kg(t.gras.perduKg)} de gras perdus` : `${kg(-t.gras.perduKg)} de gras pris`);
      if (t.muscle) morceaux.push(`${t.muscle.prisKg >= 0 ? "+" : ""}${kg(t.muscle.prisKg)} de ${t.muscle.source === "muscle" ? "muscle" : "masse maigre"}`);
      lignes.push(`Transformation sur ${t.jours} jours : ${morceaux.join(", ")} (poids ${kg(t.poids.avant)} → ${kg(t.poids.apres)})`);
    }
  }
  return lignes;
}
