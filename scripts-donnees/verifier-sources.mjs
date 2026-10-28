/**
 * Veille des barèmes officiels (28 octobre 2026) : lit le registre
 * app/src/lib/sources-baremes.js, le compare au calendrier et aux sites des
 * fédérations, et dit ce qui est à mettre à jour.
 *
 * Lancé chaque semaine par .github/workflows/baremes.yml, qui ouvre une
 * demande GitHub quand il y a quelque chose à faire et la referme quand il
 * n'y a plus rien. Ce script ne modifie AUCUNE donnée : il détecte, c'est
 * Marien qui valide la mise à jour (un barème faux affiché comme
 * « officiel » est pire qu'un barème d'un an).
 *
 * Quatre contrôles, du plus sûr au plus fragile :
 *   1. calendrier : l'échéance de chaque jeu de données (sans réseau) ;
 *   2. documents connus : un fichier modifié après la date de relevé, ou
 *      qui a disparu de son adresse ;
 *   3. pages de la fédération : un lien vers un document qui ressemble à un
 *      barème et qu'on ne connaît pas ;
 *   4. sondes : l'adresse devinée de la prochaine édition répond-elle ?
 * Les contrôles 2 à 4 dépendent des sites : un site inaccessible est
 * signalé (« non vérifié »), jamais passé sous silence.
 *
 * Usage :
 *   node scripts-donnees/verifier-sources.mjs [--aujourdhui AAAA-MM-JJ]
 *        [--rapport rapport.md] [--json rapport.json] [--hors-ligne]
 *   --hors-ligne : calendrier seul, aucun accès réseau.
 * Si GITHUB_OUTPUT existe, écrit `a_agir=true|false`, `incomplet=true|false` et
 * `ouvrir=true|false` (la demande GitHub existe tant que l'un des deux est vrai).
 */

import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SOURCES_BAREMES, echeanceDe, etatSource, sondesDuJour } from "../app/src/lib/sources-baremes.js";

