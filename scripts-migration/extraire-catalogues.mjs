/**
 * Extraction des catalogues alimentaires vers l'application migree.
 *
 * Ces tables comptent des centaines de valeurs nutritionnelles. Les
 * recopier a la main garantirait une faute de frappe quelque part, et une
 * faute de frappe ici, c'est un conseil nutritionnel faux donne a un
 * client. On les extrait donc mecaniquement depuis index.html, et un test
 * verifie que le fichier produit correspond exactement a la source.
 *
 * A relancer si les catalogues changent dans index.html :
 *   node scripts-migration/extraire-catalogues.mjs
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chargerApp } from "../tests/harness.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const DESTINATION = join(ICI, "..", "app", "src", "lib", "catalogues.js");

const legacy = await chargerApp();

/** Recopie une valeur venue du bac a sable dans un objet ordinaire. */
const propre = (v) =>
  Array.isArray(v) ? v.map(propre) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, propre(x)])) : v;

const TABLES = {
  FOOD_DB: "Catalogue nutritionnel, valeurs pour 100 g",
  FOOD_CATS: "Familles d'aliments et leur couleur",
  EQUIV_GLUCIDES: "Equivalences glucidiques, pour une portion de 150 g cuits",
  EQUIV_FRUITS: "Equivalences de fruits, pour une portion",
  EQUIV_PROTEINES: "Equivalences proteiques, pour ~120 g de viande ou poisson",
  EQUIV_LIPIDES: "Equivalences de matieres grasses",
  GOAL_FOOD_NOTES: "Conseil affiche selon l'objectif du client",
  SUGGESTIONS: "Collations et petits repas proposes pour combler la journee",
  DIET_TYPES: "Regimes alimentaires proposes dans le profil",
  ALLERGENS: "Allergenes et intolerances proposes dans le profil",
  TRAINING_MODES: "Ou le client fait ses seances",
  COACHING_MODES: "Presentiel ou coaching a distance",
  SHOPPING_LIST: "Liste de courses par rayon",
  SEANCE_TEMPLATES: "Seances sans materiel preparees par le coach",
  ROLE_PORTIONS: "Portion de reference par role, en grammes",
  ROLE_LABELS: "Libelle affiche de chaque role",
  ROLE_PREFS: "Aliments preferes par role et par objectif, pour composer une idee de repas"
};

const corps = Object.entries(TABLES)
  .map(([nom, description]) => {
    const valeur = legacy[nom];
    if (valeur === undefined) throw new Error("table absente de index.html : " + nom);
    return `/** ${description}. */\nexport const ${nom} = ${JSON.stringify(propre(valeur), null, 2)};`;
  })
  .join("\n\n");

const fichier = `/**
 * Catalogues alimentaires.
 *
 * FICHIER GENERE — ne pas modifier a la main.
 *
 * Extrait de index.html par scripts-migration/extraire-catalogues.mjs.
 * Ces tables comptent des centaines de valeurs nutritionnelles : les
 * recopier a la main garantirait une faute de frappe quelque part, et une
 * faute de frappe ici est un conseil faux donne a un client.
 *
 * tests/catalogues.test.mjs verifie que ce fichier correspond exactement
 * a la source. Pour le regenerer :
 *   node scripts-migration/extraire-catalogues.mjs
 */

${corps}
`;

writeFileSync(DESTINATION, fichier);
console.log("Ecrit :", DESTINATION);
for (const nom of Object.keys(TABLES)) {
  const v = legacy[nom];
  console.log("  " + nom + " :", Array.isArray(v) ? v.length + " entrées" : Object.keys(v).length + " clés");
}
