/**
 * Idee de repas et estimation d'un aliment libre, depuis la liste de courses.
 *
 * Portage de shoppingFlat, mealIdeaFor et estimateCustomMacros
 * (index.html 1754-1813).
 *
 * L'IDEE DE REPAS repond a un moment precis : le client coche « blanc de
 * poulet » dans sa liste, et l'application lui propose immediatement de quoi
 * completer l'assiette — un feculent, un legume, un peu de gras. C'est du
 * coaching passif, au moment ou la decision se prend, en rayon.
 *
 * Les aliments proposes ne sont pas tires au sort : ROLE_PREFS classe, pour
 * chaque role et chaque objectif, ce que le coach recommanderait en premier.
 * En perte, la proteine maigre passe devant ; en prise, la plus dense.
 */

import { num, round } from "./dates.js";
import { articleCoursesOk } from "./aliments.js";
import { FOOD_DB, ROLE_PORTIONS, ROLE_PREFS, SHOPPING_LIST } from "./catalogues.js";
import { chercherAliments } from "./recherche-aliments.js";
import { extraireObjetJson } from "./photo-aliment.js";
import { genererTexte } from "./ia.js";

/**
 * Tous les articles de la liste, rayons confondus.
 *
 * Un article herite du role de son rayon, sauf s'il porte le sien : les
 * oleagineux sont dans le rayon « lipides » mais certains comptent comme
 * collation.
 */
export function articlesAPlat() {
  const sortie = [];
  SHOPPING_LIST.forEach((rayon) =>
    rayon.items.forEach((it) =>
      sortie.push({ ...it, catId: rayon.id, role: it.role !== undefined ? it.role : rayon.role })
    )
  );
  return sortie;
}

/**
 * Compose une idee d'assiette autour d'un article coche.
 *
 * Rend null si l'article n'a pas de role ou pas de valeurs : on ne construit
 * pas une idee de repas autour du liquide vaisselle.
 */
export function ideeRepasPour(articleBase, profil) {
  if (!articleBase || !articleBase.role || articleBase.kcal == null) return null;

  const aPlat = articlesAPlat();
  const estCollation = articleBase.role === "fruit";

  // Un fruit appelle une collation (du laitage, un peu de gras), pas une
  // assiette complete.
  const rolesVoulus = estCollation
    ? ["collation", "lipide"]
    : ["proteine", "glucide", "legume", "lipide"].filter((r) => r !== articleBase.role);

  const choix = [];
  rolesVoulus.forEach((r) => {
    // « collation » n'existe pas comme role d'article : c'est une liste de
    // preferences qui puise dans les proteines.
    const roleReel = r === "collation" ? "proteine" : r;
    const objectif = (profil && profil.goal) || "maintien";
    const groupe = ROLE_PREFS[r] || ROLE_PREFS[roleReel] || {};
    const preferences = groupe[objectif] || groupe.default || [];

    const bassin = aPlat.filter(
      (it) =>
        it.role === roleReel && it.kcal != null && it.n !== articleBase.n && articleCoursesOk(it, profil)
    );

    let trouve = null;
    for (const nom of preferences) {
      trouve = bassin.find((it) => it.n === nom);
      if (trouve) break;
    }
    // Aucune preference disponible (regime, allergies) : le premier du rayon
    // vaut mieux que rien.
    if (!trouve && bassin.length) trouve = bassin[0];

    if (trouve && !choix.some((p) => p.item.n === trouve.n)) {
      choix.push({ item: trouve, role: roleReel, portion: ROLE_PORTIONS[roleReel] });
    }
  });

  if (!choix.length) return null;

  const tous = [
    { item: articleBase, role: articleBase.role, portion: ROLE_PORTIONS[articleBase.role] },
    ...choix
  ];
  const total = tous.reduce(
    (a, x) => ({
      kcal: a.kcal + (x.item.kcal * x.portion) / 100,
      p: a.p + ((x.item.p || 0) * x.portion) / 100
    }),
    { kcal: 0, p: 0 }
  );

  const objectif = (profil && profil.goal) || "maintien";
  const phrase = estCollation
    ? "collation équilibrée"
    : objectif === "perte"
      ? "assiette légère et rassasiante"
      : objectif === "prise"
        ? "assiette dense pour construire"
        : "assiette équilibrée";

  return {
    base: articleBase,
    picks: choix,
    totalKcal: Math.round(total.kcal),
    totalP: Math.round(total.p),
    phrase,
    isSnack: estCollation
  };
}

const sansAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normaliser = (s) =>
  sansAccents(String(s).toLowerCase())
    .replace(/[^a-z0-9 ]/g, " ")
    .trim();

const consigneMacros = (nom) =>
  `Donne les valeurs nutritionnelles moyennes pour 100 g de : "${nom}". ` +
  `Réponds UNIQUEMENT avec un objet JSON valide, sans markdown : ` +
  `{"kcal":0,"p":0,"c":0,"f":0} (nombres, protéines/glucides/lipides en grammes). ` +
  `Si ce n'est pas un aliment, réponds {"kcal":null}.`;

/**
 * Estime les macros d'un article ajoute a la main.
 *
 * Trois sources, dans l'ordre du plus sur au moins sur :
 *
 * 1. Les catalogues locaux — verifies, instantanes, hors ligne.
 * 2. Open Food Facts — declaratif, mais reel.
 * 3. L'IA — une moyenne plausible, jamais une mesure. C'est le dernier
 *    recours, et la source est marquee pour que l'interface puisse le dire.
 *
 * Rend null quand rien ne repond : l'article reste dans la liste de courses
 * sans macros, ce qui est le comportement voulu — une liste de courses n'a
 * pas besoin de calories pour servir.
 */
export async function estimerMacrosLibres(nom) {
  const requete = normaliser(nom);

  if (requete.length >= 3) {
    const locaux = [
      ...articlesAPlat(),
      ...FOOD_DB.map((f) => ({ n: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f }))
    ];
    // Correspondance dans les deux sens : « poulet » doit trouver « Blanc de
    // poulet », et « blanc de poulet fermier » doit trouver « Blanc de poulet ».
    const trouve = locaux.find(
      (it) => it.kcal != null && (normaliser(it.n).includes(requete) || requete.includes(normaliser(it.n)))
    );
    if (trouve) return { kcal: trouve.kcal, p: trouve.p, c: trouve.c, f: trouve.f, source: "local" };
  }

  try {
    const resultats = await chercherAliments(nom);
    if (resultats.length) {
      const r = resultats[0];
      return { kcal: r.kcal100, p: r.p100, c: r.c100, f: r.f100, source: "off" };
    }
  } catch (e) {
    // Hors ligne : on tente l'IA, qui echouera aussi, et on rendra null.
  }

  try {
    const texte = await genererTexte({ prompt: consigneMacros(nom), maxTokens: 512 });
    const analyse = JSON.parse(extraireObjetJson(texte));
    if (analyse.kcal != null) {
      return {
        kcal: Math.round(num(analyse.kcal)),
        p: round(num(analyse.p), 1),
        c: round(num(analyse.c), 1),
        f: round(num(analyse.f), 1),
        source: "ia"
      };
    }
  } catch (e) {
    // Rien de fiable a proposer.
  }

  return null;
}
