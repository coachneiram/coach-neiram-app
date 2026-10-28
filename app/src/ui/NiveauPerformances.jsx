/**
 * Niveau d'une performance face aux grilles officielles (lib/niveaux.js),
 * repris de l'app Neiram le 24/10/2026 : blocs réutilisés par « Mes
 * performances » et « Force athlétique ». Tout est inclus dans l'app coach.
 *
 * Chaque bloc nomme sa source (fédération et saison) : un niveau sans
 * source ne vaut rien pour un compétiteur.
 */

import { COLORS, POLICES } from "../tokens.js";
import { LIBELLES_AGE, niveauCourse, niveauFFForce, niveauFFHM, niveauNatation, pointsGL, pointsSinclair } from "../lib/niveaux.js";
import { TEXTES_PERF as T } from "../lib/textes-performances.js";
import { resumeSourcesDiscipline } from "../lib/sources-baremes.js";
import { todayISO } from "../lib/dates.js";

function Ligne({ children, couleur = COLORS.textMuted, gras }) {
  return <div style={{ fontSize: 12, color: couleur, fontWeight: gras ? 700 : 400, lineHeight: 1.5, marginTop: 3 }}>{children}</div>;
}

const stylePalier = (atteint) => ({
  fontSize: 10.5,
  padding: "2px 6px",
  borderRadius: 6,
  border: `1px solid ${atteint ? COLORS.gold : COLORS.border}`,
  color: atteint ? COLORS.gold : COLORS.textFaint,
  fontFamily: POLICES.chiffres
});

/** Les marches d'une grille, atteintes en or. */
function Paliers({ paliers }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {paliers.map((p) => (
        <span key={p.id} title={T.kg(p.kg)} style={stylePalier(p.atteint)}>
          {p.id} {T.kg(p.kg)}
        </span>
      ))}
    </div>
  );
}

const sexeDe = (profil) => (profil && profil.sex === "femme" ? "femme" : "homme");

/** Force athlétique : niveau FFForce du total et du développé couché, points IPF GL. */
export function NiveauForce({ total, bench, profil = {}, poidsKg }) {
  const sexe = sexeDe(profil);
  const n = niveauFFForce({ discipline: "FA", sexe, age: profil.age, poids: poidsKg, valeur: total });
  const dc = niveauFFForce({ discipline: "DC", sexe, age: profil.age, poids: poidsKg, valeur: bench });
  if (!poidsKg) return <Ligne>{T.sansPoids}</Ligne>;
  if (!total && !bench) return <Ligne>{T.forceVide}</Ligne>;
  const gl = total ? pointsGL(total, poidsKg, sexe) : null;
  return (
    <div data-niveau-force>
      {n && (
        <>
          <Ligne couleur={COLORS.text} gras>
            {T.forceTotal(total, n)}
          </Ligne>
          <Ligne>{T.forceCategorie(LIBELLES_AGE[n.categorieAge], n)}</Ligne>
          {n.prochain && <Ligne couleur={COLORS.gold}>{T.prochain(n.prochain)}</Ligne>}
          {n.qualificationFrance ? <Ligne>{T.qualifFrance(n.qualificationFrance)}</Ligne> : <Ligne>{T.franceElite}</Ligne>}
          <Paliers paliers={n.paliers} />
        </>
      )}
      {gl && <Ligne>{T.pointsGL(gl)}</Ligne>}
      {dc && bench > 0 && <Ligne>{T.developpe(bench, dc)}</Ligne>}
    </div>
  );
}

/** Haltérophilie : série FFHM du total et points Sinclair. */
export function NiveauHalterophilie({ total, profil = {}, poidsKg }) {
  const sexe = sexeDe(profil);
  const n = niveauFFHM({ sexe, age: profil.age, poids: poidsKg, valeur: total });
  if (!poidsKg) return <Ligne>{T.sansPoids}</Ligne>;
  if (!total) return <Ligne>{T.haltVide}</Ligne>;
  const sinclair = pointsSinclair(total, poidsKg, sexe);
  return (
    <div data-niveau-halterophilie>
      {n && !n.horsGrille && (
        <>
          <Ligne couleur={COLORS.text} gras>
            {T.haltTotal(total, n)}
          </Ligne>
          <Ligne>{T.haltCategorie(n)}</Ligne>
          {n.prochain && <Ligne couleur={COLORS.gold}>{T.haltProchaine(n.prochain)}</Ligne>}
          {n.qualificationFrance && <Ligne>{T.haltFrance(n)}</Ligne>}
          <Paliers paliers={n.paliers} />
        </>
      )}
      {n && n.horsGrille && <Ligne>{T.haltHorsGrille}</Ligne>}
      {sinclair && <Ligne>{T.sinclair(sinclair)}</Ligne>}
    </div>
  );
}

/** Course : niveau du barème FFA et minima des championnats de France. */
export function NiveauCourse({ id, secondes, profil = {} }) {
  const n = niveauCourse(id, secondes, sexeDe(profil), profil.age);
  if (!n) return null;
  return (
    <div data-niveau-course={id} style={{ marginTop: 2 }}>
      <Ligne>
        {T.ffa}
        <strong style={{ color: COLORS.text }}>{n.atteint ? n.atteint.id : T.sousD7}</strong>
        {n.prochain ? T.ffaProchain(n.prochain) : ""}
      </Ligne>
      {n.minimaFrance && <Ligne couleur={n.minimaFrance.atteint ? COLORS.good : COLORS.textMuted}>{T.minima(n)}</Ligne>}
    </div>
  );
}

/** Natation : points World Aquatics, repères FFN en bassin de 50 m. */
export function NiveauNatation({ id, secondes, profil = {} }) {
  const n = niveauNatation(id, secondes, sexeDe(profil));
  if (!n) return null;
  return (
    <div data-niveau-natation={id} style={{ marginTop: 2 }}>
      <Ligne>
        {T.worldAquatics}
        <strong style={{ color: COLORS.text }}>{n.points}</strong>
        {T.recordMonde}
      </Ligne>
      {n.reperes.map((r) => (
        <Ligne key={r.id} couleur={r.atteint ? COLORS.good : COLORS.textMuted}>
          {T.repere(r)}
        </Ligne>
      ))}
    </div>
  );
}

/**
 * D'où viennent les barèmes de la discipline, quand ils ont été relevés, et
 * l'avertissement quand une saison a pu changer (lib/sources-baremes.js).
 */
export function SourcesBaremes({ discipline }) {
  const r = resumeSourcesDiscipline(discipline, todayISO());
  if (!r) return null;
  return (
    <div data-sources-baremes={discipline} style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10.5, color: COLORS.textFaint, lineHeight: 1.5 }}>{r.texte}</div>
      {r.avertissement && <div style={{ fontSize: 10.5, color: COLORS.warn, lineHeight: 1.5, marginTop: 2 }}>{r.avertissement}</div>}
    </div>
  );
}
