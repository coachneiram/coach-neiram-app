/**
 * Le document que le client envoie a son coach le dimanche.
 *
 * Portage fidele de buildWeeklyReportHTML et shareWeeklyReport
 * (index.html, ligne 3948). C'est une page HTML autonome : styles en
 * ligne, photos en data URI, aucune ressource externe. Elle doit
 * s'ouvrir telle quelle dans WhatsApp, dans un mail, ou depuis le
 * telechargement, des annees apres, sans l'application.
 *
 * D'ou deux regles :
 *   - tout ce qui vient du client passe par echapperHtml, y compris ses
 *     notes libres et son prenom ;
 *   - une donnee absente n'affiche pas « — » mais disparait : un bilan
 *     de debut de suivi ne doit pas ressembler a un formulaire vide.
 */

import { fmtDateLong } from "./dates.js";
import { fmtL } from "./score-jour.js";
import { GOALS } from "./nutrition.js";
import { slugNom } from "./sauvegarde.js";
import { fmtEcart, fmtValeur, pointsMiniCourbe } from "./progression-corps.js";

/** Les trois poses du suivi photo, dans l'ordre d'affichage. */
export const POSES_BILAN = ["face", "profil", "dos"];

export function echapperHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function construireBilanHTML({ profile, weekStats, report, photos, targets }) {
  const e = echapperHtml;
  const s = weekStats;

  const stat = (label, value) =>
    value == null || value === ""
      ? ""
      : `<div style="background:#141416;border:1px solid #28282D;border-radius:10px;padding:10px 12px"><div style="font-size:17px;font-weight:700;color:#F5F5F2">${e(
          value
        )}</div><div style="font-size:10px;color:#9C9C94;margin-top:2px">${e(label)}</div></div>`;

  const stats = [
    stat(
      "Séances",
      s.planSummary && s.planSummary.planned
        ? s.workoutsCount + " (" + s.planSummary.done + "/" + s.planSummary.planned + " programmées)"
        : s.workoutsCount
    ),
    stat("Sommeil moy.", s.avgSleepH != null ? s.avgSleepH + " h" : null),
    stat(
      "Poids",
      s.latestWeight != null
        ? s.latestWeight + " kg" + (s.weightDelta != null ? ` (${s.weightDelta > 0 ? "+" : ""}${s.weightDelta})` : "")
        : null
    ),
    stat(
      "Masse grasse",
      s.latestFatPct != null
        ? s.latestFatPct + " %" + (s.fatPctDelta != null ? ` (${s.fatPctDelta > 0 ? "+" : ""}${s.fatPctDelta})` : "")
        : null
    ),
    stat(
      "Muscle",
      s.latestMuscle != null
        ? s.latestMuscle + " kg" + (s.muscleDelta != null ? ` (${s.muscleDelta > 0 ? "+" : ""}${s.muscleDelta})` : "")
        : null
    ),
    stat(
      "Calories moy.",
      s.avgCalories != null
        ? s.avgCalories + " kcal" + (targets && targets.calories ? " / " + targets.calories : "")
        : null
    ),
    stat("Macros moy.", s.avgProtein != null ? `P${s.avgProtein} G${s.avgCarbs} L${s.avgFat}` : null),
    stat("Pas moy./jour", s.avgSteps != null ? Math.round(s.avgSteps).toLocaleString("fr-FR") : null),
    stat("Hydratation moy.", s.avgWaterMl != null ? fmtL(s.avgWaterMl) : null),
    stat(
      "Série de semaines",
      s.weeklyStreak != null ? `${s.weeklyStreak} tenue${s.weeklyStreak > 1 ? "s" : ""} (record ${s.weeklyStreakBest ?? s.weeklyStreak})` : null
    ),
    stat("Fruits & légumes moy.", s.avgFruitsVeg != null ? `${s.avgFruitsVeg} portions / 5` : null),
    stat("Protéines moy.", s.avgProteinPortions != null ? `${s.avgProteinPortions} portions / 3` : null),
    stat("Énergie / Stress", s.avgEnergy != null ? `${s.avgEnergy}/5 · ${s.avgStress ?? "—"}/10` : null),
    stat("Jours suivis", s.loggedDaysCount + "/7"),
    stat("Adhérence", s.adherence + " %")
  ].join("");

  const blocPhotos =
    photos && (photos.face || photos.profil || photos.dos)
      ? `<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#F8D040;margin:22px 0 10px">Photos de la semaine</h2>
       <div style="display:flex;gap:8px">${POSES_BILAN.map((k) =>
         photos[k]
           ? `<figure style="flex:1;margin:0"><img src="${photos[k]}" style="width:100%;border-radius:10px;display:block" alt="${k}"/><figcaption style="text-align:center;font-size:10px;color:#9C9C94;margin-top:4px;text-transform:capitalize">${k}</figcaption></figure>`
           : ""
       ).join("")}</div>`
      : "";

  const sec = report && report.sections ? report.sections : {};

  const liste = (titre, arr, couleur) =>
    arr && arr.length
      ? `<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${couleur};margin:18px 0 8px">${e(
          titre
        )}</h2><ul style="margin:0;padding-left:18px">${arr
          .map((x) => `<li style="font-size:13px;line-height:1.55;color:#F5F5F2;margin-bottom:4px">${e(x)}</li>`)
          .join("")}</ul>`
      : "";

  const para = (titre, texte) =>
    texte
      ? `<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9C9C94;margin:18px 0 8px">${e(
          titre
        )}</h2><p style="font-size:13.5px;line-height:1.6;color:#F5F5F2;margin:0">${e(texte)}</p>`
      : "";

  const blocDouleurs =
    s.painLines && s.painLines.length
      ? '<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#F5B942;margin:18px 0 8px">Douleurs signalées</h2><ul style="margin:0;padding-left:18px">' +
        s.painLines
          .map((x) => '<li style="font-size:13px;line-height:1.55;color:#F5F5F2;margin-bottom:4px">' + e(x) + "</li>")
          .join("") +
        "</ul>"
      : "";

  // Contrat : en tete du bilan, en couleur quand la fin approche ou est
  // passee, pour que le coach ne rate aucun renouvellement.
  const blocContrat = s.contrat
    ? `<div data-contrat-bilan style="background:${s.contrat.bientot || s.contrat.termine ? "#F8D0401A" : "#141416"};border:1px solid ${
        s.contrat.bientot || s.contrat.termine ? "#F8D040" : "#28282D"
      };border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12.5px;line-height:1.5;color:#F5F5F2"><b style="color:#F8D040">Contrat :</b> ${e(
        s.contrat.ligne
      )}</div>`
    : "";

  // Progression du corps depuis la premiere mesure (ajout du 6 octobre
  // 2026) : poids et mensurations, ecart colore dans le sens de l'objectif,
  // et une mini-courbe en SVG en ligne, lisible sans l'application.
  const progression = s.progressionCorps;
  const blocProgression =
    progression && progression.lignes && progression.lignes.length
      ? `<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#F8D040;margin:22px 0 10px">Progression depuis le ${e(
          fmtDateLong(progression.depuis)
        )}</h2><div data-progression-bilan style="background:#141416;border:1px solid #28282D;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;color:#F5F5F2;margin-bottom:8px">${e(
          progression.titre
        )}</div><table style="width:100%;border-collapse:collapse;font-size:12.5px;color:#F5F5F2"><tr>${[
          "Mesure",
          "Départ",
          "Actuel",
          "Écart",
          ""
        ]
          .map((t) => `<th style="text-align:left;font-size:10px;font-weight:600;color:#9C9C94;padding:4px 6px">${t}</th>`)
          .join("")}</tr>${progression.lignes
          .map((l) => {
            const couleur = l.sens === "bon" ? "#4ADE80" : "#F8D040";
            return `<tr style="border-top:1px solid #28282D"><td style="padding:6px">${e(l.label)}</td><td style="padding:6px;color:#9C9C94">${e(
              fmtValeur(l.depart) + " " + l.unite
            )}</td><td style="padding:6px">${e(fmtValeur(l.actuel) + " " + l.unite)}</td><td style="padding:6px;font-weight:700;color:${couleur}">${e(
              fmtEcart(l.ecart)
            )}</td><td style="padding:6px;width:90px"><svg viewBox="0 0 100 28" width="90" height="24" preserveAspectRatio="none"><polyline points="${pointsMiniCourbe(
              l.serie.map((x) => x.value)
            )}" fill="none" stroke="${couleur}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg></td></tr>`;
          })
          .join("")}</table>`
      : "";

  const blocNotes =
    (s.sessionNotes && s.sessionNotes.length) || (s.dayNotes && s.dayNotes.length)
      ? `<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9C9C94;margin:18px 0 8px">Notes du client</h2><ul style="margin:0;padding-left:18px">${[
          ...(s.sessionNotes || []),
          ...(s.dayNotes || [])
        ]
          .map((x) => `<li style="font-size:12px;line-height:1.5;color:#9C9C94;margin-bottom:3px">${e(x)}</li>`)
          .join("")}</ul>`
      : "";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Bilan hebdo — ${e(
    profile.name || "Client"
  )}</title></head>
