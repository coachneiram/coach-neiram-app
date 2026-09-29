/**
 * Course entre deux publications GitHub Pages.
 *
 * Constat du 29 septembre 2026 : a chaque push sur main, GitHub publiait
 * AUSSI la racine du depot (l'ancienne application), et cette publication
 * finissait parfois apres la notre. Les clients recevaient l'ancienne
 * version — sans le bouton « Photographier » sur Android, sans les
 * recettes — alors que tous les workflows etaient verts.
 *
 * Ces tests executent les deux scripts du deploiement avec de faux `gh` et
 * `curl`, pour chaque scenario : attente tant que la publication de GitHub
 * tourne, pas d'attente inutile quand il n'y en a pas, et echec franc quand
 * le site sert toujours l'ancienne application.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ATTENDRE = join(RACINE, ".github", "scripts", "attendre-pages-github.sh");
const VERIFIER = join(RACINE, ".github", "scripts", "verifier-mise-en-ligne.sh");
const WORKFLOW = readFileSync(join(RACINE, ".github", "workflows", "deploy.yml"), "utf8");

let dossier;
before(() => {
  dossier = mkdtempSync(join(tmpdir(), "course-pages-"));
});
after(() => rmSync(dossier, { recursive: true, force: true }));

/**
 * Faux `gh` : rend, appel apres appel, les etats donnes (« total enCours »),
 * le dernier se repetant. Chaque appel est journalise.
 */
function fauxGh(etats) {
  const bin = mkdtempSync(join(dossier, "gh-"));
  writeFileSync(join(bin, "etats"), etats.join("\n") + "\n");
  writeFileSync(
    join(bin, "gh"),
    `#!/usr/bin/env bash
echo "$*" >> "${bin}/appels"
n=$(( $(wc -l < "${bin}/appels") ))
ligne=$(sed -n "\${n}p" "${bin}/etats")
[ -z "$ligne" ] && ligne=$(tail -n 1 "${bin}/etats")
echo "$ligne"
`
  );
  chmodSync(join(bin, "gh"), 0o755);
  return bin;
}

function attendre(etats, env = {}) {
  const bin = fauxGh(etats);
  const r = spawnSync("bash", [ATTENDRE], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, DEPOT: "moi/depot", SHA: "abc123", PAUSE: "0", ...env },
    encoding: "utf8",
    timeout: 20000
  });
  const appels = (() => {
    try {
      return readFileSync(join(bin, "appels"), "utf8").trim().split("\n");
    } catch {
      return [];
    }
  })();
  return { ...r, appels };
}

describe("attendre la publication automatique de GitHub", () => {
  test("attend tant qu'elle tourne, puis rend la main", () => {
    const r = attendre(["1 1", "1 1", "1 0"], { DELAI_APPARITION: "60", DELAI_MAX: "60" });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.appels.length, 3, "doit interroger jusqu'a ce qu'elle soit terminee");
    assert.match(r.stdout, /terminee \(1\) : la notre passe en dernier/);
  });

  test("interroge les executions du bon commit, sur le bon depot", () => {
    const r = attendre(["1 0"]);
    assert.match(r.appels[0], /repos\/moi\/depot\/actions\/runs\?head_sha=abc123/);
    assert.match(r.appels[0], /pages build and deployment/);
  });

  test("aucune publication automatique (reglage deja passe sur Actions) : pas d'attente", () => {
    const r = attendre(["0 0"], { DELAI_APPARITION: "0" });
    assert.equal(r.status, 0);
    assert.equal(r.appels.length, 1);
    assert.match(r.stdout, /rien a attendre/);
  });

  test("elle peut apparaitre avec un leger retard : on la guette avant de conclure", () => {
    const r = attendre(["0 0", "1 1", "1 0"], { DELAI_APPARITION: "30", DELAI_MAX: "60" });
    assert.equal(r.status, 0);
    assert.equal(r.appels.length, 3);
    assert.match(r.stdout, /terminee/);
  });

  test("bloquee trop longtemps : avertissement, et on publie quand meme", () => {
    const r = attendre(["1 1"], { DELAI_APPARITION: "0", DELAI_MAX: "0" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /::warning::/);
  });

  test("le filtre jq compte bien les publications de GitHub et celles en cours", () => {
    const script = readFileSync(ATTENDRE, "utf8");
    const filtre = script
      .match(/--jq "(.+)"\)/)[1]
      .replace(/\\"/g, '"')
      .replace("${NOM}", "pages build and deployment");
    const reponse = {
      workflow_runs: [
        { name: "pages build and deployment", status: "in_progress" },
        { name: "pages build and deployment", status: "queued" },
        { name: "pages build and deployment", status: "completed" },
        { name: "Deploiement", status: "in_progress" },
        { name: "Tests", status: "queued" }
      ]
    };
    const sortie = execFileSync("jq", ["-r", filtre], { input: JSON.stringify(reponse), encoding: "utf8" }).trim();
    // Asymetrique a dessein : 3 au total, 2 en cours — inverser le filtre se voit.
    assert.equal(sortie, "3 2");
  });
});

