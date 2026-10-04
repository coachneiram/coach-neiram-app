/**
 * Doublure des services Google pour executer worker/coach-sync.gs en test.
 *
 * Le script ecrit par en-tetes (il lit la ligne 1, ajoute des colonnes,
 * pose des cases a cocher) : la doublure tient donc un vrai tableau de
 * cellules par onglet, pas seulement une liste d'appendRow.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createContext, runInNewContext } from "node:vm";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_SCRIPT = readFileSync(join(RACINE, "worker", "coach-sync.gs"), "utf8");

function faireFeuille(nom) {
  const cellules = []; // cellules[ligne][colonne], index 0
  const largeur = () => cellules.reduce((m, l) => Math.max(m, l.length), 0);
  const ecrire = (l, c, v) => {
    while (cellules.length <= l) cellules.push([]);
    cellules[l][c] = v;
  };
  const plage = (l, c, nl = 1, nc = 1) => {
    const p = {
      getValues: () =>
        Array.from({ length: nl }, (_, i) =>
          Array.from({ length: nc }, (_, k) => {
            const v = (cellules[l - 1 + i] || [])[c - 1 + k];
            return v === undefined ? "" : v;
          })
        ),
      setValues: (vals) => {
        vals.forEach((ligne, i) => ligne.forEach((v, k) => ecrire(l - 1 + i, c - 1 + k, v)));
        return p;
      },
      setValue: (v) => {
        ecrire(l - 1, c - 1, v);
        return p;
      },
      clearContent: () => {
        for (let i = 0; i < nl; i++) for (let k = 0; k < nc; k++) ecrire(l - 1 + i, c - 1 + k, "");
        return p;
      },
      setFontWeight: () => p,
      setNumberFormat: () => p,
      insertCheckboxes: () => p
    };
    return p;
  };
  const appends = [];
  return {
    nom,
    cellules,
    appends,
    getName: () => nom,
    appendRow: (r) => {
      appends.push(r);
      cellules.push([...r]);
    },
    getRange: (l, c, nl, nc) => plage(l, c, nl, nc),
    getLastRow: () => cellules.length,
    getLastColumn: () => largeur(),
    setFrozenRows() {}
  };
}

/**
 * Cree un classeur et un script charges, prets a recevoir plusieurs
 * doPost. `reglages` remplace des variables du script (ex. EXIGER_SECRET)
 * et `proprietes` pre-remplit les proprietes du script (ex. SECRET_SYNC).
 */
export function creerScript({ reglages = {}, proprietes = {}, entetesExistants = null, mailEchoue = false } = {}) {
  const feuilles = new Map();
  const mails = [];
  const props = { ...proprietes };
  let uuids = 0;
  const classeur = {
    getSheetByName: (n) => feuilles.get(n) || null,
    insertSheet: (n) => {
      const f = faireFeuille(n);
      feuilles.set(n, f);
      return f;
    },
    getSheets: () => [...feuilles.values()]
  };
  if (entetesExistants) {
    for (const [nom, entetes] of Object.entries(entetesExistants)) classeur.insertSheet(nom).appendRow(entetes);
  }
  const bac = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => classeur,
      getUi: () => {
        throw new Error("pas d'interface en test");
      }
    },
    MailApp: {
      sendEmail: (a, sujet, corps) => {
        if (mailEchoue) throw new Error("quota Gmail atteint");
        mails.push({ a, sujet, corps });
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (c) => (c in props ? props[c] : null),
        setProperty: (c, v) => {
          props[c] = String(v);
        },
        deleteProperty: (c) => {
          delete props[c];
        },
        getProperties: () => ({ ...props })
      })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      formatDate: (d, tz, motif) => (motif === "yyyy-MM-dd" ? d.toISOString().slice(0, 10) : "12:00:00"),
      getUuid: () => "0123abcd-0123-abcd-0123-" + String(++uuids).padStart(12, "0")
    },
    Session: { getScriptTimeZone: () => "Europe/Paris" },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (t) => ({ contenu: t, setMimeType: () => ({ contenu: t }) })
    },
    Logger: { log() {} },
    console
  };
  const contexte = createContext(bac);
  runInNewContext(SOURCE_SCRIPT, contexte);
  // Le depot garde une adresse d'exemple ; en test, une adresse renseignee.
  for (const [cle, valeur] of Object.entries({ EMAIL_COACH: "coach@test.fr", ...reglages })) contexte[cle] = valeur;

  return {
    feuilles,
    mails,
    props,
    contexte,
    /** Poste un evenement (objet ou texte brut) et rend la reponse lue. */
    poster(charge) {
      const contenu = typeof charge === "string" ? charge : JSON.stringify(charge);
      contexte.ENTREE = { postData: { contents: contenu } };
      const sortie = runInNewContext("doPost(ENTREE)", contexte);
      return JSON.parse(sortie.contenu);
    },
    /** Lignes d'un onglet sous forme d'objets { en-tete: valeur }. */
    lignes(nom) {
      const f = feuilles.get(nom);
      if (!f) return [];
      const [entetes, ...reste] = f.cellules;
      return reste.map((l) => Object.fromEntries(entetes.map((e, i) => [e, l[i] === undefined ? "" : l[i]])));
    },
    appeler(fonction) {
      return runInNewContext(fonction + "()", contexte);
    }
  };
}
