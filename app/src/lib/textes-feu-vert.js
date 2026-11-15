/**
 * Textes de l'écran Feu Vert, de sa carte dans l'Espace coach et de son
 * réglage de profil (14 novembre 2026).
 *
 * Ils vivent ici, hors des composants, comme les autres fonctions ajoutées
 * après la bascule (textes-sports.js, textes-menu.js…) : les écrans ne
 * contiennent plus de phrases nouvelles en dur (tests/fidelite-ecrans).
 *
 * Ton : tutoiement, phrases courtes, aucune promesse de résultat, jamais
 * de poids ni de physique. Le niveau mesure la technique.
 */

const dateFr = (iso) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "");
const horodatage = (iso) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const pluriel = (n, mot) => n + " " + mot + (n > 1 ? "s" : "");

export const TEXTES_FEU_VERT = {
  // En-tête et navigation.
  titre: "Feu Vert",
  sousTitre: (cohorte, parcours) => `Cohorte ${cohorte} · parcours ${parcours}`,
  avant: (debut, jours) => `Le cycle démarre le lundi ${dateFr(debut)} (dans ${pluriel(jours, "jour")}). Tu peux déjà lire tes fiches et ta semaine 1.`,
  termine: "Cycle terminé. Ton Passeport et ta régularité restent consultables ici.",
  enCours: (n, titre) => `Semaine ${n} sur 6 · ${titre}`,
  vues: { programme: "Programme", passeport: "Passeport", missions: "Missions", checkin: "Check-in", regularite: "Régularité" },
  navigation: "Sections Feu Vert",
  bandeauLundi: (n) => `C'est lundi : envoie ton check-in de la semaine ${n} (3 lignes, 1 minute).`,
  ouvrirReglages: "Ouvrir les réglages",

  // Programme.
  semaineDates: (n, du, au, enCours) => `Semaine ${n} · du ${dateFr(du)} au ${dateFr(au)}${enCours ? " · en cours" : ""}`,
  ongletSeance: (l, faite) => (l === "bonus" ? "Bonus" : "Séance " + l) + (faite ? " ✓" : ""),
  structure: (parcours) => `Parcours ${parcours} · échauffement 8 min, série d'approche avant chaque geste, retour au calme 5 min.`,
  fiche: "Fiche",
  repos: (r) => "repos " + r,
  chargeAria: (nom) => "Charge " + nom,
  chargeUnite: "kg",
  chargeBloquee: "Charge bloquée : elle ne bouge pas tant que le geste n'est pas vert.",
  chargeLibre: "Geste vert : double progression autorisée (1 cran max par semaine).",
  pointer: (l) => (l === "bonus" ? "J'ai fait la séance bonus" : "J'ai fait la séance " + l),
  pointee: (date) => `Séance pointée le ${dateFr(date)}. Elle compte dans ton check-in et ta régularité.`,
  seanceDeMarien: "Ma séance de la semaine, par Marien",
  seanceDeMarienAide: "Regarde Marien faire la séance A de la semaine avant la tienne.",
  pasEncore: (n) => `Le pointage s'ouvre quand la semaine ${n} commence.`,
  toastPointage: (l) => (l === "bonus" ? "Séance bonus pointée. Bravo !" : `Séance ${l} pointée. Bravo !`),
  alternativesTitre: (ouvert) => "Machine ou poste occupé ? " + (ouvert ? "▴" : "▾"),
  alternativesAide: "Demande d'abord si tu peux alterner (mission 3). Sinon l'alternative 1, puis la 2. Une alternative ne fait pas passer un geste au vert.",

  // Fiche d'un geste.
  corrigeLe: (date) => "Corrigé le " + dateFr(date),
  pasCorrige: "Pas encore corrigé",
  objectif: "Objectif : ",
  voirVideo: "Voir la vidéo de démonstration",
  miseEnPlace: "Mise en place",
  pointsCles: "Points clés",
  erreurs: "Erreurs fréquentes",
  criteresTitre: "Ce que Marien regarde sur ta vidéo",
  criteresAide: "Sécurité (S) : un seul raté laisse le geste au rouge. Qualité (Q) : à travailler pour passer au vert.",
  filmer: "Comment te filmer",
  facilitee: "Version facilitée",

  // Passeport.
  passeportSurtitre: "Mon Passeport Feu Vert",
  niveau: (n, nom) => `Niveau ${n} · ${nom}`,
  verts: (n) => `${n}/8 gestes au vert`,
  vertsAria: (n) => `${n} gestes verts sur 8`,
  prochain: (s) => `Prochain : niveau ${s.niveau} (${s.nom}) · ${s.condition.toLowerCase()}${s.manque ? " · encore " + pluriel(s.manque, "geste") : ""}.`,
  niveauHonnete: "Ton niveau mesure ta technique. Il ne dit rien de ton poids ni de ton physique.",
  mesGestes: "Mes 8 gestes",
  mesGestesAide: "L'état de chaque geste est fixé par Marien après la correction de ta vidéo. Touche un geste pour sa fiche.",
  aJour: (iso) => `À jour (${horodatage(iso)})`,
  actualiser: "Actualiser",

  // Missions et module mental.
  missionSurtitre: (n, semaines, cetteSemaine) => `Mission ${n} · ${semaines}${cetteSemaine ? " · cette semaine" : ""}`,
  missionValidee: "Validée par Marien",
  reussieSi: "Réussie si : ",
  planB: "Plan B : ",
  jeLaiFaite: "Je l'ai faite (je l'écris dans mon check-in, Marien la valide)",
  moduleSurtitre: (n) => `Module mental de la semaine ${n} · 5 min`,
  pourquoi: "Pourquoi : ",

  // Check-in.
  checkinTitre: "Check-in du lundi",
  checkinAVenir: (date) =>
    `Chaque lundi, 3 lignes sur ta semaine écoulée : séances faites, 1 victoire, 1 blocage. Ton premier check-in : lundi ${dateFr(date)}. Marien répond à chaque check-in dans la journée.`,
  checkinEnvoyeTitre: (n) => `Check-in semaine ${n} envoyé`,
  checkinEnvoyeLe: (iso) => `Envoyé le ${horodatage(iso)}. Marien te répond dans la journée.`,
  resumeSeances: (n, semaine, bonus) => `Séances : ${n}/2${semaine >= 4 ? " · bonus : " + (bonus ? "oui" : "non") : ""}`,
  resumeVictoire: (t) => "Victoire : " + t,
  resumeBlocage: (t) => "Blocage : " + t,
  corriger: "Corriger et renvoyer",
  checkinFormTitre: (n) => `Check-in · semaine ${n}`,
  checkinPeriode: (du, au) => `Sur ta semaine du ${dateFr(du)} au ${dateFr(au)}. Il part directement à Marien.`,
  champSeances: "1. Séances faites",
  sur2: (v) => v + "/2",
  propose: (n, semaine, bonus) => `Proposé d'après tes pointages : ${n}/2${semaine >= 4 && bonus ? " + bonus" : ""}.`,
  bonusFait: "J'ai fait la séance bonus",
  champVictoire: "2. Ma victoire",
  champBlocage: "3. Mon blocage",
  exempleVictoire: "Ex : j'ai fait ma séance A en entier en heure creuse",
  exempleBlocage: "Ex : je n'ose pas aller dans la zone haltères",
  ligneMission: (n, titre) => `Mission ${n} (${titre}) : `,
  faite: (oui) => (oui ? "faite" : "pas faite"),
  aCocher: "À cocher dans l'onglet Missions.",
  envoyer: "Envoyer mon check-in",
  incomplet: "Une victoire et un blocage, même petits : c'est ce qui permet à Marien de t'aider.",
  horsLigne: "Pas de réseau ? Il part automatiquement au retour de la connexion.",
  toastCheckin: "Check-in envoyé à Marien.",

  // Régularité.
  compteurTitre: "Mon compteur",
  compteurCases: (semaine, max, cumul, serie) => [
    ["Cette semaine", max ? `${semaine}/${max}` : String(semaine)],
    ["Cumul", String(cumul)],
    ["Série", serie + " sem."]
  ],
  bareme: "1 point par séance (max 2), 1 pour la séance bonus (S4-S6), 1 pour le check-in, 2 par mission validée. Série : semaines consécutives à 2 séances.",
  tableauTitre: "Tableau de la cohorte",
  tableauAide: "Il récompense le fait de venir, jamais la charge, le poids ou l'apparence. Ordre alphabétique, sans classement.",
  accord:
    "J'accepte que mon pseudo et ma régularité (séances faites, check-ins envoyés, missions validées) apparaissent dans le tableau visible par les membres de ma cohorte.",
  champPseudo: "Mon pseudo",
  exemplePseudo: "Prénom ou pseudo",
  enregistrer: "Enregistrer",
  meRetirer: "Me retirer du tableau",
  enregistrerChoix: "Enregistrer mon choix",
  tableauVide: "Le tableau apparaît ici dès que des membres de ta cohorte ont donné leur accord. Ton compteur reste visible juste au-dessus.",
  colonnes: ["Pseudo", "Sem.", "Cumul", "Série"],
  toastAccord: (oui) => (oui ? "Tu apparais dans le tableau de ta cohorte." : "Tu n'apparais plus dans le tableau."),

  // Réglage du profil.
  formule: "Formule",
  formuleAide: (actif) =>
    actif
      ? "Feu Vert : ton programme de 6 semaines, ton Passeport, tes missions et ton check-in du lundi sont dans l'onglet Feu Vert."
      : "Coaching individuel : l'application fonctionne comme avant.",
  parcours: "Parcours",
  parcoursAide: (aide) => aide + " Marien te l'a indiqué après le questionnaire.",
  cohorte: "Cohorte n°",
  debut: "Début du cycle"
};

