/**
 * Consigne du Coach nutrition IA (onglet Repas → Coach IA).
 *
 * POURQUOI CE FICHIER (17 octobre 2026, audit P0-1)
 *
 * L'ancienne application envoyait au modele une consigne systeme
 * (buildCoachSystemPrompt, index.html:1948) : regime, allergies, objectif,
 * macros du jour, aliments du coach, garde-fou medical. La migration a garde
 * le composant mais perdu le branchement : App.jsx ne passait pas
 * `construireConsigne` a Repas, donc `systemPrompt` partait vide. Le coach
 * IA repondait sans rien savoir des allergies du client.
 *
 * La consigne est maintenant construite ICI, et CoachIA.jsx l'importe
 * directement : plus de fonction a faire descendre de composant en
 * composant, donc plus de branchement a oublier.
 *
 * LA SOURCE DE VERITE est le profil du client (`coach_profile`) :
 *   - `allergies` : tableau d'identifiants (ALLERGENS, catalogues.js) ;
 *   - `dietType` : restriction (aucun, vegetarien, vegetalien, pescetarien,
 *     sans-porc), ou ancien « keto » relu comme repartition ;
 *   - `repartitionMacros` : standard, lowcarb, keto, hyperproteine.
 * Les memes fonctions que le reste de l'application les lisent
 * (restrictionDuProfil, repartitionDuProfil, regimeOk) : une seule lecture,
 * pas de copie qui divergerait.
 *
 * UNE CONSIGNE NE GARANTIT RIEN A ELLE SEULE. Le modele peut se tromper.
 * `verifierReponse` relit donc chaque reponse avec les detecteurs
 * d'ingredients des recettes du coach, et l'ecran affiche un avertissement
 * si un allergene ou un aliment exclu y apparait. Cette relecture a ses
 * limites, dites au client : elle ne connait que les mots de sa liste, et
 * une allergie hors liste n'est pas verifiable.
 */

import { ALLERGENS, EQUIV_FRUITS, EQUIV_GLUCIDES, EQUIV_LIPIDES, EQUIV_PROTEINES, FOOD_DB, GOAL_FOOD_NOTES, SHOPPING_LIST } from "./catalogues.js";
import { regimeOk } from "./aliments.js";
import { GOALS } from "./nutrition.js";
import { REVELE } from "./recettes-coach.js";
import { libelleRegime, repartitionDuProfil, restrictionDuProfil } from "./regimes.js";

const ALLERGENES_CONNUS = ALLERGENS.map((a) => a.id);

/** Familles ecartees par chaque restriction, pour la relecture des reponses. */
const FAMILLES_EXCLUES = {
  vegetarien: ["viande", "volaille", "porc", "poisson", "crustaces"],
  vegetalien: ["viande", "volaille", "porc", "poisson", "crustaces", "lactose", "oeufs", "miel"],
  pescetarien: ["viande", "volaille", "porc"],
  "sans-porc": ["porc"]
};

/** Detecteurs : ceux des recettes du coach, plus le miel (regle vegane). */
const DETECTEURS = { ...REVELE, miel: /(?<!\p{L})miel(?!\p{L})/iu };

const LIBELLES_FAMILLES = {
  viande: "viande",
  volaille: "volaille",
  porc: "porc",
  poisson: "poisson",
  crustaces: "crustacés",
  lactose: "produits laitiers",
  oeufs: "œufs",
  miel: "miel"
};

const libelleAllergene = (id) => ALLERGENS.find((a) => a.id === id)?.label || id;

/**
 * Ce que le profil dit des contraintes alimentaires, sans rien inventer.
 *
 * `etat` :
 *   - "ok"        : allergies lisibles (un tableau, eventuellement vide) ;
 *   - "inconnu"   : profil absent ou champ `allergies` manquant — on ne
 *                   sait pas si le client a des allergies ;
 *   - "illisible" : champ present mais mal forme (ni tableau, ni vide).
 * Seul "ok" autorise des conseils alimentaires precis.
 *
 * `horsListe` : allergies declarees que l'application ne connait pas
 * (ancienne version, saisie a la main) ; elles sont transmises au modele
 * telles quelles mais ne peuvent pas etre verifiees dans la reponse.
 */
