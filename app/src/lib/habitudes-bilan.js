/**
 * « Habitudes et déclics » dans le bilan envoyé au coach (24/10/2026) :
 * les habitudes suivies avec leur taux sur 30 jours et leur série, puis les
 * 3 déclics principaux s'il y en a.
 *
 * Même mécanisme que les performances (lib/performances-bilan.js → liste
 * de lib/bilan-html.js) : sans habitude ni déclic, la liste est vide et le
 * bilan reste strictement identique.
 */

import { todayISO } from "./dates.js";
import { habitudesActives, serie, taux } from "./habitudes.js";
import { declics } from "./declics.js";

export const DECLICS_DANS_LE_BILAN = 3;

const jours = (n) => `${n} jour${n > 1 ? "s" : ""}`;

export function lignesHabitudesBilan({ habitudes = null, journal = [], seances = [], date = todayISO() } = {}) {
  const lignes = habitudesActives(habitudes).map((h) => {
    const s = serie(habitudes, h.id, date);
    const joker = s.jokersUtilises ? `, ${s.jokersUtilises} joker${s.jokersUtilises > 1 ? "s" : ""} utilisé${s.jokersUtilises > 1 ? "s" : ""}` : "";
    return `${h.emoji} ${h.label} : ${taux(habitudes, h.id, date)} % des jours sur 30 jours · ${s.jours ? `série de ${jours(s.jours)}` : "pas de série en cours"}${joker}`;
  });
  for (const d of declics({ journal, seances, habitudes, date }, DECLICS_DANS_LE_BILAN)) {
    lignes.push(`Déclic : ${d.phrase} (${d.detail})`);
  }
  return lignes;
}
