/**
 * Raccourcis (repris de l'app Neiram le 24/10/2026, partie web seulement).
 *
 * L'app de coaching est une PWA : pas de Siri, pas de raccourcis iOS
 * natifs, pas de schéma neiram:// enregistré auprès du téléphone. Il reste
 * deux portes d'entrée, qui aboutissent toutes deux à une adresse :
 *   - l'appui long sur l'icône de l'app installée (Android, Chrome) : les
 *     « shortcuts » du manifeste (app/public/manifest.json) ;
 *   - un lien ou un favori : ./?raccourci=eau&ml=250.
 *
 *   ?raccourci=eau&ml=250   ajoute de l'eau au jour (50 à 1000 ml, 250 par défaut)
 *   ?raccourci=seance       ouvre la séance du jour (sinon Séances)
 *   ?raccourci=repas        ouvre l'ajout d'un aliment au repas de l'heure
 *   ?raccourci=poids        ouvre Mesures
 *   ?raccourci=sommeil      ouvre Sommeil
 *
 * En interne, l'adresse devient un lien « raccourci://<action>?… » (simple
 * représentation, aucun schéma déclaré au téléphone). Un lien inconnu ou
 * mal formé est ignoré : il ne doit jamais rien écrire.
 */

export const PREFIXE_LIEN = "raccourci://";

/**
 * `titre` et `court` sont repris tels quels dans les « shortcuts » du
 * manifeste (vérifié par tests/raccourcis.test.mjs).
 */
export const ACTIONS_RACCOURCIS = [
  { id: "eau", titre: "Ajouter un verre d'eau", court: "Eau", onglet: "journal", adresse: "./?raccourci=eau&ml=250" },
  { id: "seance", titre: "Lancer ma séance", court: "Séance", onglet: "entrainements", adresse: "./?raccourci=seance" },
  { id: "repas", titre: "Noter un repas", court: "Repas", onglet: "journal", adresse: "./?raccourci=repas" },
  { id: "poids", titre: "Noter mon poids", court: "Poids", onglet: "mensurations", adresse: "./?raccourci=poids" },
  { id: "sommeil", titre: "Noter mon sommeil", court: "Sommeil", onglet: "sommeil", adresse: "./?raccourci=sommeil" }
];

export const EAU_PAR_DEFAUT_ML = 250;
const EAU_MIN_ML = 50;
const EAU_MAX_ML = 1000;

/** Paramètres d'adresse propres aux raccourcis, retirés après traitement. */
const PARAMETRES = ["raccourci", "ml"];

/** Lit un lien de raccourci ; rend null si ce n'en est pas un. */
export function lireAction(lien) {
  if (typeof lien !== "string" || lien.length > 300) return null;
  const m = lien.match(/^raccourci:\/\/([a-z]+)\/?(?:\?(.*))?$/i);
  if (!m) return null;
  const id = m[1].toLowerCase();
  const action = ACTIONS_RACCOURCIS.find((a) => a.id === id);
  if (!action) return null;
  const params = new URLSearchParams(m[2] || "");
  if (id === "eau") {
    const brut = params.get("ml");
    const ml = brut == null || brut === "" ? EAU_PAR_DEFAUT_ML : Number(brut);
    if (!Number.isFinite(ml) || ml < EAU_MIN_ML || ml > EAU_MAX_ML) return null;
    return { id, onglet: action.onglet, ml: Math.round(ml) };
  }
  return { id, onglet: action.onglet };
}

/** ?raccourci=eau&ml=250 devient raccourci://eau?ml=250 ; null sans raccourci. */
export function lienDepuisAdresse(recherche) {
  const p = new URLSearchParams(recherche || "");
  const id = p.get("raccourci");
  if (!id) return null;
  p.delete("raccourci");
  const reste = p.toString();
  return `${PREFIXE_LIEN}${id}${reste ? "?" + reste : ""}`;
}

/**
 * L'adresse sans les paramètres du raccourci : remise dans la barre
 * d'adresse après traitement, pour qu'un rechargement ne recompte pas.
 * Les autres paramètres et l'ancre sont gardés.
 */
export function adresseNettoyee({ pathname = "", search = "", hash = "" } = {}) {
  const p = new URLSearchParams(search || "");
  for (const nom of PARAMETRES) p.delete(nom);
  const reste = p.toString();
  return `${pathname}${reste ? "?" + reste : ""}${hash || ""}`;
}

/** Repas à ouvrir selon l'heure (mêmes sections que le Journal). */
export function repasDeLHeure(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 10 * 60 + 30) return "petit-dejeuner";
  if (minutes < 15 * 60) return "dejeuner";
  if (minutes < 18 * 60) return "gouter";
  return "diner";
}

/** Texte du message après l'ajout d'eau. */
export function messageEau(ml, totalMl) {
  const total = (Math.round(totalMl / 10) / 100).toLocaleString("fr-FR");
  return `💧 +${ml} ml d'eau (${total} L aujourd'hui)`;
}