export function lireContraintes(profile) {
  const valide = profile && typeof profile === "object" && !Array.isArray(profile);
  const brut = valide ? profile.allergies : undefined;

  let etat = "ok";
  let allergies = [];
  let brutIllisible = null;
  if (!valide || brut === undefined || brut === null) {
    etat = "inconnu";
  } else if (Array.isArray(brut)) {
    allergies = [...new Set(brut.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))];
    if (allergies.length !== brut.length && brut.some((x) => typeof x !== "string")) etat = "illisible";
  } else {
    etat = "illisible";
    brutIllisible = String(brut).slice(0, 120);
  }

  return {
    etat,
    allergies,
    connues: allergies.filter((a) => ALLERGENES_CONNUS.includes(a)),
    horsListe: allergies.filter((a) => !ALLERGENES_CONNUS.includes(a)),
    brutIllisible,
    restriction: valide ? restrictionDuProfil(profile) : "aucun",
    repartition: valide ? repartitionDuProfil(profile) : "standard"
  };
}

/**
 * Profil enregistre depuis le formulaire : un champ `allergies` absent
 * devient une liste vide. Le formulaire montre la liste des allergenes a
 * cocher ; l'enregistrer sans rien cocher est une declaration explicite
 * « aucune ». Une valeur presente, meme mal formee, n'est jamais touchee :
 * l'effacer ferait disparaitre ce que le client a dit.
 */
export const avecAllergiesDeclarees = (profile) =>
  profile && typeof profile === "object" && (profile.allergies === undefined || profile.allergies === null)
    ? { ...profile, allergies: [] }
    : profile;

/** Le profil autorise-t-il des conseils alimentaires precis ? */
export const conseilsAlimentairesSurs = (contraintes) => contraintes.etat === "ok";

function ligneContraintes(c) {
  const lignes = [];
  lignes.push(
    "Régime : " + (c.restriction === "aucun" ? "aucune restriction déclarée" : libelleRegime(c.restriction)) + "."
  );
  if (c.repartition !== "standard") lignes.push("Répartition des macros : " + libelleRegime(c.repartition) + ".");
  if (c.etat === "ok") {
    lignes.push(
      c.allergies.length
        ? "Allergies et intolérances déclarées : " + c.allergies.map(libelleAllergene).join(", ") + "."
        : "Allergies et intolérances : aucune déclarée."
    );
  } else if (c.etat === "illisible") {
    lignes.push(
      "Allergies et intolérances : INFORMATION ILLISIBLE dans le profil" +
        (c.allergies.length ? " (valeurs lisibles : " + c.allergies.map(libelleAllergene).join(", ") + ")" : "") +
        (c.brutIllisible ? " (valeur brute : « " + c.brutIllisible + " »)" : "") +
        "."
    );
  } else {
    lignes.push("Allergies et intolérances : INCONNUES (le profil ne le dit pas).");
  }
  return lignes.join("\n");
}

/**
 * Aliments du coach compatibles avec le profil.
 *
 * Le conseil d'usage d'un aliment peut lui-meme citer un aliment exclu
 * (« Graines de tournesol — Salade, yaourt » pour un client vegan ou
 * intolerant au lactose) : il est alors retire, l'aliment reste.
 */
const lignesAliments = (cat, profile) =>
  FOOD_DB.filter((f) => f.cat === cat && regimeOk(f, profile))
    .map((f) => {
      const conseil = f.conseil && !verifierReponse(f.conseil, profile).alertes.length ? ` — ${f.conseil}` : "";
      return `${f.name} (P${f.p}/G${f.c}/L${f.f}, ${f.kcal} kcal/100g${conseil})`;
    })
    .join(" ; ");

