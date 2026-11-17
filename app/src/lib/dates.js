/**
 * Utilitaires de dates.
 *
 * Portage fidele de index.html (lignes ~367-412). Toute divergence de
 * comportement se verrait immediatement : tests/parite.test.mjs compare les
 * deux implementations sur les memes entrees.
 *
 * Subtilite importante : parseISO cree la date a minuit LOCAL (et non UTC),
 * et toLocalISODate reformate en local. Passer par toISOString() ici
 * decalerait les journees d'un cran pour les clients a l'est de Greenwich,
 * et fausserait l'affectation des repas au bon jour.
 */

export const parseISO = (s) => new Date(s + "T00:00:00");

export const toLocalISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Date du jour, EN HEURE LOCALE (17 novembre 2026).
 *
 * L'ancienne version (comme index.html) passait par toISOString(), donc par
 * l'UTC : en France, entre minuit et 1 h (2 h l'ete), « aujourd'hui » etait
 * encore la veille. Un repas note a 0 h 30 partait sur le jour precedent,
 * et la carte du jour, les series et les rappels raisonnaient sur hier.
 * Ecart volontaire avec index.html (l'ancienne application, figee).
 */
export const todayISO = () => toLocalISODate(new Date());

export const addDays = (dateStr, n) => {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + n);
  return toLocalISODate(d);
};

export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

export const round = (n, d = 0) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Formats d'affichage.
 *
 * Repris a l'identique de index.html (lignes 384-386). Les libelles sont
 * produits par l'Intl du navigateur : ils doivent rester strictement les
 * memes d'une version a l'autre, sinon l'historique change d'apparence
 * sans qu'aucune donnee n'ait bouge.
 */
export const fmtDateShort = (s) =>
  !s ? "" : parseISO(s).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });

export const fmtDateLong = (s) =>
  !s ? "" : parseISO(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export const fmtWeekShort = (s) => parseISO(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
