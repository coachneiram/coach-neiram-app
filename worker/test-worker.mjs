import worker from "./coach-neiram-proxy.js";

let echecs = 0;
function verifie(nom, condition, detail) {
  if (condition) {
    console.log("  OK   " + nom);
  } else {
    echecs++;
    console.log("  ECHEC " + nom + (detail ? "  -> " + detail : ""));
  }
}

const env = {
  GEMINI_API_KEY: "cle-secrete-de-test",
  COACH_SYNC_URL: "https://script.google.com/macros/s/FAUX/exec",
  COACH_SYNC_SECRET: "secret-de-test",
  ALLOWED_ORIGINS: ""
};

// Capture les appels sortants au lieu de les envoyer reellement.
let appelsSortants = [];
function stubFetch(reponse) {
  globalThis.fetch = async (url, init) => {
    appelsSortants.push({ url: String(url), init });
    return reponse();
  };
}

function req(chemin, corps, methode = "POST") {
  return new Request("https://proxy.test" + chemin, {
    method: methode,
    headers: { "Content-Type": "application/json", "Origin": "https://coachneiram.github.io" },
    body: methode === "POST" ? (typeof corps === "string" ? corps : JSON.stringify(corps)) : undefined
  });
}

console.log("\n--- Requetes preliminaires et methodes ---");
{
  const r = await worker.fetch(req("/ai", null, "OPTIONS"), env);
  verifie("OPTIONS renvoie 204", r.status === 204, "statut " + r.status);
  verifie("en-tete CORS present", !!r.headers.get("Access-Control-Allow-Origin"));
}
{
  const r = await worker.fetch(req("/ai", null, "GET"), env);
  verifie("GET refuse (405)", r.status === 405, "statut " + r.status);
}
{
  const r = await worker.fetch(req("/inconnu", {}), env);
  verifie("route inconnue (404)", r.status === 404, "statut " + r.status);
}

console.log("\n--- Route /ai ---");
{
  const r = await worker.fetch(req("/ai", { model: "modele-pirate", messages: [{}] }), env);
  verifie("modele non autorise refuse (400)", r.status === 400, "statut " + r.status);
}
{
  const r = await worker.fetch(req("/ai", { model: "gemini-3.6-flash" }), env);
  verifie("messages manquants refuses (400)", r.status === 400, "statut " + r.status);
}
{
  const r = await worker.fetch(req("/ai", "{ceci n'est pas du json"), env);
  verifie("json invalide refuse (400)", r.status === 400, "statut " + r.status);
}
{
  appelsSortants = [];
  stubFetch(() => new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
  const r = await worker.fetch(req("/ai", {
    model: "gemini-3.6-flash",
    messages: [{ role: "user", parts: [{ text: "bonjour" }] }],
    maxTokens: 999999
  }), env);
  verifie("appel valide relaye (200)", r.status === 200, "statut " + r.status);
  verifie("un seul appel sortant", appelsSortants.length === 1, appelsSortants.length + " appels");
  const envoye = appelsSortants[0];
  verifie("cible = endpoint Gemini", envoye.url.includes("generativelanguage.googleapis.com"));
  verifie("cle ajoutee cote serveur", envoye.init.headers["x-goog-api-key"] === "cle-secrete-de-test");
  const chargeEnvoyee = JSON.parse(envoye.init.body);
  verifie("maxTokens plafonne a 4096", chargeEnvoyee.generationConfig.maxOutputTokens === 4096,
    "recu " + chargeEnvoyee.generationConfig.maxOutputTokens);
}
{
  appelsSortants = [];
  stubFetch(() => new Response("{}", { status: 429 }));
  const r = await worker.fetch(req("/ai", {
    model: "gemini-3.6-flash", messages: [{ role: "user", parts: [{ text: "x" }] }]
  }), env);
  verifie("statut 429 (quota) transmis tel quel", r.status === 429, "statut " + r.status);
}

console.log("\n--- Route /coach-sync ---");
{
  const r = await worker.fetch(req("/coach-sync", { type: "type_invente", client: "X" }), env);
  verifie("type inconnu refuse (400)", r.status === 400, "statut " + r.status);
}
{
  const gros = { type: "pointage", client: "X", note: "a".repeat(20000) };
  const r = await worker.fetch(req("/coach-sync", gros), env);
  verifie("charge trop grosse refusee (413)", r.status === 413, "statut " + r.status);
}
{
  appelsSortants = [];
  stubFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const r = await worker.fetch(req("/coach-sync", {
    type: "pointage",
    client: "Marien",
    creneau: "lundi 18:00",
    note: "b".repeat(2000),
    champInattendu: "charge utile pirate",
    retard: "oui"
  }), env);
  verifie("pointage valide accepte (200)", r.status === 200, "statut " + r.status);
  const envoye = JSON.parse(appelsSortants[0].init.body);
  verifie("secret ajoute cote serveur", envoye.secret === "secret-de-test");
  verifie("cible = script Apps Script", appelsSortants[0].url === env.COACH_SYNC_URL);
  verifie("champ inattendu supprime", envoye.champInattendu === undefined);
  verifie("texte plafonne a 500 caracteres", envoye.note.length === 500, "longueur " + envoye.note.length);
  verifie("retard converti en booleen", envoye.retard === true);
  const corpsRecu = await r.json();
  verifie("reponse lisible par l'app", corpsRecu.ok === true);
}
{
  appelsSortants = [];
  stubFetch(() => new Response(JSON.stringify({ ok: false, error: "non-autorise" }), { status: 200 }));
  const r = await worker.fetch(req("/coach-sync", { type: "pointage", client: "X" }), env);
  const corpsRecu = await r.json();
  verifie("refus du script remonte comme echec", corpsRecu.ok === false && r.status === 502,
    "statut " + r.status + " ok=" + corpsRecu.ok);
}
{
  appelsSortants = [];
  globalThis.fetch = async () => { throw new Error("reseau coupe"); };
  const r = await worker.fetch(req("/coach-sync", { type: "pointage", client: "X" }), env);
  verifie("panne reseau signalee (502)", r.status === 502, "statut " + r.status);
}

console.log("\n--- Proxy non configure ---");
{
  const r = await worker.fetch(req("/ai", { model: "gemini-3.6-flash", messages: [{}] }), {});
  verifie("sans cle : 503 explicite", r.status === 503, "statut " + r.status);
}

console.log("\n" + (echecs === 0 ? "TOUS LES TESTS PASSENT" : echecs + " TEST(S) EN ECHEC"));
process.exit(echecs === 0 ? 0 : 1);
