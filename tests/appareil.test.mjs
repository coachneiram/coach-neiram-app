/**
 * Le choix de l'appareil émulé.
 *
 * Un nom d'appareil inconnu rendrait `undefined`, et Playwright ouvrirait
 * alors un navigateur de bureau sans rien signaler : la passe mobile
 * resterait verte en n'ayant plus rien testé de mobile. C'est exactement le
 * genre de panne silencieuse que toute cette chaîne existe pour éviter.
 */

import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { appareil, nomAppareil } from "../scripts-migration/appareil.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(ICI, "..", "scripts-migration");

afterEach(() => {
  delete process.env.APPAREIL;
});

describe("choisir l'appareil", () => {
  test("sans variable, chaque script garde le sien", () => {
    assert.equal(nomAppareil(), "iPhone 13");
    assert.equal(nomAppareil("Pixel 7"), "Pixel 7");
    assert.ok(appareil().userAgent.includes("iPhone"));
    assert.ok(appareil("Pixel 7").userAgent.includes("Android"));
  });

  test("la variable l'emporte sur le défaut du script", () => {
    process.env.APPAREIL = "Pixel 7";
    assert.equal(nomAppareil(), "Pixel 7");
    assert.ok(appareil().userAgent.includes("Android"), "un défaut iPhone doit céder à la variable");
    assert.ok(appareil("iPhone 13").userAgent.includes("Android"));
  });

  test("un nom inconnu lève, au lieu d'ouvrir un navigateur de bureau", () => {
    process.env.APPAREIL = "Nokia 3310";
    assert.throws(() => appareil(), /Nokia 3310/);
    // Le message doit aider : sans exemple, on cherche la bonne orthographe.
    assert.throws(() => appareil(), /iPhone 13/);
  });

  test("les deux appareils de la chaîne sont réellement différents", () => {
    const iphone = appareil("iPhone 13");
    const pixel = appareil("Pixel 7");
    assert.notEqual(iphone.userAgent, pixel.userAgent);
    assert.notEqual(iphone.viewport.width, pixel.viewport.width);
  });
});

describe("aucun script ne court-circuite le choix", () => {
  test("plus aucun appareil codé en dur", () => {
    const fautifs = [];
    for (const f of readdirSync(SCRIPTS).filter((x) => x.endsWith(".mjs"))) {
      const s = readFileSync(join(SCRIPTS, f), "utf8");
      // Le module appareil.mjs est le seul autorisé à nommer un appareil.
      if (f === "appareil.mjs") continue;
      if (/devices\[/.test(s.replace(/\/\*[\s\S]*?\*\//g, ""))) fautifs.push(f);
    }
    assert.deepEqual(fautifs, [], "ces scripts choisissent leur appareil sans passer par appareil.mjs");
  });

  test("chaque script mobile passe bien par le module", () => {
    const mobiles = readdirSync(SCRIPTS)
      .filter((x) => x.endsWith(".mjs"))
      .filter((f) => /appareil\(/.test(readFileSync(join(SCRIPTS, f), "utf8")) && f !== "appareil.mjs");
    assert.ok(mobiles.length >= 8, "au moins huit scripts émulent un appareil : " + mobiles.length);
    for (const f of mobiles) {
      assert.match(
        readFileSync(join(SCRIPTS, f), "utf8"),
        /import \{[^}]*appareil[^}]*\} from "\.\/appareil\.mjs"/,
        f + " utilise appareil() sans l'importer"
      );
    }
  });
});
