/**
 * Doublure de Cloudflare D1 pour les tests du Worker.
 *
 * Une vraie base SQLite en memoire (node:sqlite, inclus dans Node 22) :
 * les requetes du Worker (ON CONFLICT, RETURNING, jointures) s'executent
 * pour de vrai, au lieu d'etre imitees. Seule l'interface est celle de D1 :
 * prepare().bind().first() / all() / run(), et batch() en transaction.
 *
 * `panne: true` fait echouer toute requete, pour verifier que le Worker
 * refuse au lieu d'ouvrir l'acces quand sa base ne repond pas.
 */

import { DatabaseSync } from "node:sqlite";

const renvoieDesLignes = (sql) => /^\s*(SELECT|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);

export function fauxD1({ panne = false } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  const verifier = () => {
    if (panne) throw new Error("D1 indisponible");
  };

  const executer = (sql, valeurs) => {
    const st = sqlite.prepare(sql);
    if (renvoieDesLignes(sql)) {
      const results = st.all(...valeurs).map((r) => ({ ...r }));
      return { success: true, results, meta: { changes: results.length } };
    }
    const info = st.run(...valeurs);
    return { success: true, results: [], meta: { changes: Number(info.changes) } };
  };

  const instruction = (sql, valeurs = []) => ({
    sql,
    valeurs,
    bind: (...v) => instruction(sql, v),
    async first() {
      verifier();
      const r = executer(sql, valeurs).results[0];
      return r || null;
    },
    async all() {
      verifier();
      return executer(sql, valeurs);
    },
    async run() {
      verifier();
      return executer(sql, valeurs);
    }
  });

  return {
    prepare: (sql) => instruction(sql),
    async batch(liste) {
      verifier();
      sqlite.exec("BEGIN");
      try {
        const r = liste.map((i) => executer(i.sql, i.valeurs));
        sqlite.exec("COMMIT");
        return r;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
    /** Acces direct pour les verifications des tests. */
    sqlite
  };
}