export const AGENT = "coach-neiram-app veille des baremes (lecture hebdomadaire, quelques pages publiques)";
const DELAI_MS = 20000;
const PAUSE_MS = 1000;
const EXTENSIONS_DOCUMENT = /\.(pdf|xlsx?|csv|docx?)(?:[?#]|$)/i;

const sansAccents = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const frDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Liens vers des documents dans une page HTML, adresses absolues. */
export function liensDocuments(html, base) {
  const liens = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let url;
    try {
      url = new URL(m[1].replace(/&amp;/g, "&"), base).href;
    } catch (e) {
      continue;
    }
    if (!EXTENSIONS_DOCUMENT.test(url)) continue;
    const texte = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    liens.push({ url, texte });
  }
  return liens;
}

/** Un lien est candidat s'il contient un des mots-clés de la source (adresse ou texte). */
export function candidats(liens, source) {
  const connus = new Set(source.documentsConnus || []);
  const mots = (source.motsCles || []).map(sansAccents);
  const vus = new Set();
  return liens.filter((l) => {
    if (connus.has(l.url) || vus.has(l.url)) return false;
    vus.add(l.url);
    const cible = sansAccents(decodeURIComponentSafe(l.url) + " " + l.texte);
    return mots.some((mot) => cible.includes(mot));
  });
}
const decodeURIComponentSafe = (u) => {
  try {
    return decodeURIComponent(u);
  } catch (e) {
    return u;
  }
};

/** Requête avec délai maximal ; ne lit jamais le corps d'un document. */
async function requete(fetchImpl, url, methode) {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    return await fetchImpl(url, { method: methode, redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": AGENT, Accept: "*/*" } });
  } finally {
    clearTimeout(minuteur);
  }
}

/** { statut: "ok"|"introuvable"|"inaccessible", http, modifieLe } d'un document. */
export async function etatDocument(fetchImpl, url) {
  try {
    let r = await requete(fetchImpl, url, "HEAD");
    if ([403, 405, 501].includes(r.status)) {
      r = await requete(fetchImpl, url, "GET");
      if (r.body && r.body.cancel) await r.body.cancel().catch(() => {});
    }
    if (r.status === 404 || r.status === 410) return { statut: "introuvable", http: r.status };
    if (!(r.status >= 200 && r.status < 300)) return { statut: "inaccessible", http: r.status };
    const lm = r.headers && r.headers.get ? r.headers.get("last-modified") : null;
    const t = lm ? Date.parse(lm) : NaN;
    return { statut: "ok", http: r.status, modifieLe: Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null };
  } catch (e) {
    return { statut: "inaccessible", http: 0, erreur: String((e && e.message) || e) };
  }
}

/** Les documents candidats d'une page de la fédération. */
export async function lirePage(fetchImpl, url, source) {
  try {
    const r = await requete(fetchImpl, url, "GET");
    if (!(r.status >= 200 && r.status < 300)) return { url, statut: "inaccessible", http: r.status, nouveaux: [] };
    const html = await r.text();
    return { url, statut: "ok", http: r.status, nouveaux: candidats(liensDocuments(html, url), source) };
  } catch (e) {
    return { url, statut: "inaccessible", http: 0, erreur: String((e && e.message) || e), nouveaux: [] };
  }
}

/**
 * Contrôle une source. `enLigne: false` : calendrier seul.
 * Rend { id, court, calendrier, documents, pages, sondes, actions, incomplet }.
 */
export async function verifierSource(source, { aujourdhui, fetchImpl, enLigne = true, pauseMs = 0 }) {
  const calendrier = etatSource(source, aujourdhui);
  const actions = [];
  let incomplet = false;
  const resultat = { id: source.id, court: source.court, calendrier, documents: [], pages: [], sondes: [], actions, incomplet: false };

  if (calendrier.etat === "perimee") {
    actions.push(`L'échéance du ${frDate(calendrier.echeance)} est passée : chercher la nouvelle édition (${source.echeanceNote || "pas de note"}).`);
  } else if (calendrier.etat === "bientot") {
    actions.push(`Échéance le ${frDate(calendrier.echeance)} (dans ${calendrier.joursRestants} jours) : la nouvelle édition est attendue.`);
  }

  if (enLigne) {
    for (const url of source.documentsConnus || []) {
      const e = await etatDocument(fetchImpl, url);
      resultat.documents.push({ url, ...e });
      if (e.statut === "introuvable") actions.push(`Le document n'est plus à cette adresse (${e.http}) : ${url}`);
      else if (e.statut === "inaccessible") incomplet = true;
      else if (e.modifieLe && e.modifieLe > source.releveLe) actions.push(`Document modifié le ${frDate(e.modifieLe)}, après le relevé du ${frDate(source.releveLe)} : le relire. ${url}`);
      await pause(pauseMs);
    }
    for (const url of source.pages || []) {
      const p = await lirePage(fetchImpl, url, source);
      resultat.pages.push(p);
      if (p.statut === "inaccessible") incomplet = true;
      for (const n of p.nouveaux) actions.push(`Nouveau document sur ${url} : « ${n.texte || "sans titre"} » ${n.url}`);
      await pause(pauseMs);
    }
    for (const url of sondesDuJour(source, aujourdhui)) {
      const e = await etatDocument(fetchImpl, url);
      resultat.sondes.push({ url, ...e });
      if (e.statut === "ok") actions.push(`Nouvelle édition trouvée : ${url}`);
      else if (e.statut === "inaccessible") incomplet = true;
      await pause(pauseMs);
    }
  }
  resultat.incomplet = incomplet;
  return resultat;
}

export async function verifierSources({ sources = SOURCES_BAREMES, aujourdhui, fetchImpl = globalThis.fetch, enLigne = true, pauseMs = 0 } = {}) {
  const resultats = [];
  for (const s of sources) resultats.push(await verifierSource(s, { aujourdhui, fetchImpl, enLigne, pauseMs }));
  return resultats;
}

/** Le rapport en Markdown, et les deux drapeaux du workflow. */
export function construireRapport(resultats, aujourdhui, { enLigne = true } = {}) {
  const aAgir = resultats.filter((r) => r.actions.length);
  const incompletes = resultats.filter((r) => r.incomplet);
  const l = [];
  l.push(`# Veille des barèmes officiels, ${frDate(aujourdhui)}`);
  l.push("");
  l.push(
    aAgir.length
      ? `**${aAgir.length} jeu${aAgir.length > 1 ? "x" : ""} de données à vérifier ou à mettre à jour.**`
      : incompletes.length
        ? `**Aucun changement détecté, mais ${incompletes.length} source${incompletes.length > 1 ? "s" : ""} n'ont pas pu être consultées** : un site qui bloque le contrôle ne se voit pas autrement.`
        : "**Rien à faire : tous les barèmes sont à jour et aucune nouvelle édition n'est détectée.**"
  );
  if (!enLigne) l.push("", "_Contrôle hors ligne : calendrier seul, les sites des fédérations n'ont pas été consultés._");
  for (const r of aAgir) {
    l.push("", `## ${r.court}`, "");
    for (const a of r.actions) l.push(`- [ ] ${a}`);
  }
  if (incompletes.length) {
    l.push("", "## Non vérifiés (site inaccessible)", "");
    for (const r of incompletes) {
      const pannes = [...r.documents, ...r.pages, ...r.sondes].filter((x) => x.statut === "inaccessible");
      l.push(`- ${r.court} : ${pannes.map((p) => `${p.url} (${p.http || p.erreur || "pas de réponse"})`).join(" ; ")}`);
    }
  }
  l.push("", "## Calendrier de toutes les sources", "", "| Source | Saison | Relevé le | Échéance | État |", "|---|---|---|---|---|");
  for (const r of resultats) {
    const source = SOURCES_BAREMES.find((s) => s.id === r.id);
    const etat = { ok: "à jour", bientot: "bientôt", perimee: "échéance passée" }[r.calendrier.etat];
    l.push(`| ${r.court} | ${source ? source.saison : ""} | ${source ? frDate(source.releveLe) : ""} | ${frDate(r.calendrier.echeance)} | ${etat} |`);
  }
  l.push("", "Mise à jour : voir docs/baremes-mise-a-jour.md. Une fois les données et le registre (app/src/lib/sources-baremes.js) mis à jour, cette demande se referme seule à la prochaine vérification.");
  return { markdown: l.join("\n") + "\n", aAgir: aAgir.length > 0, incomplet: incompletes.length > 0 };
}

/* ------------------------------------------------------------------ */
/* Ligne de commande                                                    */
/* ------------------------------------------------------------------ */

async function main(argv) {
  const arg = (nom) => {
    const i = argv.indexOf(nom);
    return i >= 0 ? argv[i + 1] : null;
  };
  const aujourdhui = arg("--aujourdhui") || new Date().toISOString().slice(0, 10);
  const enLigne = !argv.includes("--hors-ligne");
  const resultats = await verifierSources({ aujourdhui, enLigne, pauseMs: PAUSE_MS });
  const rapport = construireRapport(resultats, aujourdhui, { enLigne });
  if (arg("--rapport")) writeFileSync(arg("--rapport"), rapport.markdown);
  if (arg("--json")) writeFileSync(arg("--json"), JSON.stringify({ aujourdhui, enLigne, resultats }, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `a_agir=${rapport.aAgir}\nincomplet=${rapport.incomplet}\nouvrir=${rapport.aAgir || rapport.incomplet}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, rapport.markdown);
  process.stdout.write(rapport.markdown);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
