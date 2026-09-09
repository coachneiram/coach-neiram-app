/**
 * Import d'un programme depuis le Google Sheets du coach.
 *
 * POURQUOI CE FICHIER EXISTE. Un client en mode « Google Sheets » a son
 * programme ailleurs : l'application ne lui servait qu'a POINTER ses
 * seances. S'il voulait retrouver ses exercices dans l'application — pour
 * la progression de charge, l'historique, les records — il devait les
 * recopier un par un, seance par seance, semaine apres semaine. Personne ne
 * le fait deux fois.
 *
 * Ce module lit le tableau du coach et en tire des seances types. Il ne
 * remplace rien : le pointage continue de fonctionner exactement comme
 * avant, meme si rien n'est jamais importe.
 *
 * DEUX CHEMINS D'ENTREE, et c'est volontaire :
 *
 *  1. LE LIEN. On telecharge la feuille en CSV. Cela ne marche que si le
 *     document est partage « toute personne disposant du lien », ce qui
 *     n'est pas le cas par defaut chez Google.
 *  2. LE COLLAGE. Le client ouvre son Sheets, selectionne, copie, colle.
 *     Cela marche toujours, y compris sur un document strictement prive,
 *     et c'est la raison pour laquelle ce chemin n'est pas un repli
 *     honteux mais un mode a part entiere.
 *
 * Tout ici est pur : aucune ecriture, aucun etat. L'ecran decide quoi
 * faire du resultat.
 */

/** Nom donne a une seance quand le tableau n'en designe aucun. */
export const NOM_SEANCE_PAR_DEFAUT = "Séance importée";

/** Groupes de superset attribues automatiquement, dans cet ordre. */
const LETTRES_SUPERSET = ["A", "B", "C", "D", "E", "F"];

/** Au-dela, ce n'est plus un programme : c'est un export de tout un classeur. */
const MAX_SEANCES = 40;
const MAX_EXERCICES_PAR_SEANCE = 60;

/**
 * Reduit un libelle a sa forme comparable : sans accents, sans ponctuation.
 *
 * Meme principe que cleExercice dans constructeur-seances.js. Duplique
 * plutot qu'importe : les deux fonctions repondent a deux besoins qui
 * n'ont aucune raison d'evoluer ensemble.
 */
export const normaliser = (texte) =>
  String(texte == null ? "" : texte)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Roles de colonnes reconnus, et les en-tetes qui les designent.
 *
 * La comparaison se fait sur la forme normalisee ET par debut de chaine :
 * « Séries prévues », « Charge (kg) » ou « Reps / série » doivent tomber
 * sur le bon role sans qu'il faille les enumerer.
 *
 * L'ORDRE COMPTE. « rpe » est teste avant « reps » — sinon rien, mais
 * « charge » est teste avant « serie », et « exercice » avant tout le
 * reste, parce qu'un en-tete « Exercice / Série » ne doit pas devenir une
 * colonne de series.
 */
const ROLES = [
  { role: "exercice", prefixes: ["exercice", "mouvement", "exo"] },
  { role: "seance", prefixes: ["seance", "jour", "programme", "entrainement", "bloc", "session"] },
  { role: "mode", prefixes: ["mode", "type"] },
  { role: "technique", prefixes: ["technique", "methode", "intensification"] },
  { role: "charge", prefixes: ["charge", "poids", "kg"] },
  { role: "series", prefixes: ["serie", "series", "set", "sets", "nb serie"] },
  { role: "reps", prefixes: ["rep", "reps", "repetition", "repetitions"] },
  // « Intensité » et « Difficulté » sont les mots que les coachs emploient
  // pour le RPE — la legende d'un tableau reel dit mot pour mot
  // « RPE = Difficulté », et la colonne s'appelle « Intensités ». Le
  // borne 1-10 de valeurPlausible protege le cas ou la colonne
  // contiendrait en fait un pourcentage du 1RM : il serait ecarte.
  { role: "rpe", prefixes: ["rpe", "intensite", "difficulte"] },
  /*
   * LE TEMPS DE REPOS A SON PROPRE ROLE, et ce n'est pas un detail de
   * rangement.
   *
   * « Récupération » et « Consignes » tombaient tous deux dans « notes ».
   * Le plan de lecture garde la premiere colonne qui revendique un role :
   * « Récupération » etant a gauche, elle raflait la mise, et les vraies
   * consignes du coach — « Bloquer 2 sec en haut », « Enchainer les 2
   * exercices » — etaient remplacees par « 1 min 30 ».
   *
   * C'est aussi ce qui empechait de reconnaitre un superset ecrit en
   * consigne : la technique se cherche dans les notes, qui contenaient un
   * temps de repos.
   *
   * L'application n'a pas encore de champ pour le repos ; ce role existe
   * d'abord pour que cette colonne cesse d'en occuper un autre.
   */
  { role: "repos", prefixes: ["repos", "recuperation", "recup"] },
  {
    role: "notes",
    prefixes: ["note", "notes", "consigne", "commentaire", "remarque", "tempo"]
  }
];

/**
 * Derniere ligne non vide d'une cellule d'en-tete.
 *
 * UNE CELLULE D'EN-TETE PEUT EN CONTENIR PLUSIEURS. C'est le cas des le
 * moment ou le tableau contient des cellules fusionnees — une banniere
 * « JOUR 1 » sur toute la largeur, un bloc « WARMUP », un titre
 * « Charge » au-dessus des colonnes de semaines. Copiees depuis
 * l'application Google Sheets, ces zones arrivent dans le presse-papiers
 * comme UNE cellule contenant plusieurs lignes.
 *
 * L'en-tete se retrouvait alors colle a ce qui le surplombe :
 *
 *   « JOUR 1 ⏎ Séries »                        au lieu de « Séries »
 *   « Explications ⏎ … ⏎ Charge ⏎ W1 »        au lieu de « W1 »
 *
 * Et le degat n'etait pas visible : « JOUR 1 Séries » commence par
 * « jour », donc la colonne des SERIES etait lue comme la colonne des
 * SEANCES. Le client obtenait quatorze seances nommees « 1 », « 3 »,
 * « 4 » — ses nombres de series — et plus aucune serie nulle part.
 *
 * LA DERNIERE LIGNE EST LA BONNE : dans un tableur, ce qui surplombe une
 * colonne vient avant elle. Le veritable en-tete est celui qui touche les
 * donnees.
 */