/** Faux `curl` : ancienne application pour les `ancienne` premiers essais, puis nouvelle. */
function fauxCurl(ancienne) {
  const bin = mkdtempSync(join(dossier, "curl-"));
  const f = join(bin, "curl");
  writeFileSync(
    f,
    `#!/usr/bin/env bash
url="\${@: -1}"
echo "$url" >> "${bin}/urls"
essai=$(echo "$url" | sed -E 's/.*-([0-9]+)$/\\1/')
if [ "$essai" -le ${ancienne} ]; then ancienne=1; else ancienne=0; fi
case "$url" in
  *assets-manifest.json*) [ $ancienne = 1 ] && echo -n 404 || echo -n 200 ;;
  *) [ $ancienne = 1 ] && echo '<html><script>var app="ancienne"</script>' || echo '<script src="./assets/index-AbC.js"></script>' ;;
esac
`
  );
  chmodSync(f, 0o755);
  return { f, bin };
}

function verifier(ancienne, env = {}) {
  const { f, bin } = fauxCurl(ancienne);
  const r = spawnSync("bash", [VERIFIER], {
    env: { ...process.env, URL: "https://exemple.github.io/app/", CURL: f, PAUSE: "0", ESSAIS: "4", GITHUB_SHA: "abc", GITHUB_RUN_ATTEMPT: "1", ...env },
    encoding: "utf8",
    timeout: 20000
  });
  const urls = readFileSync(join(bin, "urls"), "utf8").trim().split("\n");
  return { ...r, urls };
}

describe("verifier que la nouvelle application est en ligne", () => {
  test("nouvelle application servie : succes", () => {
    const r = verifier(0);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /Nouvelle application en ligne/);
  });

  test("le CDN met un moment : on reessaie, puis succes", () => {
    const r = verifier(2);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /essai 3/);
  });

  test("toujours l'ancienne application : echec, avec la cause et le remede", () => {
    const r = verifier(99);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /::error::.*ANCIENNE application/);
    assert.match(r.stdout, /Settings → Pages → Source/);
  });

  test("chaque essai contourne le cache du CDN, et vise la bonne adresse", () => {
    const r = verifier(99);
    const manifestes = r.urls.filter((u) => u.includes("assets-manifest.json"));
    assert.equal(new Set(manifestes).size, manifestes.length, "chaque essai doit avoir sa propre URL");
    assert.ok(manifestes.every((u) => u.startsWith("https://exemple.github.io/app/assets-manifest.json?verif=")), manifestes[0]);
  });
});

describe("le workflow de deploiement les utilise, dans le bon ordre", () => {
  const position = (texte) => WORKFLOW.indexOf(texte);

  test("attendre, PUIS publier, PUIS verifier", () => {
    const attente = position("attendre-pages-github.sh");
    const publication = position("actions/deploy-pages@v4");
    const verification = position("verifier-mise-en-ligne.sh");
    assert.ok(attente > 0 && publication > 0 && verification > 0);
    assert.ok(attente < publication, "l'attente doit preceder la publication");
    assert.ok(publication < verification, "la verification doit suivre la publication");
  });

  test("le droit de lire les executions est accorde, et le jeton transmis", () => {
    assert.match(WORKFLOW, /^\s+actions: read$/m);
    assert.match(WORKFLOW, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  });

  test("la verification vise l'adresse reellement publiee", () => {
    assert.match(WORKFLOW, /URL: \$\{\{ steps\.publication\.outputs\.page_url \}\}/);
  });
});
