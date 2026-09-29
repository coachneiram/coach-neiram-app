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
 * Lance une dictee en francais.
 *
 * Rend une fonction d'arret, ou null si le navigateur ne sait pas dicter.
 * `surTexte` recoit le texte reconnu au fil de la parole (resultats
 * intermediaires compris : le client voit ses mots apparaitre), `surFin`
 * est appele quand l'ecoute s'arrete, pour quelque raison que ce soit.
 */
export function demarrerDictee({ surTexte, surErreur, surFin }, env) {
  const Moteur = moteurDictee(env);
  if (!Moteur) return null;
  const reco = new Moteur();
  reco.lang = "fr-FR";
  reco.interimResults = true;
  reco.continuous = false;
  reco.maxAlternatives = 1;
  reco.onresult = (e) => surTexte && surTexte(transcription(e.results));
  reco.onerror = (e) => {
    const message = messageErreurDictee(e && e.error);
    if (message && surErreur) surErreur(message);
  };
  reco.onend = () => surFin && surFin();
  try {
    reco.start();
  } catch (e) {
    // start() leve si une ecoute est deja en cours : on la laisse finir.
    if (surFin) surFin();
    return null;
  }
  return () => {
    try {
      reco.stop();
    } catch (e) {
      // Deja arretee.
    }
  };
}