/** Espace coach : carte « Feu Vert · Passeports ». */
export const TEXTES_FEU_VERT_COACH = {
  titre: "Feu Vert · Passeports",
  aide: "Inscris chaque membre (après l'activation de son code d'accès), puis fixe l'état de ses gestes après chaque correction vidéo et valide ses missions après le check-in. Le membre ne peut rien modifier.",
  choisir: "Choisir un client…",
  cohorte: "Cohorte",
  inscrire: "Inscrire",
  chargement: "Chargement…",
  aucun: "Aucun membre inscrit.",
  resume: (cohorte, verts, missions) => `C${cohorte} · ${verts}/8 · ${missions}/4 missions`,
  detail: (niv, pseudo) => `Niveau ${niv.niveau} (${niv.nom}) · ${niv.verts}/8 verts · ${pseudo ? "tableau : " + pseudo : "hors tableau"}`,
  le: (date) => "le " + date.split("-").reverse().join("/"),
  missionsTitre: "Missions validées (semaine où elles comptent au tableau)",
  nonValidee: "non validée",
  valideeS: (n) => "validée S" + n,
  enregistrer: "Enregistrer",
  retirer: "Retirer",
  confirmerRetrait: (l) => `Retirer ${l} de Feu Vert ? Son Passeport et sa ligne du tableau sont effacés.`,
  enregistre: "Passeport enregistré : le membre le verra à sa prochaine ouverture de l'application.",
  inscrit: (c) => "Membre inscrit dans la cohorte " + c + ".",
  retire: "Membre retiré de Feu Vert.",
  // Séance de la semaine filmée par Marien (lien vidéo par cohorte et par semaine).
  videosTitre: (c) => "Ma séance de la semaine, par Marien · cohorte " + c,
  videosAide: "Colle le lien de ta vidéo (YouTube non répertoriée, Drive…) pour chaque semaine. Lien vide : rien n'apparaît chez les membres.",
  videoPlaceholder: (n) => "S" + n + " : https://…",
  enregistrerVideos: "Enregistrer les liens",
  videosOk: "Liens enregistrés.",
  videoInvalide: "Lien refusé : il doit commencer par https://."
};
