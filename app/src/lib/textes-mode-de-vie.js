/**
 * Mode de vie, motivation et trophées (repris de l'app Neiram le
 * 24/10/2026) : textes des cartes « Mes habitudes », « La leçon du jour »,
 * « Mes déclics » et « Mon année Neiram ». Les écrans (ui/CarteHabitudes,
 * ui/CarteLecon, ui/CarteDeclics, ui/CarteBilanAnnee) ne font que les
 * afficher.
 *
 * Dans l'app coach, tout est inclus : pas de limite « gratuite », le taux
 * sur 30 jours et les 28 leçons pour tous.
 */

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export const TEXTES_HABITUDES = {
  titre: "🌱 Mes habitudes",
  modifier: "Modifier",
  choisir: "Choisir",
  vide:
    "Choisis 1 à 3 petites habitudes (marcher après le repas, se coucher à heure fixe…) et coche-les chaque jour. Une habitude devient automatique en 66 jours en moyenne.",
  aria: (coche, label) => `${coche ? "Décocher" : "Cocher"} : ${label}`,
  coche: "✓",
  nom: (h) => `${h.emoji} ${h.label}`,
  /** « 🔥 5 jours · 🛡️ 1 joker · 63 % sur 30 jours ». */
  ligne: (s, taux) =>
    [
      s.jours > 0 ? `🔥 ${pluriel(s.jours, "jour")}` : "Série à lancer",
      s.jokersDispo > 0 ? `🛡️ ${pluriel(s.jokersDispo, "joker")}` : null,
      `${taux} % sur 30 jours`
    ]
      .filter(Boolean)
      .join(" · "),
  titreChoix: "Choisir mes habitudes",
  introChoix:
    "Commence petit : 1 à 3 habitudes valent mieux que 10 abandonnées. Un oubli est pardonné : tu gagnes un joker tous les 7 jours tenus.",
  maximum: (n) => `Tu suis déjà ${n} habitudes, le maximum : retires-en une pour en ajouter une autre.`,
  placeholderPerso: "Mon habitude à moi…",
  ajouter: "Ajouter",
  cestParti: "C'est parti"
};

export const TEXTES_LECONS = {
  titre: "🎓 La leçon du jour",
  titreFin: "🎓 L'école Neiram",
  bravo: (n) => `Bravo : tu as suivi les ${n} leçons !`,
  themes: { habitudes: "Habitudes", nutrition: "Nutrition", mouvement: "Mouvement", sommeil: "Sommeil", mental: "Mental" },
  position: (jour, total, theme) => `${jour}/${total} · ${theme}`,
  titreLecon: (titre, faite) => `${titre}${faite ? " ✓" : ""}`,
  lire: "Lire (2 min)",
  relire: "Relire",
  aRetenir: (t) => `À retenir : ${t}`,
  retour: (bonne, explication) => `${bonne ? "Exact !" : "Pas tout à fait."} ${explication}`,
  action: "Ton action du jour :",
  source: (s) => `Source : ${s}`
};

export const TEXTES_DECLICS = {
  titre: "💡 Mes déclics",
  vide:
    "Note ton énergie, ton stress et ton sommeil dans le Journal pendant 2 à 3 semaines : l'appli te montrera ce qui va avec tes meilleures journées (entraînement, pas, habitudes…).",
  phrase: (d) => `${d.mieux ? "✅" : "⚠️"} ${d.phrase}`,
  prudence: "Ce sont des liens observés dans tes données, pas des preuves de cause à effet."
};

export const TEXTES_BILAN_ANNEE = {
  titre: (a) => `🎁 Mon année Neiram ${a}`,
  saison: (a) => `Ton bilan ${a} est prêt : tes séances, tes sports, tes records, ta transformation.`,
  horsSaison: "Ton année jusqu'ici, en quelques écrans à partager.",
  voir: "Voir mon année",
  titreModale: (a) => `Mon année ${a}`,
  suivant: "Suivant",
  partager: "📣 Partager mon année en story",
  surtitre: (a) => `MON ANNÉE ${a}`,
  nomFichier: (a) => `mon-annee-neiram-${a}.png`,
  imageEnregistree: "Image enregistrée : publie-la en story.",
  partage: "Partagé ! Merci 🙌",
  imageRatee: "L'image n'a pas pu être créée."
};
