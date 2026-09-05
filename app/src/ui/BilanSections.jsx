/**
 * Affichage d'un bilan redige par l'IA.
 *
 * Portage fidele de SectionedBilan (index.html, ligne 4245).
 *
 * REGRESSION DE LA BASCULE : ce bloc n'avait pas ete porte du tout. Meme
 * si la generation avait fonctionne, le client n'aurait jamais vu son
 * bilan — l'ecran Tendances ne savait pas l'afficher.
 *
 * Les couleurs portent le sens : vert pour ce qui va, ambre pour ce qu'il
 * faut surveiller, rouge pour ce qu'il faut corriger, or pour les actions.
 * Une section vide disparait plutot que d'afficher un titre sans contenu.
 */

import { COLORS } from "../tokens.js";

const GROUPES = [
  { cle: "points_forts", titre: "Points forts", couleur: COLORS.good },
  { cle: "vigilance", titre: "Vigilance", couleur: COLORS.warn },
  { cle: "a_corriger", titre: "À corriger", couleur: COLORS.bad }
];

const styleTitre = (couleur) => ({
  fontSize: 11,
  fontWeight: 600,
  color: couleur,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6
});

export function BilanSections({ sections }) {
  if (!sections) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sections.resume && (
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: COLORS.text, margin: 0 }}>{sections.resume}</p>
      )}

      {sections.evolution && (
        <div>
          <div style={styleTitre(COLORS.textMuted)}>Évolution</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: COLORS.textMuted, margin: 0 }}>
            {sections.evolution}
          </p>
        </div>
      )}

      {GROUPES.map(
        (g) =>
          (sections[g.cle] || []).length > 0 && (
            <div key={g.cle}>
              <div style={styleTitre(g.couleur)}>{g.titre}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {sections[g.cle].map((ligne, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: g.couleur, marginTop: 5, fontSize: 8 }}>●</span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.text }}>{ligne}</span>
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {(sections.actions || []).length > 0 && (
        <div>
          <div style={styleTitre(COLORS.gold)}>Actions pour la semaine prochaine</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sections.actions.map((ligne, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <span
                  style={{ color: COLORS.gold, fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 600 }}
                >
                  {i + 1}.
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.text }}>{ligne}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