<body style="margin:0;background:#0B0B0C;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
<div style="max-width:680px;margin:0 auto;padding:22px 16px 40px">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap">
    <div><div style="font-size:16px;font-weight:800;letter-spacing:.5px;color:#F5F5F2;text-transform:uppercase">🏋️ Coach Neiram</div><div style="font-size:8.5px;letter-spacing:2.5px;color:#9C9C94;text-transform:uppercase;margin-top:2px">Coaching sportif</div></div>
    <div style="font-size:11px;color:#9C9C94">Bilan hebdomadaire</div>
  </div>
  <div style="background:#18181B;border:1px solid #28282D;border-radius:14px;padding:14px;margin-top:14px">
    <div style="font-size:14px;font-weight:700;color:#F8D040">Client : ${e(profile.name || "—")}</div>
    <div style="font-size:12px;color:#9C9C94;margin-top:2px">Semaine du ${e(fmtDateLong(s.start))} au ${e(
      fmtDateLong(s.end)
    )} · objectif : ${e(GOALS.find((g) => g.id === profile.goal)?.label || "—")}</div>
  </div>${blocContrat}
  <h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#F8D040;margin:22px 0 10px">Chiffres de la semaine</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">${stats}</div>${blocProgression}
  ${blocPhotos}
  ${para("Résumé", sec.resume)}
  ${para("Évolution", sec.evolution)}
  ${liste("Points forts", sec.points_forts, "#4ADE80")}
  ${liste("Vigilance", sec.vigilance, "#F5B942")}
  ${liste("À corriger", sec.a_corriger, "#F0645A")}
  ${liste("Recommandations de la semaine", sec.actions, "#F8D040")}
  ${blocDouleurs}
  ${blocNotes}
  <p style="font-size:9.5px;color:#63635C;margin-top:26px;text-align:center">Généré par l'app Coach Neiram le ${e(
    new Date().toLocaleDateString("fr-FR")
  )} — bilan rédigé par IA à partir des données saisies par le client.</p>
</div></body></html>`;
}

/** Nom du fichier envoye au coach : lisible dans sa liste de telechargements. */
export function nomFichierBilan(profile, weekStats) {
  return `bilan-${weekStats.weekKey}-${slugNom(profile.name)}.html`;
}

/**
 * Envoie le bilan.
 *
 * Le partage natif (WhatsApp, mail) quand le telephone le propose, sinon
 * un telechargement. Renvoie "shared", "downloaded" ou "cancelled" —
 * l'appelant n'enregistre « bilan envoye » que pour les deux premiers.
 */
export async function partagerBilan({ profile, weekStats, report, photos, targets }) {
  const html = construireBilanHTML({ profile, weekStats, report, photos, targets });
  const nomFichier = nomFichierBilan(profile, weekStats);
  const blob = new Blob([html], { type: "text/html" });
  const fichier = new File([blob], nomFichier, { type: "text/html" });

  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: "Bilan hebdo — Coach Neiram" });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4e3);
  return "downloaded";
}
