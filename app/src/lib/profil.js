/**
 * Profil par defaut d'un nouveau client.
 *
 * Portage de l'etat initial d'Onboarding (index.html 4745).
 *
 * Ces valeurs ne sont pas neutres : elles s'appliquent a tout client qui ne
 * touche pas au champ correspondant. Un objectif de sommeil a 8 h ou un
 * objectif de pas a 8 000 deviennent SES objectifs, affiches et notes tous
 * les jours. Elles doivent donc rester identiques a celles de
 * l'application actuelle, sinon deux clients partis du meme endroit ne
 * seraient pas juges pareil.
 */

export const PROFIL_PAR_DEFAUT = {
  sex: "homme",
  activityLevel: "leger",
  goal: "maintien",
  targetSleepHours: 8,
  weeklyWorkoutTarget: 3,
  targetWaterL: 2,
  dietType: "aucun",
  allergies: [],
  jobType: "sedentaire",
  targetSteps: 8000,
  trainingMode: "app",
  coachingMode: "presentiel",
  slots: []
};
