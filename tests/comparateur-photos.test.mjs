import { test } from "node:test";
import assert from "node:assert/strict";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const { semainesAvecPhoto } = await import("../app/src/lib/comparateur-photos.js");

test("semaines avec une photo de la pose, de la plus ancienne à la plus récente", () => {
  localStorage.setItem("coach_photos_2026-10-19", JSON.stringify({ face: "data:image/jpeg;base64,BBB" }));
  localStorage.setItem("coach_photos_2026-08-03", JSON.stringify({ face: "data:image/jpeg;base64,AAA", dos: "data:x" }));
  localStorage.setItem("coach_photos_2026-09-07", JSON.stringify({ profil: "data:y" }));
  localStorage.setItem("coach_profile", JSON.stringify({ face: "pas une photo" }));
  assert.deepEqual(semainesAvecPhoto("face").map((s) => s.semaine), ["2026-08-03", "2026-10-19"]);
  assert.deepEqual(semainesAvecPhoto("dos").map((s) => s.semaine), ["2026-08-03"]);
});
