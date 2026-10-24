/**
 * Comparateur avant / après : les semaines qui ont une photo d'une pose
 * (« coach_photos_<lundi> »), de la plus ancienne à la plus récente.
 */

import { charger, estCleDePhoto } from "./stockage.js";

export function semainesAvecPhoto(pose, stockage = globalThis.localStorage) {
  if (!stockage) return [];
  const l = [];
  for (let i = 0; i < stockage.length; i++) {
    const cle = stockage.key(i);
    if (!estCleDePhoto(cle)) continue;
    const photos = charger(cle, null);
    if (photos && typeof photos[pose] === "string" && photos[pose]) l.push({ semaine: cle.replace("coach_photos_", ""), image: photos[pose] });
  }
  return l.sort((a, b) => (a.semaine < b.semaine ? -1 : 1));
}