/**
 * Equivalences compatibles avec le profil.
 *
 * Toutes ne portent pas d'etiquette : « 10 g d'huile = 12 g beurre = 30 g
 * crème fraîche » ou « huile olive/noix/coco » n'en ont aucune, et
 * l'ancienne consigne les envoyait donc a un intolerant au lactose ou a un
 * allergique aux fruits a coque. Le texte de chaque ligne est relu par les
 * memes detecteurs que les reponses : une ligne qui cite un aliment exclu
 * n'est pas envoyee.
 */
const lignesEquivalences = (liste, profile) =>
  liste
    .filter((r) => regimeOk({ contains: r[2] || [], c: 0 }, profile))
    .filter((r) => !verifierReponse(`${r[0]} : ${r[1]}`, profile).alertes.length)
    .map(([a, b]) => `${a} : ${b}`)
    .join(" ; ");

/**
 * La consigne systeme envoyee au modele.
 *
 * `restant` est le reste du jour (computeRemainingToday) ; facultatif.
 * Profil inconnu ou illisible : la consigne interdit tout aliment precis et
 * demande au modele de faire preciser les allergies d'abord. Les listes
 * d'aliments du coach ne sont alors pas envoyees du tout — le modele ne
 * peut pas recommander ce qu'il ne voit pas.
 */
export function construireConsigneCoach(profile, targets, restant) {
  const c = lireContraintes(profile);
  const sur = conseilsAlimentairesSurs(c);
  const p = profile && typeof profile === "object" ? profile : {};
  const objectif = GOALS.find((g) => g.id === (p && p.goal))?.label || "non défini";

  const regles = [
    "Tu es l'assistant nutrition du Coach Neiram (coach sportif). Tu conseilles des aliments, collations et repas à son client, en français, en tutoyant, de façon directe et concrète (réponses courtes, pas de blabla, quantités précises en grammes).",
    "",
    "RÈGLES STRICTES :",
    "- Les allergies et intolérances passent avant tout. Ne propose JAMAIS un aliment, une recette ou un ingrédient qui contient un allergène déclaré, même en petite quantité, même « en option ». Si le client demande lui-même un aliment qui en contient, rappelle-lui son allergie et propose une alternative sans cet allergène.",
    "- Respecte impérativement son régime. Ne mentionne jamais un aliment incompatible.",
    "- N'invente rien sur le client : si une information manque (allergie, régime, objectif), dis-le et demande-la, ne la suppose pas.",
    "- Base-toi UNIQUEMENT sur les recommandations alimentaires du Coach Neiram ci-dessous. Ne recommande pas d'aliments hors de ces listes, sauf légumes verts et aromates, toujours autorisés.",
    "- Adapte les quantités à l'objectif et aux macros restantes du jour.",
    "- Tu n'es pas médecin : pour toute question médicale (symptôme, réaction allergique, maladie, médicament, grossesse, trouble du comportement alimentaire), ne donne pas d'avis et renvoie vers un professionnel de santé."
  ];

  if (!sur) {
    regles.push(
      "- LES ALLERGIES DU CLIENT NE SONT PAS CONNUES DE FAÇON FIABLE. Ne propose AUCUN aliment, repas, recette ou quantité précis. Réponds seulement sur des principes généraux (régularité, hydratation, protéines à chaque repas sans citer d'aliment) et demande-lui d'abord de renseigner ses allergies dans son profil (Réglages → Profil) ou de te les indiquer."
    );
  }

  const client = [
    "",
    "CLIENT :",
    "Objectif : " + objectif + ".",
    ligneContraintes(c)
  ];
  if (targets && targets.calories) {
    client.push(`Objectifs journaliers : ${targets.calories} kcal, P ${targets.protein} g, G ${targets.carbs} g, L ${targets.fat} g.`);
  }
  if (restant && restant.consumed) {
    client.push(
      `Aujourd'hui : ${Math.round(restant.consumed.kcal)} kcal consommées, il reste ${Math.round(restant.kcal)} kcal (P ${Math.round(restant.p)} g, G ${Math.round(restant.c)} g, L ${Math.round(restant.f)} g).`
    );
  }
  const note = GOAL_FOOD_NOTES[p && p.goal];
  if (note && sur) client.push(note);

  if (!sur) return [...regles, ...client].join("\n");

  return [
    ...regles,
    ...client,
    "",
    "ALIMENTS À PRIVILÉGIER (Coach Neiram, valeurs /100 g, déjà filtrés selon son régime et ses allergies) :",
    "Protéines : " + lignesAliments("proteines", profile),
    "Glucides : " + lignesAliments("glucides", profile),
    "Lipides : " + lignesAliments("lipides", profile),
    "",
    "ÉQUIVALENCES POUR VARIER (Coach Neiram) :",
    "Glucides (portion 150 g cuits) : " + lignesEquivalences(EQUIV_GLUCIDES, profile),
    "Fruits (1 portion) : " + lignesEquivalences(EQUIV_FRUITS, profile),
    "Protéines (portion équivalente à ~120 g de viande/poisson) : " + lignesEquivalences(EQUIV_PROTEINES, profile),
    "Lipides : " + lignesEquivalences(EQUIV_LIPIDES, profile),
    "Rappel énergie : protéines 4 kcal/g, glucides 4 kcal/g, lipides 9 kcal/g, alcool 7 kcal/g.",
    "",
    "LISTE DE COURSES DE RÉFÉRENCE : " +
      SHOPPING_LIST.map((cat) => cat.label.replace(/^[^ ]+ /, "")).join(", ") +
      " — propose des repas réalisables avec ces catégories."
  ].join("\n");
}