export const derniereLigne = (cellule) => {
  const lignes = String(cellule == null ? "" : cellule)
    .split(/[\r\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lignes.length ? lignes[lignes.length - 1] : "";
};

/**
 * Lignes d'une cellule fusionnee SAUF la derniere : ce qui la surplombe.
 *
 * Le pendant de derniereLigne. Quand une banniere « JOUR 1 » et l'en-tete
 * « Séries » n'occupent plus qu'une cellule, le nom de la seance est la,
 * juste au-dessus de l'en-tete, dans la meme cellule.
 */
export const lignesAvalees = (cellule) =>
  String(cellule == null ? "" : cellule)
    .split(/[\r\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, -1);

/**
 * Premiere ligne non vide d'une cellule.
 *
 * Une banniere de seance peut, elle aussi, avoir avale l'en-tete repete
 * qui la suit : « JOUR 2 ⏎ Exercices ». Le nom de la seance est alors la
 * PREMIERE ligne — sans quoi la seance s'appelle « JOUR 2 Exercices ».
 */
export const premiereLigne = (cellule) => {
  const lignes = String(cellule == null ? "" : cellule)
    .split(/[\r\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lignes.length ? lignes[0] : "";
};

/**
 * Mots par lesquels une banniere de seance ouvre un bloc, en tete de
 * cellule. Ecrit sur le texte BRUT — accents compris — pour pouvoir
 * retirer la banniere sans detruire les separateurs (« / », « & ») dont
 * rolesDeColonne a besoin juste apres.
 */
const BANNIERE_EN_TETE = /^\s*(jours?|s[\u00e9e]ances?|sessions?|semaines?|blocs?|entra[\u00een]nements?|days?)\b[\s:.\u00b7-]*\d*[\s:.\u00b7-]*/i;

/** Au-dela, ce n'est plus un en-tete de colonne : c'est un paragraphe. */
const LONGUEUR_MAX_ENTETE = 60;

/**
 * Ce qu'il faut vraiment lire dans une cellule d'en-tete.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI UNE CELLULE D'EN-TETE CONTIENT AUTRE CHOSE QUE L'EN-TETE
 * ─────────────────────────────────────────────────────────────────────
 *
 * Un tableau de coach fusionne des cellules pour la mise en page : une
 * banniere « JOUR 1 » sur toute la largeur, un bloc d'explications avec
 * ses liens video, un titre « Charge » au-dessus des colonnes de
 * semaines. A l'export CSV ces zones restent des LIGNES distinctes ; au
 * copier-coller elles s'effondrent dans la cellule d'en-tete.
 *
 * Selon l'appareil et l'application source, elles s'y effondrent de deux
 * facons — et LES DEUX ONT ETE OBSERVEES sur le meme tableau :
 *
 *   « JOUR 1 ⏎ Séries »   la cellule garde ses retours a la ligne
 *   « JOUR 1 Séries »     ils ont ete aplatis en espaces
 *
 * Le degat etait le meme et invisible : « JOUR 1 Séries » commence par
 * « jour », donc la colonne des SERIES etait lue comme la colonne des
 * SEANCES. Le client obtenait quatorze seances nommees « 1 », « 3 »,
 * « 4 » — ses nombres de series — et plus aucune serie nulle part.
 *
 * Trois passes, de la plus sure a la moins sure :
 *
 *  1. LA DERNIERE LIGNE. Dans un tableur, ce qui surplombe une colonne
 *     vient avant elle : l'en-tete veritable est celui qui touche les
 *     donnees.
 *  2. LA QUEUE D'UN PAVE. Un en-tete de colonne ne fait pas soixante
 *     caracteres. Passe cette longueur, la cellule est un bloc
 *     d'explications aplati, et seuls ses derniers mots sont l'en-tete.
 *  3. LA BANNIERE RETIREE. Si ce qui reste apres « JOUR 1 » designe un
 *     role connu, c'est que la banniere avait ete collee devant.
 *     CONDITION STRICTE : sans role reconnu derriere, on ne touche a
 *     rien — « JOUR 1 » tout seul reste une banniere de seance.
 */
export function enteteUtile(cellule) {
  let t = derniereLigne(cellule);

  if (t.length > LONGUEUR_MAX_ENTETE) {
    const mots = t.split(/\s+/).filter(Boolean);
    t = mots.slice(-2).join(" ");
  }

  const reste = t.replace(BANNIERE_EN_TETE, "").trim();
  if (reste && reste !== t) {
    const n = normaliser(reste);
    if (roleStrict(n) || roleLarge(n)) return reste;
  }
  return t;
}

/**
 * Role d'un en-tete, en exigeant que le mot-cle OUVRE l'en-tete.
 *
 * LE PLURIEL EST ACCEPTE, et il a fallu un tableau reel pour s'en rendre
 * compte : « Exercices » ne tombait sur rien, et l'import entier echouait
 * sur un tableau parfaitement bien fait. Un coach ecrit ses colonnes au
 * pluriel une fois sur deux — « Exercices », « Charges », « Séances » —
 * et exiger le singulier revenait a exiger qu'il ecrive comme le code.
 */
export function roleDeColonne(entete) {
  return roleStrict(normaliser(enteteUtile(entete)));
}

/** Passe stricte sur un libelle DEJA normalise. */
function roleStrict(n) {
  if (!n) return null;
  for (const { role, prefixes } of ROLES) {
    if (prefixes.some((p) => n === p || n === p + "s" || n.startsWith(p + " ") || n.startsWith(p + "s "))) {
      return role;
    }
  }

  /*
   * « S1 », « S2 », « W1 »... : LA CHARGE D'UNE SEMAINE DU BLOC.
   *
   * Les tableaux de Coach Neiram posent les charges en largeur, une
   * colonne par semaine sous une banniere « Charge », chacune suivie du
   * RPE reellement realise cette semaine-la. Aucune ne s'appelle
   * « Charge » : elles ne tombaient donc sur rien, et le programme
   * s'importait sans une seule charge.
   *
   * C'EST LA PREMIERE QUI EST RETENUE — S1, la semaine d'ouverture du
   * bloc. C'est la charge que le coach PRESCRIT au depart ; les suivantes
   * sont ce que le client fera plus tard, et l'application n'a qu'une
   * charge par exercice. Le plan de lecture garde la premiere colonne qui
   * revendique un role, donc S1 l'emporte sur S2 sans regle
   * supplementaire.
   *
   * « RPE S1 » n'est pas capte ici : il tombe sur le role « rpe » a la
   * boucle precedente, avant d'arriver jusqu'a ce test.
   */
  if (/^[sw]\d+$/.test(n)) return "charge";

  return null;
}

/**
 * Role d'un en-tete, en cherchant le mot-cle N'IMPORTE OU dedans.
 *
 * Deuxieme chance, jamais premiere : « Nom de l'exercice » et « Nombre de
 * séries » sont des en-tetes parfaitement clairs pour un humain, et
 * illisibles pour la regle stricte ci-dessus.
 *
 * Elle n'est pas utilisee seule parce qu'elle se trompe la ou la stricte ne
 * se trompe pas : « Notes sur l'exercice » contient « exercice ». D'ou
 * l'ordre — la passe stricte attribue d'abord, la large ne comble que ce
 * qui reste, et jamais une colonne deja prise.
 */
export function roleDeColonneLarge(entete) {
  return roleLarge(normaliser(enteteUtile(entete)));
}

/** Passe large sur un libelle DEJA normalise. */
function roleLarge(n) {
  if (!n) return null;
  const mots = n.split(" ");
  for (const { role, prefixes } of ROLES) {
    if (prefixes.some((p) => mots.includes(p) || mots.includes(p + "s"))) return role;
  }
  return null;
}

/**
 * Decoupe un tableau colle ou telecharge en lignes et en cellules.
 *
 * Accepte le CSV (telechargement) et le TSV (copier-coller depuis Google
 * Sheets, qui met des tabulations). Le separateur est celui qui domine sur
 * TOUT le texte, pas sur la premiere ligne : un Sheets de coach commence
 * souvent par un titre libre (« Programme Marien — bloc 3 »), qui ne
 * contient ni tabulation ni virgule et ne dit donc rien du tableau.
 * Compter sur l'ensemble evite aussi de couper un libelle contenant une
 * virgule (« Développé couché, prise serrée ») dans un collage en
 * tabulations.
 *
 * Les guillemets sont geres, doublement compris (« "" » vaut un
 * guillemet), parce que Google les pose des qu'une cellule contient une
 * virgule ou un retour a la ligne — et une cellule de note en contient
 * souvent.
 */
export function analyserTableau(texte) {
  const brut = String(texte == null ? "" : texte).replace(/\r\n?/g, "\n").trim();
  if (!brut) return [];

  const tabulations = (brut.match(/\t/g) || []).length;
  const virgules = (brut.match(/,/g) || []).length;
  const separateur = tabulations > 0 && tabulations >= virgules ? "\t" : ",";

  const lignes = [];
  let ligne = [];
  let cellule = "";
  let dansGuillemets = false;

  for (let i = 0; i < brut.length; i++) {
    const c = brut[i];

    if (dansGuillemets) {
      if (c === '"') {
        if (brut[i + 1] === '"') {
          cellule += '"';
          i++;
        } else {
          dansGuillemets = false;
        }
      } else {
        cellule += c;
      }
      continue;
    }

    if (c === '"') dansGuillemets = true;
    else if (c === separateur) {
      ligne.push(cellule.trim());
      cellule = "";
    } else if (c === "\n") {
      ligne.push(cellule.trim());
      lignes.push(ligne);
      ligne = [];
      cellule = "";
    } else cellule += c;
  }

  ligne.push(cellule.trim());
  lignes.push(ligne);

  // Une ligne entierement vide est une separation visuelle dans le Sheets
  // du coach, pas une donnee.
  return lignes.filter((l) => l.some((c) => c !== ""));
}

/** Premier nombre d'une cellule (« 8-10 » donne 8, « 60 kg » donne 60). */
export function premierNombre(cellule) {
  const m = String(cellule == null ? "" : cellule).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? m[0] : "";
}

/**
 * Mode d'exercice designe par une cellule « type » ou « mode ».
 *
 * Rend null quand la cellule ne designe rien de connu : l'appelant garde
 * alors « muscu », qui est le cas de tres loin le plus frequent.
 */
export function modeDepuisTexte(cellule) {
  const n = normaliser(cellule);
  if (!n) return null;
  if (/cardio|course|velo|rameur|tapis|elliptique/.test(n)) return "cardio";
  if (/pdc|poids de corps|poids du corps|bodyweight/.test(n)) return "pdc";
  if (/force|powerlifting|pl/.test(n)) return "powerlifting";
  if (/echauffement|warm/.test(n)) return "warmup";
  if (/muscu|hypertrophie|renfo/.test(n)) return "muscu";
  return null;
}

/**
 * Technique d'intensification decrite par une cellule de texte libre.
 *
 * Le coach ecrit « superset avec le suivant », « SS A », « dégressive x2
 * -20% », « drop set ». On ne cherche pas a tout comprendre : on cherche
 * les deux techniques que l'application sait representer, et les chiffres
 * qui vont avec.
 *
 * Rend null quand rien n'est reconnu — y compris sur une cellule remplie.
 * Une note qui n'est pas une technique reste une note.
 */
export function techniqueDepuisTexte(cellule) {
  const brut = String(cellule == null ? "" : cellule);
  const n = normaliser(brut);
  if (!n) return null;

  // « Enchaîner les 2 exercices » est la facon dont un coach francais
  // ecrit un superset dans une consigne.
  if (/\bsuper ?set\b|\bss\b|\bbi ?set\b|\benchain/.test(n)) {
    // « superset A » ou « SS B » : la lettre isolee en fin de mention est
    // le groupe. Une lettre collee a un mot n'en est pas une.
    const m = n.match(/(?:super ?set|ss|bi ?set)\s+([a-f])\b/);
    return { technique: "superset", supersetGroupe: m ? m[1].toUpperCase() : null };
  }

  if (/degress|drop ?set/.test(n)) {
    const paliers = n.match(/x\s*(\d)|(\d)\s*(?:baisse|palier|drop)/);
    const pct = brut.match(/(\d{1,2})\s*%/);
    return {
      technique: "degressive",
      degressivePaliers: paliers ? Number(paliers[1] || paliers[2]) : 2,
      degressiveBaissePct: pct ? Number(pct[1]) : 20
    };
  }

  return null;
}

/**
 * Separateurs d'une colonne DOUBLE, en-tete comme cellule.
 *
 * Un coach economise une colonne en ecrivant « RPE/Charge » et, en
 * dessous, « 8 / 60 ». C'est parfaitement clair pour son client, et
 * c'etait illisible ici : l'en-tete tombait sur « rpe », la cellule
 * rendait son premier nombre, et LA CHARGE ETAIT PERDUE — c'est-a-dire
 * la donnee pour laquelle on importe le tableau.
 */
const SEPARATEURS_DOUBLES = /\s*[/|&]\s*|\s+et\s+/;

/*
 * « + » EN EST VOLONTAIREMENT ABSENT. Dans une cellule il veut dire
 * « plus », pas « ou » : « 7+0,5/sem » est une consigne de progression —
 * RPE 7, plus 0,5 par semaine — et le decouper faisait entrer 0,5 dans la
 * colonne des charges. Un squat a 0,5 kg n'a jamais existe.
 */

/**
 * Roles portes par un en-tete, dans l'ordre ou ils y sont ecrits.
 *
 * Rend presque toujours un seul role. Deux ou plus quand l'en-tete en
 * nomme plusieurs — et l'ORDRE compte : c'est lui qui dit comment lire la
 * cellule en dessous.
 *
 * Il faut DEUX ROLES DISTINCTS pour parler de colonne double : « Poids /
 * Charge » nomme deux fois la meme chose, ce n'est qu'une colonne.
 */
export function rolesDeColonne(entete) {
  const morceaux = enteteUtile(entete)
    .split(SEPARATEURS_DOUBLES)
    .map((x) => x.trim())
    .filter(Boolean);

  if (morceaux.length > 1) {
    const roles = morceaux.map((x) => roleDeColonne(x) || roleDeColonneLarge(x));
    if (new Set(roles.filter(Boolean)).size > 1) return roles;
  }
  return [roleDeColonne(entete)];
}

/** Tous les nombres d'une cellule, dans l'ordre. */
export function nombresDeCellule(cellule) {
  return String(cellule == null ? "" : cellule)
    .replace(/,/g, ".")
    .match(/-?\d+(?:\.\d+)?/g) || [];
}

/**
 * Valeur d'un role dans une cellule qui en porte plusieurs.
 *
 * Deux lectures, dans cet ordre :
 *
 *  1. LA CELLULE EST DECOUPEE COMME SON EN-TETE. « 8 / 60 » sous
 *     « RPE/Charge » donne deux morceaux, alignes sur les deux roles.
 *     C'est le cas propre, et le plus frequent.
 *  2. A DEFAUT, ON PREND LES NOMBRES DANS L'ORDRE. « RPE 8 — 60 kg »
 *     n'a pas de separateur exploitable, mais ses deux nombres sont dans
 *     l'ordre annonce par l'en-tete.
 *
 * Quand la cellule porte moins de valeurs que l'en-tete ne promet de
 * roles, les derniers restent vides. On ne devine pas : attribuer un
 * nombre solitaire au mauvais role est pire que ne rien attribuer.
 */
export function valeurDeRoleDouble(cellule, rang, nombreDeRoles) {
  const brut = String(cellule == null ? "" : cellule).trim();
  if (!brut) return "";

  const morceaux = brut.split(SEPARATEURS_DOUBLES).map((x) => x.trim()).filter(Boolean);
  if (morceaux.length === nombreDeRoles) return premierNombre(morceaux[rang]);

  const nombres = nombresDeCellule(brut);
  return nombres[rang] == null ? "" : nombres[rang];
}

/**
 * Bornes de bon sens, appliquees a ce qui sort du tableau du coach.
 *
 * ELLES NE SONT PAS COSMETIQUES. Le RPE alimente la progression de charge
 * : un « 60 » lu par erreur dans une colonne « RPE/Charge » mal ordonnee
 * ne produirait pas un affichage bizarre, il enverrait le client sur une
 * barre calculee a partir d'un ressenti qui n'existe pas. Une valeur hors
 * bornes est donc ECARTEE, pas ramenee dans la plage : on ne sait pas ce
 * qu'elle voulait dire.
 */
const BORNES = {
  rpe: (v) => v >= 1 && v <= 10,
  sets: (v) => v > 0 && v <= 30,
  reps: (v) => v > 0 && v <= 500,
  weight: (v) => v > 0 && v <= 500
};

export function valeurPlausible(champ, valeur) {
  if (valeur === "" || valeur == null) return "";
  const n = Number(valeur);
  if (!Number.isFinite(n)) return "";
  const borne = BORNES[champ];
  return !borne || borne(n) ? valeur : "";
}

/**
 * Trouve la ligne d'en-tete et la correspondance colonne -> role.
 *
 * L'en-tete est la premiere ligne portant une colonne d'exercices : les
 * Sheets de coach commencent souvent par un titre, un nom de client ou une
 * ligne vide, et rien ne dit que le tableau demarre en A1.
 *
 * Rend null quand aucune ligne ne designe d'exercices. C'est le seul cas
 * ou l'import refuse de deviner : sans colonne d'exercices, il n'y a pas de
 * seance a construire, et inventer une convention conduirait a importer
 * n'importe quoi en silence.
 */
export function trouverEntete(lignes) {
  // PASSE STRICTE D'ABORD, sur toutes les lignes. Une ligne dont une
  // colonne s'appelle « Exercice » est un en-tete ; on ne va pas chercher
  // plus loin, et surtout pas plus large.
  for (let i = 0; i < lignes.length; i++) {
    const colonnes = lignes[i].map(rolesDeColonne);
    if (colonnes.some((r) => r.includes("exercice"))) {
      return { index: i, colonnes: completerRoles(lignes[i], colonnes) };
    }
  }

  // PASSE LARGE ENSUITE, et seulement si la stricte n'a rien donne.
  for (let i = 0; i < lignes.length; i++) {
    const colonnes = lignes[i].map((e) => [roleDeColonneLarge(e)]);
    if (colonnes.some((r) => r.includes("exercice"))) return { index: i, colonnes };
  }

  return null;
}

/**
 * Complete les colonnes restees sans role par la reconnaissance large.
 *
 * Une colonne deja attribuee n'est jamais reprise, et un role deja pourvu
 * n'est jamais attribue deux fois : sinon « Notes sur l'exercice » volerait
 * la colonne d'exercices a la vraie.
 */
function completerRoles(ligne, colonnes) {
  const pris = new Set(colonnes.flat().filter(Boolean));
  return colonnes.map((roles, i) => {
    if (roles.some(Boolean)) return roles;
    const large = roleDeColonneLarge(ligne[i]);
    if (large && !pris.has(large)) {
      pris.add(large);
      return [large];
    }
    return roles;
  });
}

/**
 * Cette ligne est-elle une REPETITION DE L'EN-TETE ?
 *
 * Un tableau de coach ne contient pas un seul tableau : il en contient un
 * par seance, chacun avec sa propre ligne d'en-tete. Sans ce test, chaque
 * en-tete suivant devenait un exercice appele « Exercices » — et le
 * client se retrouvait avec des lignes vides au milieu de son programme.
 *
 * DEUX ROLES RECONNUS AU MINIMUM. Un seul ne suffit pas : un exercice
 * peut legitimement s'appeler « Repos actif », qui tombe sur le role
 * « notes ». Deux noms de colonnes sur la meme ligne, en revanche, ne
 * sont jamais un exercice.
 */
export function estEnteteRepete(ligne) {
  return (ligne || []).filter((c) => roleDeColonne(c)).length >= 2;
}

/** Mots par lesquels un coach ouvre une seance dans son tableau. */
const DEBUT_DE_TITRE = /^(jour|seance|session|semaine|bloc|entrainement|day)\b/;

/**
 * Ce libelle ouvre-t-il une nouvelle seance ?
 *
 * « JOUR 1 », « JOUR 2 - BENCH / DEADLIFT - MARDI », « Séance A ». Ces
 * lignes n'ont ni series ni repetitions : c'est ce qui les distingue d'un
 * exercice, et le mot d'ouverture confirme.
 */
export function estTitreDeSeance(texte) {
  return DEBUT_DE_TITRE.test(normaliser(texte));
}

/**
 * Banniere de seance collee dans une cellule d'en-tete, s'il y en a une.
 *
 * Meme cause que enteteUtile, autre consequence : quand la banniere
 * « JOUR 1 » est avalee par l'en-tete, la ligne qui la portait n'existe
 * plus, et le bloc s'appelait « Séance importée » alors que son nom
 * etait la, dans la meme cellule. On le recupere des deux facons dont
 * l'effondrement se produit — retour a la ligne conserve, ou aplati en
 * espaces.
 */
export function bannierePrefixe(cellule) {
  const avalee = lignesAvalees(cellule).find((l) => estTitreDeSeance(l));
  if (avalee) return avalee;

  const derniere = derniereLigne(cellule);
  const utile = enteteUtile(cellule);
  if (utile && utile !== derniere && derniere.endsWith(utile)) {
    const debut = derniere.slice(0, derniere.length - utile.length).trim();
    if (debut && estTitreDeSeance(debut)) return debut;
  }
  return "";
}

/**
 * Unite et facteur d'une cellule de repetitions.
 *
 * « 30 sec » n'est pas 30 repetitions, et le confondre change la nature
 * de l'exercice : un gainage de 30 secondes devenait « 3×30 » comme s'il
 * s'agissait de trente flexions.
 *
 * L'UNITE DOIT SUIVRE IMMEDIATEMENT LE PREMIER NOMBRE, eventuellement
 * apres une fourchette. C'est ce qui distingue « 30 sec » (une duree) de
 * « 10 + 5 sec » (dix repetitions, puis cinq secondes de maintien) : dans
 * le second, le premier nombre n'est pas suivi de son unite, donc ce sont
 * bien des repetitions.
 */
const UNITE_REPS = /^\s*\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(secondes?|secs?|s|minutes?|mins?|min)\b/i;

export function uniteDeReps(cellule) {
  const m = String(cellule == null ? "" : cellule).match(UNITE_REPS);
  if (!m) return { unite: "reps" };
  return /^m/i.test(m[1]) ? { unite: "minutes" } : { unite: "sec" };
}

/**
 * Seances types deduites d'un tableau deja decoupe.
 *
 * Chaque ligne portant un nom d'exercice devient un exercice. La colonne
 * de seance change de seance quand elle est remplie, et prolonge la
 * precedente quand elle est vide — c'est ainsi qu'un tableau de coach est
 * ecrit : le nom de la seance n'est repete qu'une fois.
 *
 * LES GROUPES DE SUPERSET SONT DEDUITS DE LA SUITE DES LIGNES quand le
 * coach ne les nomme pas : deux exercices marques superset qui se suivent
 * forment un groupe, un exercice normal entre les deux le referme. C'est
 * exactement la convention d'ecriture d'un programme papier.
 */
export function seancesDepuisTableau(lignes) {
  const entete = trouverEntete(lignes);
  if (!entete) {
    /*
     * ON REND CE QU'ON A LU, pas seulement le fait d'avoir echoue.
     *
     * « Aucune colonne Exercice trouvée » ne dit pas au client ce que
     * l'application a devant les yeux. Or les deux causes reelles se
     * distinguent d'un coup d'oeil des qu'on montre la premiere ligne :
     * un en-tete ecrit autrement, ou le mauvais onglet du classeur —
     * l'export sans numero d'onglet rend toujours le premier, qui est
     * souvent une page de garde.
     */
    return { seances: [], erreur: "entete-absent", entetesLus: lignes[0] || [] };
  }

  /**
   * Ou lire chaque role : dans quelle colonne, et a quel rang si cette
   * colonne en porte plusieurs. Calcule une fois pour tout le tableau.
   */
  const plan = {};
  entete.colonnes.forEach((roles, index) => {
    roles.forEach((role, rang) => {
      if (role && !plan[role]) plan[role] = { index, rang, total: roles.length };
    });
  });

  /** Contenu textuel d'un role : un nom d'exercice, une note, un libelle. */
  /*
   * Contenu textuel d'un role : un nom d'exercice, une note, un libelle.
   *
   * LES RETOURS A LA LIGNE SONT APLATIS. Une cellule de tableur en
   * contient des qu'un coach fait tenir « V Squat + Chaise » sur trois
   * lignes pour la lisibilite. Sans cet aplatissement, l'exercice
   * s'appelait litteralement « V Squat\n+\nChaise » dans l'application.
   */
  const colonne = (ligne, role) => {
    const ou = plan[role];
    return ou ? String(ligne[ou.index] || "").replace(/\s+/g, " ").trim() : "";
  };

  /**
   * Valeur chiffree d'un role, bornee au bon sens.
   *
   * Une colonne simple rend son premier nombre, comme avant. Une colonne
   * double rend celui qui correspond a sa position dans l'en-tete.
   */
  const nombre = (ligne, role, champ) => {
    const ou = plan[role];
    if (!ou) return "";
    const cellule = ligne[ou.index] || "";
    const brut = ou.total > 1 ? valeurDeRoleDouble(cellule, ou.rang, ou.total) : premierNombre(cellule);
    return valeurPlausible(champ, brut);
  };

  const seances = [];
  let courante = null;
  let precedentEnSuperset = false;
  let lettre = 0;

  /** Ouvre une seance, ou reprend celle qui porte deja ce nom. */
  const ouvrirSeance = (nom) => {
    if (courante && normaliser(nom) === normaliser(courante.nom)) return;
    if (seances.length >= MAX_SEANCES) return;
    courante = { nom, exercises: [] };
    seances.push(courante);
    precedentEnSuperset = false;
    lettre = 0;
  };

  /*
   * LA BANNIERE DE LA PREMIERE SEANCE EST AU-DESSUS DE SON EN-TETE.
   *
   * Un tableau de coach s'ecrit « JOUR 1 » puis la ligne d'en-tete puis
   * les exercices. Les seances suivantes se lisent toutes seules — leur
   * banniere tombe dans le flux de donnees — mais la premiere serait
   * perdue, et son bloc d'exercices atterrirait dans une seance sans nom
   * pendant que les autres portent le leur. On remonte donc au-dessus de
   * l'en-tete pour la retrouver.
   */
  /*
   * ELLE PEUT AUSSI AVOIR ETE AVALEE PAR L'EN-TETE LUI-MEME.
   *
   * Colle depuis Google Sheets, un tableau a cellules fusionnees rend
   * « JOUR 1 ⏎ Séries » : la banniere et l'en-tete de la colonne
   * n'occupent plus qu'une cellule, et la ligne au-dessus de l'en-tete
   * n'existe plus. La seance s'appelait alors « Séance importée » alors
   * que son nom etait la, une ligne plus haut dans la meme cellule.
   */
  for (const cellule of lignes[entete.index] || []) {
    const avalee = bannierePrefixe(cellule);
    if (avalee) {
      ouvrirSeance(avalee);
      break;
    }
  }

  if (!courante) {
    for (let i = entete.index - 1; i >= 0; i--) {
      const titre = (lignes[i] || []).find((c) => c && c.trim());
      if (!titre) continue;
      if (estTitreDeSeance(titre)) ouvrirSeance(premiereLigne(titre));
      // On ne remonte pas plus haut qu'une ligne pleine : au-dessus, c'est
      // la legende du tableau, pas son organisation.
      break;
    }
  }

  for (const ligne of lignes.slice(entete.index + 1)) {
    // UN TABLEAU DE COACH CONTIENT PLUSIEURS TABLEAUX, un par seance,
    // chacun avec sa propre ligne d'en-tete. Sans ce test, chaque en-tete
    // suivant devenait un exercice appele « Exercices ».
    /*
     * L'ORDRE DES DEUX TESTS COMPTE, et s'y tromper coute deux seances.
     *
     * Une banniere de seance porte souvent, sur la meme ligne, les
     * sous-titres des colonnes de droite (« Charge estimée », « Charge
     * utilisée »). Elle ressemble donc a un en-tete repete. Si on la
     * traite comme tel, on l'ignore — et le bloc d'exercices qui suit
     * s'entasse dans la seance precedente. C'est exactement ce qui
     * arrivait : trois journees d'un programme de force se retrouvaient
     * en une seule.
     */
    const premiereCellule = ligne.find((c) => c && c.trim());
    if (premiereCellule && estTitreDeSeance(premiereCellule)) {
      // La banniere peut avoir avale l'en-tete repete qui la suit, avec ou
      // sans retour a la ligne : « JOUR 4 ⏎ Exercices », « JOUR 4 Exercices ».
      ouvrirSeance(bannierePrefixe(premiereCellule) || premiereLigne(premiereCellule));
      continue;
    }

    if (estEnteteRepete(ligne)) continue;

    const nomExercice = colonne(ligne, "exercice");
    const nomSeance = colonne(ligne, "seance");

    // Une ligne sans exercice mais avec un nom de seance ouvre la seance
    // suivante : beaucoup de tableaux mettent le titre sur sa propre ligne.
    if (nomSeance) ouvrirSeance(nomSeance);

    if (!nomExercice) continue;

    const series = nombre(ligne, "series", "sets");
    const reps = nombre(ligne, "reps", "reps");
    const charge = nombre(ligne, "charge", "weight");

    /*
     * ON NE JETTE PAS UNE LIGNE PARCE QU'ELLE N'A PAS DE CHIFFRES.
     *
     * Une premiere version ecartait tout exercice sans series, sans
     * repetitions et sans charge, pour se debarrasser des bannieres de
     * seance. Le remede etait pire : un tableau qui ne donne qu'un nom et
     * une consigne — « Presse à cuisses · superset avec les fentes » — est
     * parfaitement legitime, et il disparaissait en silence.
     *
     * Les bannieres sont deja reconnues plus haut, a leur mot d'ouverture.
     * Le reste est un exercice, meme depouille.
     */
    if (!courante) {
      courante = { nom: NOM_SEANCE_PAR_DEFAUT, exercises: [] };
      seances.push(courante);
    }
    if (courante.exercises.length >= MAX_EXERCICES_PAR_SEANCE) continue;

    const technique = techniqueDepuisTexte(colonne(ligne, "technique") || colonne(ligne, "notes"));
    const { unite } = uniteDeReps(colonne(ligne, "reps"));

    /*
     * UNE DUREE EN MINUTES DECRIT UN CARDIO, pas une serie. « Marche
     * inclinée · 15-30 mins » est un exercice de duree : l'application
     * sait deja le representer, avec son propre champ. Le noter « 1×15 »
     * en aurait fait quinze repetitions de marche.
     */
    /*
     * UNE DUREE EN MINUTES NE VEUT PAS TOUJOURS DIRE CARDIO, et c'est le
     * NOMBRE DE SERIES qui tranche.
     *
     *  - « Gainage · 3 séries · 1 min » est une serie chronometree. La
     *    noter en cardio lui ferait perdre ses trois series.
     *  - « Marche inclinée · 1 série · 15-30 mins » est un cardio, et
     *    l'application sait deja le representer avec sa duree.
     *
     * Repeter un effort, c'est en faire des series ; le tenir une fois,
     * c'est une duree.
     */
    /*
     * UNE DUREE PEUT ETRE POSEE DANS LA COLONNE DES SERIES.
     *
     * Sur une journee de cardio, le coach ecrit « Escaliers · 15 mins ·
     * 1 » : la duree est dans la colonne « Séries » et le 1 dans celle des
     * repetitions. Lu au pied de la lettre, cela donnait « 15×1 » — quinze
     * series d'une repetition d'escalier.
     */
    const dureeDansSeries = uniteDeReps(colonne(ligne, "series")).unite === "minutes";
    const enMinutes = unite === "minutes";
    const cardio = dureeDansSeries || (enMinutes && Number(series || 0) < 2);
    const dureeMinutes = dureeDansSeries ? premierNombre(colonne(ligne, "series")) : reps;
    const mode = modeDepuisTexte(colonne(ligne, "mode")) || (cardio ? "cardio" : "muscu");

    // Les series chronometrees se comptent en secondes dans l'application :
    // une minute vaut soixante.
    const repsFinales = enMinutes && !cardio ? String(Number(reps) * 60) : reps;
    const uniteFinale = enMinutes ? "sec" : unite;

    const exercice = cardio
      ? { name: nomExercice, mode, durationMin: dureeMinutes, fields: ["durationMin"] }
      : {
          name: nomExercice,
          mode,
          sets: series,
          reps: repsFinales,
          weight: charge,
          repUnit: uniteFinale,
          rpe: nombre(ligne, "rpe", "rpe")
        };

    if (technique && technique.technique === "superset") {
      if (technique.supersetGroupe) {
        exercice.supersetGroupe = technique.supersetGroupe;
        lettre = Math.max(lettre, LETTRES_SUPERSET.indexOf(technique.supersetGroupe) + 1);
      } else {
        if (!precedentEnSuperset) lettre = Math.min(lettre + 1, LETTRES_SUPERSET.length);
        exercice.supersetGroupe = LETTRES_SUPERSET[lettre - 1];
      }
      exercice.technique = "superset";
      precedentEnSuperset = true;
    } else {
      precedentEnSuperset = false;
      if (technique) Object.assign(exercice, technique);
    }

    courante.exercises.push(exercice);
  }

  const retenues = seances.filter((s) => s.exercises.length);
  return {
    seances: retenues,
    erreur: retenues.length ? null : "aucun-exercice",
    // Rendu meme en cas de succes : c'est justement quand l'import
    // « marche » que la mauvaise correspondance passe inapercue.
    colonnes: colonnesLues(entete, lignes[entete.index]),
    enteteLigne: entete.index
  };
}

/** Nom lisible de chaque role, pour montrer au client ce qui a ete compris. */
const LIBELLES_ROLES = {
  exercice: "Exercice",
  seance: "Séance",
  series: "Séries",
  reps: "Reps",
  charge: "Charge",
  rpe: "RPE",
  technique: "Technique",
  repos: "Repos",
  notes: "Notes",
  mode: "Type"
};

/**
 * Comment chaque colonne du tableau a ete comprise.
 *
 * UN IMPORT QUI DEVINE DOIT MONTRER CE QU'IL A DEVINE. La lecture d'un
 * tableau de coach repose sur des correspondances de mots : « Intensités »
 * vaut RPE, « S1 » vaut une charge, « Récupération » n'est pas une
 * consigne. Quand une correspondance se trompe, le resultat est un
 * programme plausible et faux — des seances nommees « 1 », « 3 », « 4 »
 * parce qu'une colonne de nombres a ete prise pour la colonne des seances.
 *
 * Le client ne peut pas diagnostiquer cela, et le coach non plus : rien a
 * l'ecran ne dit d'ou vient chaque valeur. Cette liste le dit, en une
 * ligne, avant d'enregistrer quoi que ce soit.
 */
export function colonnesLues(entete, ligne) {
  if (!entete) return [];
  const vues = [];
  entete.colonnes.forEach((roles, i) => {
    const titre = enteteUtile((ligne && ligne[i]) || "");
    for (const role of roles) {
      if (role && LIBELLES_ROLES[role]) vues.push({ role: LIBELLES_ROLES[role], entete: titre });
    }
  });
  return vues;
}

/** Chaine complete : d'un texte colle ou telecharge aux seances types. */
export function seancesDepuisTexte(texte) {
  return seancesDepuisTableau(analyserTableau(texte));
}

/**
 * Identifiant du classeur et de l'onglet, extraits d'une URL Google Sheets.
 *
 * Deux formes existent, et elles ne se telechargent pas de la meme facon :
 * l'URL d'edition (/spreadsheets/d/ID/edit) et l'URL de publication
 * (/spreadsheets/d/e/2PACX-.../pubhtml), que Google delivre quand on choisit
 * « Publier sur le Web ».
 */
export function identifiantFeuille(url) {
  const brut = String(url == null ? "" : url).trim();
  if (!/docs\.google\.com/.test(brut)) return null;

  const gid = (brut.match(/[#?&]gid=(\d+)/) || [])[1] || null;

  const publie = brut.match(/\/spreadsheets\/d\/e\/([A-Za-z0-9_-]+)/);
  if (publie) return { id: publie[1], publie: true, gid };

  const edition = brut.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (edition) return { id: edition[1], publie: false, gid };

  return null;
}

/**
 * URLs a essayer pour telecharger la feuille en CSV, dans l'ordre.
 *
 * Aucune des deux n'est fiable a elle seule : /gviz/tq repond a des
 * documents partages par lien, /export?format=csv passe parfois quand
 * l'autre echoue. On les essaie l'une apres l'autre plutot que de parier.
 */
export function urlsExportCsv(url) {
  const feuille = identifiantFeuille(url);
  if (!feuille) return [];

  const suffixeGid = feuille.gid ? "&gid=" + feuille.gid : "";
  if (feuille.publie) {
    return ["https://docs.google.com/spreadsheets/d/e/" + feuille.id + "/pub?output=csv" + suffixeGid];
  }
  return [
    "https://docs.google.com/spreadsheets/d/" + feuille.id + "/gviz/tq?tqx=out:csv" + suffixeGid,
    "https://docs.google.com/spreadsheets/d/" + feuille.id + "/export?format=csv" + suffixeGid
  ];
}

/** Une reponse Google qui commence par du HTML est une page de connexion. */
const estPageHtml = (texte) => /^\s*<(?:!doctype|html|head|meta)/i.test(String(texte || ""));

/**
 * Telecharge la feuille et rend son contenu CSV.
 *
 * NE LANCE JAMAIS. Un import qui echoue n'est pas une panne : c'est le cas
 * courant, parce qu'un Google Sheets est prive par defaut et que le
 * navigateur bloque alors la lecture. L'appelant a besoin de savoir
 * POURQUOI pour proposer le collage, d'ou une raison plutot qu'une
 * exception.
 *
 * Raisons possibles :
 *  - « url-invalide »  : ce n'est pas un lien Google Sheets ;
 *  - « inaccessible »  : le document n'est pas partagé par lien ;
 *  - « reseau »        : hors ligne, ou requete bloquee par le navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ON GARDE LA MEILLEURE REPONSE, PAS LA PREMIERE QUI REPOND
 * ─────────────────────────────────────────────────────────────────────
 *
 * /gviz/tq repond a des documents que /export refuse par CORS — c'est
 * pour ca qu'il est essaye en premier. Mais un tableau de coach reel a
 * montre qu'il peut repondre 200 avec un texte AMPUTE : une bannière
 * « JOUR 2 » assise dans une colonne autrement toute numerique (une
 * colonne de Séries : 1, 3, 4...) en ressort vide, comme si la case
 * n'avait jamais contenu de texte. Rien ne le signale : la reponse est
 * valide, le CSV est bien forme, seule l'information a disparu. Le
 * client obtenait un unique bloc « JOUR 1 » avalant les quatre journees
 * de son programme, sans la moindre erreur a l'ecran.
 *
 * Il n'y a pas de reparation possible cote lecture : un texte disparu
 * en amont ne se retrouve pas par une regle plus maligne. La seule
 * defense est d'essayer les DEUX sources et de garder celle qui produit
 * le plus de seances — le signe le plus direct qu'aucune bannière ne
 * s'est perdue en route.
 */
export async function telechargerFeuille(url, options = {}) {
  const recuperer = options.fetchImpl || (typeof fetch === "function" ? fetch : null);
  const urls = urlsExportCsv(url);
  if (!urls.length) return { ok: false, raison: "url-invalide" };
  if (!recuperer) return { ok: false, raison: "reseau" };

  let raison = "reseau";
  let meilleur = null;

  for (const candidate of urls) {
    try {
      const reponse = await recuperer(candidate);
      if (!reponse || !reponse.ok) {
        raison = "inaccessible";
        continue;
      }
      const texte = await reponse.text();
      if (!texte || !texte.trim() || estPageHtml(texte)) {
        raison = "inaccessible";
        continue;
      }

      // A egalite de seances lues, on garde la premiere source qui a
      // repondu : ca ne change rien pour les tableaux d'une seule
      // seance, ni pour ceux que la premiere source lit deja bien.
      const score = seancesDepuisTexte(texte).seances.length;
      if (!meilleur || score > meilleur.score) meilleur = { texte, score };
    } catch (e) {
      // Une erreur levee par fetch est presque toujours le blocage
      // d'origine croisee du navigateur, indiscernable d'une panne reseau.
      raison = "reseau";
    }
  }
  return meilleur ? { ok: true, texte: meilleur.texte } : { ok: false, raison };
}
