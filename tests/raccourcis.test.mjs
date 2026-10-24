import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACTIONS_RACCOURCIS, adresseNettoyee, lienDepuisAdresse, lireAction, messageEau, repasDeLHeure } from "../app/src/lib/raccourcis.js";
import { brancherRaccourcis, ecouterRaccourcis, poserIntention, prendreIntention, recevoirLien } from "../app/src/lib/reception-raccourcis.js";

const lire = (chemin) => readFileSync(new URL("../" + chemin, import.meta.url), "utf8");

test("liens de raccourci : actions connues, eau bornée, le reste ignoré", () => {
  assert.deepEqual(lireAction("raccourci://eau?ml=330"), { id: "eau", onglet: "journal", ml: 330 });
  assert.deepEqual(lireAction("raccourci://eau"), { id: "eau", onglet: "journal", ml: 250 });
  assert.deepEqual(lireAction("RACCOURCI://Seance/"), { id: "seance", onglet: "entrainements" });
  assert.deepEqual(lireAction("raccourci://repas"), { id: "repas", onglet: "journal" });
  assert.deepEqual(lireAction("raccourci://poids"), { id: "poids", onglet: "mensurations" });
  assert.deepEqual(lireAction("raccourci://sommeil"), { id: "sommeil", onglet: "sommeil" });
  assert.deepEqual(lireAction("raccourci://eau?ml=50"), { id: "eau", onglet: "journal", ml: 50 });
  assert.deepEqual(lireAction("raccourci://eau?ml=1000"), { id: "eau", onglet: "journal", ml: 1000 });
  for (const mauvais of ["raccourci://eau?ml=49", "raccourci://eau?ml=5000", "raccourci://eau?ml=-1", "raccourci://eau?ml=abc", "raccourci://supprimer", "neiram://eau", "https://x/eau", "javascript:alert(1)", null, 42, "raccourci://" + "a".repeat(400)])
    assert.equal(lireAction(mauvais), null, String(mauvais));
});

test("adresse du navigateur : ?raccourci=eau&ml=500, puis nettoyée", () => {
  assert.equal(lienDepuisAdresse("?raccourci=eau&ml=500"), "raccourci://eau?ml=500");
  assert.equal(lienDepuisAdresse("?raccourci=seance"), "raccourci://seance");
  assert.equal(lienDepuisAdresse("?autre=1"), null);
  assert.equal(lienDepuisAdresse(""), null);
  assert.equal(adresseNettoyee({ pathname: "/coach-neiram-app/", search: "?raccourci=eau&ml=250" }), "/coach-neiram-app/");
  assert.equal(adresseNettoyee({ pathname: "/a/", search: "?raccourci=poids&x=1", hash: "#h" }), "/a/?x=1#h");
});

test("repas de l'heure et message de l'eau", () => {
  const a = (h, m = 0) => repasDeLHeure(new Date(2026, 9, 25, h, m));
  assert.deepEqual([a(7), a(10, 29), a(10, 30), a(14, 59), a(16), a(20)], ["petit-dejeuner", "petit-dejeuner", "dejeuner", "dejeuner", "gouter", "diner"]);
  assert.equal(messageEau(250, 1250), "💧 +250 ml d'eau (1,25 L aujourd'hui)");
});

test("file d'attente avant que l'app soit prête, doublon de 2 s ignoré", () => {
  assert.equal(recevoirLien("raccourci://poids", 1000), true);
  assert.equal(recevoirLien("raccourci://poids", 1500), false, "même lien 0,5 s après : doublon");
  assert.equal(recevoirLien("raccourci://inconnu", 1600), false);
  const recues = [];
  const arreter = ecouterRaccourcis((a) => recues.push(a.id));
  assert.deepEqual(recues, ["poids"]);
  assert.equal(recevoirLien("raccourci://eau?ml=250", 5000), true);
  assert.equal(recevoirLien("raccourci://eau?ml=250", 6999), false);
  assert.equal(recevoirLien("raccourci://eau?ml=250", 9000), true, "4 s plus tard : un deuxième verre");
  assert.deepEqual(recues, ["poids", "eau", "eau"]);
  arreter();
});

test("intentions : prises une seule fois, oubliées si personne ne les prend vite", () => {
  poserIntention("seance", 1000);
  assert.equal(prendreIntention("seance", 1500), true);
  assert.equal(prendreIntention("seance", 1600), false);
  assert.equal(prendreIntention("repas"), false);
  poserIntention("repas", 0);
  assert.equal(prendreIntention("repas", 60000), false, "une minute plus tard : trop tard");
});

test("lecture de l'adresse au lancement : l'adresse est nettoyée avant le traitement", () => {
  const remplacees = [];
  const env = {
    location: { pathname: "/coach-neiram-app/", search: "?raccourci=sommeil", hash: "" },
    history: { state: null, replaceState: (_e, _t, url) => remplacees.push(url) }
  };
  const recues = [];
  const arreter = ecouterRaccourcis((a) => recues.push(a.id));
  assert.equal(brancherRaccourcis(env), true);
  assert.deepEqual(remplacees, ["/coach-neiram-app/"]);
  assert.deepEqual(recues, ["sommeil"]);
  assert.equal(brancherRaccourcis({ ...env, location: { pathname: "/", search: "?raccourci=rien" } }), false);
  assert.equal(brancherRaccourcis({ ...env, location: { pathname: "/", search: "" } }), false);
  assert.equal(brancherRaccourcis(null), false);
  arreter();
});

test("manifeste de la PWA : un raccourci par action, adresses relatives au start_url", () => {
  const manifeste = JSON.parse(lire("app/public/manifest.json"));
  assert.equal(manifeste.start_url, ".");
  assert.ok(!manifeste.scope || manifeste.scope === ".", "scope inchangé");
  const raccourcis = manifeste.shortcuts;
  assert.equal(raccourcis.length, ACTIONS_RACCOURCIS.length);
  const icones = new Set(manifeste.icons.map((i) => i.src));
  for (const a of ACTIONS_RACCOURCIS) {
    const r = raccourcis.find((x) => x.url === a.adresse);
    assert.ok(r, a.id);
    assert.equal(r.name, a.titre);
    assert.equal(r.short_name, a.court);
    // Adresse relative : l'app est servie sous un sous-chemin (GitHub Pages).
    assert.match(r.url, /^\.\/\?raccourci=/);
    const action = lireAction(lienDepuisAdresse(r.url.slice(2)));
    assert.equal(action && action.id, a.id);
    for (const i of r.icons) assert.ok(icones.has(i.src), `icône réutilisée : ${i.src}`);
  }
});

test("rien de natif : ni Capacitor, ni schéma neiram://", () => {
  for (const f of ["app/src/lib/raccourcis.js", "app/src/lib/reception-raccourcis.js", "app/src/App.jsx"]) {
    const source = lire(f);
    assert.doesNotMatch(source, /@capacitor|getLaunchUrl|appUrlOpen/, f);
  }
  assert.doesNotMatch(lire("app/src/lib/reception-raccourcis.js"), /neiram:\/\//);
});
