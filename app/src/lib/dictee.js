/**
 * Dictee vocale : decrire son repas a voix haute.
 *
 * Ajout posterieur a la bascule, d'apres MyFitnessPal, Lifesum et Fitia.
 * Pour un papa qui a un enfant dans les bras, parler est plus simple que
 * taper. La dictee remplit la description ; c'est ensuite l'IA qui estime
 * le repas, exactement comme pour une description tapee.
 *
 * L'API Web Speech n'existe pas partout : Chrome (Android, ordinateur) et
 * Safari (iPhone 14.5+) l'ont, Firefox non. Absente, le bouton micro n'est
 * pas affiche et la description se tape — le micro du clavier du telephone
 * reste alors une alternative.
 */

/** Le constructeur de reconnaissance vocale du navigateur, ou null. */
export function moteurDictee(env = typeof window !== "undefined" ? window : undefined) {
  if (!env) return null;
  return env.SpeechRecognition || env.webkitSpeechRecognition || null;
}

/**
 * Texte reconnu jusqu'ici.
 *
 * Le navigateur rend une liste de segments, chacun avec ses hypotheses :
 * on garde la meilleure de chacun, dans l'ordre.
 */
export function transcription(resultats) {
  return Array.from(resultats || [])
    .map((r) => (r && r[0] && r[0].transcript) || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ce que la dictee ajoute a ce qui etait deja ecrit. */
export function completerTexte(existant, dicte) {
  const a = String(existant || "").trim();
  const b = String(dicte || "").trim();
  if (!b) return a;
  return a ? `${a} ${b}` : b;
}

/** Message affiche pour un code d'erreur de la reconnaissance vocale. */
export function messageErreurDictee(code) {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "Micro refusé. Autorise-le dans les réglages du navigateur, ou tape ta description.";
  }
  if (code === "no-speech") return "Je n'ai rien entendu. Réessaie en parlant près du téléphone.";
  if (code === "audio-capture") return "Aucun micro détecté. Tape ta description.";
  if (code === "network") return "Dictée indisponible sans connexion. Tape ta description.";
  if (code === "aborted") return null;
  return "Dictée indisponible. Tape ta description.";
}

/**
 * Delais de securite, en millisecondes.
 *
 * Constat du 29 septembre 2026 : « la dictee a freeze mon appli ».
 * Certains navigateurs exposent la reconnaissance vocale mais ne la font
 * jamais aboutir — Samsung Internet, ou Safari dans une application
 * installee sur l'ecran d'accueil : aucun resultat, aucune erreur, et
 * surtout aucun evenement de fin. L'ecran restait sur « Je t'ecoute... »,
 * et « Arreter » ne changeait rien puisqu'il attendait ce meme evenement.
 *
 * - SIGNE_DE_VIE : sans demarrage effectif du micro ni resultat dans ce
 *   delai, la dictee est declaree en panne. Il laisse le temps de repondre
 *   a la demande d'autorisation du micro.
 * - DUREE_MAX : une dictee de repas ne dure pas plus longtemps.
 * - ARRET : apres « Arreter », le navigateur a ce delai pour confirmer ;
 *   au-dela, on force la fin.
 */
export const DELAIS_DICTEE = { SIGNE_DE_VIE: 15000, DUREE_MAX: 45000, ARRET: 2000 };

export const MSG_DICTEE_MUETTE =
  "La dictée ne répond pas sur ce navigateur. Touche le micro de ton clavier pour dicter, puis « Estimer avec l'IA ».";

/**
 * Lance une dictee en francais.
 *
 * Rend une fonction d'arret, ou null si le navigateur ne sait pas dicter.
 * `surTexte` recoit le texte reconnu au fil de la parole (resultats
 * intermediaires compris : le client voit ses mots apparaitre), `surFin`
 * est appele UNE SEULE FOIS quand l'ecoute s'arrete, pour quelque raison
 * que ce soit — y compris quand le navigateur ne le signale jamais : les
 * delais de securite ci-dessus le garantissent.
 */
export function demarrerDictee({ surTexte, surErreur, surFin }, env, delais = DELAIS_DICTEE) {
  const Moteur = moteurDictee(env);
  if (!Moteur) return null;
  const minuteur = (env && env.setTimeout) || setTimeout;
  const annuler = (env && env.clearTimeout) || clearTimeout;

  let reco;
  try {
    reco = new Moteur();
  } catch (e) {
    // Le constructeur existe mais refuse de servir : on le dit, au lieu
    // d'un bouton qui ne fait rien.
    if (surErreur) surErreur(MSG_DICTEE_MUETTE);
    if (surFin) surFin();
    return null;
  }

  let finie = false;
  let vivante = false;
  const minuteries = [];
  const plusTard = (fn, ms) => minuteries.push(minuteur(fn, ms));

  const detacher = () => {
    reco.onresult = reco.onerror = reco.onend = reco.onstart = reco.onaudiostart = null;
  };
  const terminer = () => {
    if (finie) return;
    finie = true;
    minuteries.forEach((m) => annuler(m));
    detacher();
    if (surFin) surFin();
  };
  const forcerLaFin = (message) => {
    if (finie) return;
    try {
      (reco.abort || reco.stop).call(reco);
    } catch (e) {
      // Deja arretee, ou navigateur qui refuse : la fin est forcee de toute facon.
    }
    if (message && surErreur) surErreur(message);
    terminer();
  };

  reco.lang = "fr-FR";
  reco.interimResults = true;
  reco.continuous = false;
  reco.maxAlternatives = 1;
  reco.onstart = reco.onaudiostart = () => {
    vivante = true;
  };
  reco.onresult = (e) => {
    vivante = true;
    if (surTexte) surTexte(transcription(e.results));
  };
  reco.onerror = (e) => {
    const message = messageErreurDictee(e && e.error);
    if (message && surErreur) surErreur(message);
  };
  reco.onend = terminer;

  try {
    reco.start();
  } catch (e) {
    // start() leve si une ecoute est deja en cours, ou si le navigateur la
    // refuse : on rend la main tout de suite.
    terminer();
    return null;
  }

  plusTard(() => {
    if (!vivante) forcerLaFin(MSG_DICTEE_MUETTE);
  }, delais.SIGNE_DE_VIE);
  plusTard(() => forcerLaFin(null), delais.DUREE_MAX);

  return () => {
    if (finie) return;
    try {
      reco.stop();
    } catch (e) {
      // Deja arretee.
    }
    // Le navigateur doit confirmer par « end » ; s'il ne le fait pas, on
    // n'attend pas indefiniment.
    plusTard(() => forcerLaFin(null), delais.ARRET);
  };
}