/**
 * Relit une reponse du modele a la recherche d'un allergene declare ou d'un
 * aliment exclu par le regime.
 *
 * Rend { alertes: [{ famille, libelle, mot, motif: "allergie"|"regime" }],
 *        nonVerifiables: [libelles] }.
 *
 * Volontairement large : « sans lactose » declenche aussi l'alerte sur le
 * lactose. Un avertissement de trop se lit et s'ignore ; un allergene
 * passe sous silence peut envoyer quelqu'un aux urgences.
 */
export function verifierReponse(texte, profile) {
  const c = lireContraintes(profile);
  const alertes = [];
  const vues = new Set();
  const chercher = (famille, motif) => {
    if (vues.has(famille)) return;
    const detecteur = DETECTEURS[famille];
    if (!detecteur) return;
    const m = String(texte || "").match(detecteur);
    if (!m) return;
    vues.add(famille);
    alertes.push({
      famille,
      libelle: motif === "allergie" ? libelleAllergene(famille) : LIBELLES_FAMILLES[famille] || famille,
      mot: m[0],
      motif
    });
  };
  c.allergies.forEach((a) => chercher(a, "allergie"));
  (FAMILLES_EXCLUES[c.restriction] || []).forEach((f) => chercher(f, "regime"));
  return {
    alertes,
    nonVerifiables: c.allergies.filter((a) => !DETECTEURS[a]).map(libelleAllergene)
  };
}

/**
 * Textes affiches par l'ecran Coach IA autour de ces garde-fous.
 * Ranges ici pour rester a cote des regles qu'ils expliquent.
 */
export const TEXTES_GARDE_FOU = {
  profilIncomplet:
    "Tes allergies ne sont pas lisibles dans ton profil : le coach IA ne te proposera aucun aliment précis tant que ce n'est pas réglé. Ouvre les Réglages, vérifie « Allergies / intolérances » et enregistre ton profil, même si tu n'en as aucune.",
  alerte: (a) =>
    a.motif === "allergie"
      ? `Attention : cette réponse cite « ${a.mot} », or tu as déclaré : ${a.libelle}. Ne suis pas cette suggestion sans vérifier.`
      : `Attention : cette réponse cite « ${a.mot} » (${a.libelle}), qui ne correspond pas à ton régime.`,
  limite:
    "Vérification automatique limitée aux ingrédients connus de l'application : relis toujours les étiquettes.",
  nonVerifiable: (liste) => `Non vérifiable automatiquement : ${liste.join(", ")}. Relis toi-même chaque ingrédient.`
};
