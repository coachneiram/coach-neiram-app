/**
 * Tutos (lib/tutos.js, lib/tutos-contenu.js, ui/Tutos.jsx).
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CLE_TUTOS_VUS,
  GROUPES_GUIDE,
  TUTOS,
  lireTutosVus,
  marquerTutoVu,
  trouverTuto,
  tutoAProposer,
  tutoPrincipal,
  tutosParOnglet
} from "../app/src/lib/tutos.js";
import { ONGLETS } from "../app/src/lib/onglets.js";

const SRC = new URL("../app/src/", import.meta.url).pathname;
const lire = (f) => readFileSync(join(SRC, f), "utf8");

/** Tout le code de l'app, sauf le contenu des tutos lui-meme. */
function sourcesApp(dossier = SRC) {
  let texte = "";
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) texte += sourcesApp(chemin);
    else if (/\.(jsx?|mjs)$/.test(nom) && !/tutos-contenu[\w-]*\.js$/.test(nom)) texte += readFileSync(chemin, "utf8");
  }
  return texte;
}

function stockageMemoire(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

describe("contenu des tutos", () => {
  test("chaque onglet a son tuto principal, un seul", () => {
    for (const o of ONGLETS) {
      const principaux = TUTOS.filter((t) => t.onglet === o.id && t.principal);
      assert.equal(principaux.length, 1, "onglet " + o.id);
    }
  });

  test("identifiants uniques, groupes connus, 3 a 5 etapes remplies", () => {
    const ids = TUTOS.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    const groupes = GROUPES_GUIDE.map((g) => g.id);
    for (const t of TUTOS) {
      assert.ok(groupes.includes(t.onglet), t.id + " : groupe inconnu");
      assert.ok(t.etapes.length >= 3 && t.etapes.length <= 5, t.id + " : " + t.etapes.length + " etapes");
      for (const e of t.etapes) assert.ok(e.titre && e.texte && e.texte.length < 260, t.id + " : etape trop longue ou vide");
      assert.ok(t.titre && t.resume && t.emoji);
    }
  });

  test("chaque bouton cite existe toujours dans l'app", () => {
    const sources = sourcesApp();
    for (const t of TUTOS) {
      assert.ok(t.libelles.length > 0, t.id + " : aucun libelle verifie");
      for (const l of t.libelles) assert.ok(sources.includes(l), `${t.id} : « ${l} » introuvable dans l'app`);
            for (const e of t.etapes) {
        // Les exemples de saisie sont entre “ ” : seul ce qui est entre « » est un texte de l'app.
        for (const m of e.texte.matchAll(/« ([^»]+) »/g)) {
          assert.ok(t.libelles.includes(m[1]) || sources.includes(m[1]), `${t.id} : « ${m[1]} » cite mais introuvable`);
        }
      }
    }
  });

  test("aucune promesse de resultat", () => {
    const tout = JSON.stringify(TUTOS).toLowerCase();
    for (const interdit of ["maigrir", "kg en", "garanti", "résultats assurés", "perdre du poids rapidement"]) {
      assert.ok(!tout.includes(interdit), interdit);
    }
  });

  test("chaque tuto de fonction s'ouvre depuis sa carte (bouton « ? »)", () => {
    const sources = sourcesApp();
    // Les tutos d'onglet s'ouvrent par le bouton de l'en-tete ; ceux du
    // groupe Reglages sont dans le guide (et, pour certains, a cote de
    // leur bloc des Reglages).
    const sansCarte = new Set(["reprendre", "dictee", "ajouter-aliment", "code-barres", "photo-ia", "decrire"]);
    const relies = new Set([...sources.matchAll(/(?:tuto|LienTuto id)="([\w-]+)"/g)].map((m) => m[1]));
    for (const t of TUTOS) {
      if (t.principal || sansCarte.has(t.id) || t.onglet === "reglages") continue;
      assert.ok(relies.has(t.id), `${t.id} : aucun bouton « ? » ne l'ouvre`);
    }
    for (const id of relies) assert.ok(trouverTuto(id), `bouton « ? » vers un tuto inconnu : ${id}`);
  });

  test("tout est inclus pour les clients du coach : ni Premium ni abonnement", () => {
    for (const t of TUTOS) {
      assert.ok(!("premium" in t), t.id + " : champ premium");
      for (const e of t.etapes) assert.ok(!("premium" in e), t.id + " : etape premium");
    }
    const tout = JSON.stringify(TUTOS);
    for (const interdit of ["Premium", "abonnement", "abonné", "offert", "gratuit", "Neiram Premium", "Health Connect", "Apple Santé", "Siri", "widget"]) {
      assert.ok(!tout.includes(interdit), interdit);
    }
  });

  test("le bouton « ? » des cartes est branche sur la fenetre des tutos", () => {
    const app = lire("App.jsx");
    assert.match(app, /addEventListener\(EVENEMENT_TUTO, surTuto\)/);
    assert.match(app, /removeEventListener\(EVENEMENT_TUTO, surTuto\)/);
    assert.match(lire("ui/primitives.jsx"), /export function LienTuto\(/);
    assert.match(lire("ui/primitives.jsx"), /export function SectionTitle\(\{ children, tuto \}\)/);
    assert.match(lire("ui/ouvrir-tuto.js"), /new CustomEvent\(EVENEMENT_TUTO, \{ detail: id \}\)/);
  });

  test("le guide contient tous les tutos, le principal en tete de chaque onglet", () => {
    const groupes = tutosParOnglet();
    assert.equal(groupes.flatMap((g) => g.tutos).length, TUTOS.length);
    for (const g of groupes.filter((x) => ONGLETS.some((o) => o.id === x.id))) assert.equal(g.tutos[0].principal, true, g.id);
    assert.equal(trouverTuto("inexistant"), null);
  });
});

describe("premiere visite", () => {
  test("le tuto de l'onglet est propose une fois", () => {
    const st = stockageMemoire();
    assert.equal(tutoAProposer({ onglet: "repas", stockage: st }), tutoPrincipal("repas").id);
    marquerTutoVu(st, tutoPrincipal("repas").id);
    assert.equal(tutoAProposer({ onglet: "repas", stockage: st }), null);
    assert.equal(tutoAProposer({ onglet: "journal", stockage: st }), "journal");
    marquerTutoVu(st, tutoPrincipal("repas").id);
    assert.deepEqual(lireTutosVus(st), ["repas"], "pas de doublon");
    assert.ok(CLE_TUTOS_VUS.startsWith("neiram_"), "hors sauvegarde");
  });

  test("stockage illisible ou casse : rien ne s'ouvre, rien ne plante", () => {
    const casse = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    assert.equal(tutoAProposer({ onglet: "repas", stockage: casse }), null);
    assert.doesNotThrow(() => marquerTutoVu(casse, "repas"));
    assert.deepEqual(lireTutosVus(stockageMemoire({ [CLE_TUTOS_VUS]: "{pas du json" })), []);
  });

  test("l'app attend que les autres fenetres soient fermees", () => {
    const app = lire("App.jsx");
    const expression = (app.match(/const autreFenetre =([^;]+);/) || [])[1] || "";
    for (const f of ["nouveautes.length > 0", "reglagesOuverts", "aideOuverte", "!!invitationInstall", "!!poseAPhotographier", "!!vueTutos"]) {
      assert.ok(expression.includes(f), "autreFenetre doit inclure " + f);
    }
    assert.match(app, /if \(!pret \|\| !profile \|\| autreFenetre\) return undefined;/);
  });

  test("un bouton « ? » dans l'en-tete et le guide dans les Reglages", () => {
    assert.match(lire("ui/Coque.jsx"), /aria-label=\{TEXTES_TUTOS\.aria\}/);
    assert.match(lire("ecrans/Reglages.jsx"), /\{TEXTES_TUTOS\.lienGuide\}/);
  });
});

describe("clients deja installes (app coach)", async () => {
  const { initialiserTutos } = await import("../app/src/lib/tutos.js");
  test("un client qui utilise deja l'app ne voit que le tuto de Séances", () => {
    const st = stockageMemoire();
    initialiserTutos(st, { dejaInstalle: true });
    for (const o of ONGLETS) {
      const attendu = o.id === "entrainements" ? tutoPrincipal(o.id).id : null;
      assert.equal(tutoAProposer({ onglet: o.id, stockage: st }), attendu, o.id);
    }
  });
  test("une nouvelle installation les voit tous, et l'initialisation ne repasse pas", () => {
    const st = stockageMemoire();
    initialiserTutos(st, { dejaInstalle: false });
    for (const o of ONGLETS) assert.ok(tutoAProposer({ onglet: o.id, stockage: st }), o.id);
    marquerTutoVu(st, "journal");
    initialiserTutos(st, { dejaInstalle: true });
    assert.deepEqual(lireTutosVus(st), ["journal"]);
  });
});
