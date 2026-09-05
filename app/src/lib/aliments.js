/**
 * Aliments : filtrage par regime et priorites du jour.
 *
 * Portage fidele de index.html : dietOk (312), foodRecoOrder (1926),
 * sortFoodsForGoal (1937).
 *
 * `regimeOk` est la fonction la plus sensible de tout le fichier : elle
 * ecarte les aliments incompatibles avec les allergies declarees. Un faux
 * positif, et l'application propose a quelqu'un un aliment auquel il est
 * allergique. Elle est donc verifiee contre l'original, cas par cas.
 */

/** Categories d'aliments exclues par les regimes sans viande. */
const CHAIRS = ["viande", "volaille", "poisson", "crustaces"];

/** Produits d'origine animale exclus en plus par le regime vegetalien. */
const PRODUITS_ANIMAUX = ["lactose", "oeufs"];

/** Au-dela de ce taux de glucides pour 100 g, un aliment sort du keto. */
const PLAFOND_GLUCIDES_KETO = 12;

/**
 * Cet aliment convient-il au regime et aux allergies du client ?
 *
 * L'ordre des tests n'est pas anodin : les allergies passent en premier,
 * avant toute consideration de regime. Une allergie est une contrainte
 * medicale, pas une preference.
 */
export function regimeOk(aliment, profil) {
  const contient = aliment.contains || [];
  const allergies = (profil && profil.allergies) || [];

  if (contient.some((x) => allergies.includes(x))) return false;

  const regime = (profil && profil.dietType) || "aucun";
  if ((regime === "vegetarien" || regime === "vegetalien") && contient.some((x) => CHAIRS.includes(x))) {
    return false;
  }
  if (regime === "vegetalien" && contient.some((x) => PRODUITS_ANIMAUX.includes(x))) return false;
  if (regime === "keto" && aliment.c > PLAFOND_GLUCIDES_KETO) return false;

  return true;
}

/**
 * Dans quel ordre presenter les familles d'aliments, et pourquoi.
 *
 * On classe par part du quota restant, pas par grammes manquants : il
 * manque toujours plus de grammes de glucides que de lipides, et trier par
 * quantite brute mettrait les glucides en tete tous les jours.
 */
export function ordreRecommandation(restant, objectifs) {
  if (!restant || !objectifs) {
    return { ordre: ["proteines", "glucides", "lipides"], accroche: null };
  }

  const familles = [
    {
      id: "proteines",
      part: (objectifs.protein || 1) > 0 ? restant.p / Math.max(1, objectifs.protein) : 0,
      grammes: restant.p,
      label: "protéines"
    },
    {
      id: "glucides",
      part: (objectifs.carbs || 1) > 0 ? restant.c / Math.max(1, objectifs.carbs) : 0,
      grammes: restant.c,
      label: "glucides"
    },
    {
      id: "lipides",
      part: (objectifs.fat || 1) > 0 ? restant.f / Math.max(1, objectifs.fat) : 0,
      grammes: restant.f,
      label: "lipides"
    }
  ].sort((a, b) => b.part - a.part);

  const tete = familles[0];
  // Pas d'accroche quand il ne reste presque rien a manger, ni quand le
  // manque est negligeable : cela reviendrait a inventer une priorite.
  const accroche =
    restant.kcal > 100 && tete.grammes > 5
      ? `Priorité du jour : ${tete.label} — il t'en manque ${Math.round(tete.grammes)} g sur ton quota (${Math.round(restant.kcal)} kcal restantes).`
      : null;

  return { ordre: familles.map((d) => d.id), accroche };
}

/**
 * Classe les aliments d'une famille selon l'objectif du client.
 *
 * Nuance conservee de l'original : en prise de masse on trie les proteines
 * par quantite brute, sinon par densite (proteines par calorie). Quelqu'un
 * qui cherche a prendre du poids n'a pas besoin d'aliments peu caloriques.
 */
export function trierPourObjectif(aliments, idCategorie, objectif) {
  const arr = [...aliments];
  if (idCategorie === "proteines") {
    if (objectif === "prise") arr.sort((a, b) => b.p - a.p);
    else arr.sort((a, b) => b.p / b.kcal - a.p / a.kcal);
  } else if (idCategorie === "glucides") {
    arr.sort((a, b) => b.c - a.c);
  } else {
    arr.sort((a, b) => b.f - a.f);
  }
  return arr;
}
