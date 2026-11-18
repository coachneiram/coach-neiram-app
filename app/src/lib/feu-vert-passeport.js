/**
 * Passeport Feu Vert : états des gestes et niveaux (14 novembre 2026).
 *
 * Module pur, sans stockage ni réseau : il sert à l'application des
 * membres (via lib/feu-vert.js) ET à la page réservée au coach,
 * qui ne doit charger aucun code de stockage.
 */

import { CONTENU_FEU_VERT } from "./feu-vert-contenu.js";

export const ETATS_GESTE = {
  rouge: { label: "Rouge", sens: "Charge bloquée. Version facilitée possible." },
  orange: { label: "Orange", sens: "Charge bloquée. Une correction précise à appliquer." },
  vert: { label: "Vert", sens: "Le geste entre dans la règle de progression." }
};

export const NIVEAUX_PASSEPORT = [
  { niveau: 0, nom: "Pas encore démarré", condition: "Envoie ta première vidéo : le niveau 1 arrive avec ta première correction." },
  { niveau: 1, nom: "Démarrage", condition: "Au moins 1 geste filmé et corrigé" },
  { niveau: 2, nom: "Bases", condition: "2 gestes au vert", seuil: 2 },
  { niveau: 3, nom: "Autonomie", condition: "5 gestes au vert", seuil: 5 },
  { niveau: 4, nom: "Feu Vert", condition: "8 gestes au vert", seuil: 8 }
];

/**
 * Anciens identifiants de gestes et leur remplaçant. Le hip thrust (geste 8)
 * est devenu la presse à cuisses le 18/11/2026 : un Passeport enregistré
 * avant (ou rendu par un Worker pas encore recollé) peut encore contenir
 * « hipthrust ».
 */
export const ALIAS_GESTES = { hipthrust: "presse" };

/**
 * Passeport avec les anciens identifiants renommés. Si les deux existent,
 * le nouvel identifiant l'emporte. Ne modifie pas l'objet reçu.
 */
export function normaliserPasseport(passeport) {
  if (!passeport || typeof passeport !== "object") return {};
  const sortie = { ...passeport };
  for (const [ancien, nouveau] of Object.entries(ALIAS_GESTES)) {
    if (!(ancien in sortie)) continue;
    if (!sortie[nouveau]) sortie[nouveau] = sortie[ancien];
    delete sortie[ancien];
  }
  return sortie;
}

/**
 * Passeport à envoyer au Worker : normalisé, plus une copie sous l'ancien
 * identifiant. Un Worker pas encore recollé (qui ne connaît que
 * « hipthrust ») garde ainsi l'état du geste 8 ; le Worker à jour ramène
 * l'alias sur « presse ». Le déploiement marche donc dans les deux ordres.
 */
export function passeportPourEnvoi(passeport) {
  const sortie = normaliserPasseport(passeport);
  for (const [ancien, nouveau] of Object.entries(ALIAS_GESTES)) {
    if (sortie[nouveau]) sortie[ancien] = sortie[nouveau];
  }
  return sortie;
}

/** État d'un geste : rouge tant que Marien n'a rien fixé (« pas encore filmé »). */
export function etatGeste(passeport, id) {
  const g = normaliserPasseport(passeport)[id];
  return g && ETATS_GESTE[g.etat] ? g.etat : "rouge";
}

/** Niveau 0 à 4 (seuils 2 / 5 / 8 gestes verts) et ce qui manque pour le suivant. */
export function niveauPasseport(passeport) {
  const p = normaliserPasseport(passeport);
  const ids = CONTENU_FEU_VERT.gestes.map((g) => g.id);
  const verts = ids.filter((id) => etatGeste(p, id) === "vert").length;
  // « Filmé et corrigé » : Marien a posé un état (avec sa date de correction),
  // ou le geste n'est plus rouge.
  const corrige = ids.some((id) => p[id] && (p[id].date || p[id].etat !== "rouge"));
  const niveau = verts >= 8 ? 4 : verts >= 5 ? 3 : verts >= 2 ? 2 : corrige ? 1 : 0;
  const suivant = NIVEAUX_PASSEPORT.find((n) => n.niveau === niveau + 1) || null;
  return {
    niveau,
    nom: NIVEAUX_PASSEPORT[niveau].nom,
    verts,
    total: ids.length,
    suivant: suivant ? { niveau: suivant.niveau, nom: suivant.nom, condition: suivant.condition, manque: suivant.seuil ? suivant.seuil - verts : null } : null
  };
}
