/**
 * Harnais de test pour Coach Neiram.
 *
 * L'application est un unique index.html dont tout le code vit dans une
 * fonction anonyme immediatement appelee. Rien n'en sort, donc rien n'est
 * testable de l'exterieur.
 *
 * Ce harnais lit le fichier de production tel quel, injecte au vol une ligne
 * qui expose les fonctions voulues, puis evalue le tout dans un bac a sable
 * muni de doublures minimales (React, DOM, localStorage, fetch).
 *
 * Consequence importante : les tests portent sur le VRAI code livre, pas sur
 * une copie. Si index.html change, les tests suivent. Et le fichier de
 * production n'est jamais modifie.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ICI = dirname(fileURLToPath(import.meta.url));
const INDEX = join(ICI, "..", "index.html");

// Ce que les tests peuvent atteindre. Un nom absent du fichier ressort en
// undefined plutot que de faire echouer le chargement.
const A_EXPOSER = [
  // calculs nutritionnels
  "computeTargets",
  "computeBMR",
  "computeCalibration",
  "computeRemainingToday",
  "computeWeekStats",
  "computeMonthStats",
  "buildWeeklySeries",
  "foodRecoOrder",
  // stockage
  "rawGet",
  "rawSet",
  "loadKey",
  "saveKey",
  "rawListKeys",
  "exportAllData",
  "STORAGE_KEYS",
  // synchro coach
  "coachSyncUrl",
  "coachSyncEndpoint",
  "queueCoachEvent",
  "flushCoachOutbox",
  "COACH_OUTBOX_KEY",
  "DEFAULT_COACH_SYNC_URL",
  // IA
  "aiGenerate",
  "callGeminiRaw",
  "hasAI",
  "PROXY_BASE_URL",
  "GEMINI_MODELS",
  // constantes et utilitaires
  "ACTIVITY_LEVELS",
  "GOAL_CAL_ADJUST",
  "todayISO",
  "addDays",
  "parseISO",
  "num",
  "avg",
  "round",
  // Creneaux : le calcul le plus lourd de consequences de l'application,
  // compare ligne a ligne avec sa version migree.
  "computeSlotWeek",
  "slotWeekSummary",
  "slotAdherence",
  "recentMissedSlots",
  "recentShiftedSlots",
  "getMonday",
  "getWeekKey",
  "minutesOf",
  "slotDayIndex",
  "slotDayLabel",
  "normalizeSlots",
  // Aliments : le filtrage des allergies et l'ordre des recommandations.
  "dietOk",
  "foodRecoOrder",
  "sortFoodsForGoal",
  "FOOD_DB",
  "FOOD_CATS",
  // Programme hebdomadaire, semaines difficiles et bilans.
  "weekPlanStatus",
  "weekPlanSummary",
  "hardWeekOf",
  "isHardWeek",
  "HARD_WEEK_REASONS",
  "computeWeekStats",
  "computeMonthStats",
  "getWeekRange",
  "clamp",
  "fmtWeekShort",
  // Estimation de la force : ces valeurs prescrivent des charges reelles.
  "pctFromRPE",
  "rpeFromRIR",
  "epley1RM",
  "est1RMFromSet",
  "chargeFrom1RM",
  "RPE_CHART",
  // Lecture des bilans rediges par l'IA.
  "parseBilan",
  // Series temporelles des tendances.
  "buildWeeklySeries",
  // Coque de navigation.
  "TABS"
];

function extraireScriptApplicatif(html) {
  // Le bloc applicatif est le dernier <script> sans attribut src.
  const debut = html.lastIndexOf("<script>");
  const fin = html.lastIndexOf("</script>");
  if (debut === -1 || fin === -1 || fin < debut) {
    throw new Error("Bloc <script> applicatif introuvable dans index.html");
  }
  return html.slice(debut + "<script>".length, fin);
}

function injecterExport(code) {
  // On se greffe sur la fermeture de la fonction anonyme, tout a la fin.
  const fermeture = code.lastIndexOf("})();");
  if (fermeture === -1) {
    throw new Error("Fin de la fonction anonyme introuvable (motif `})();`)");
  }
  const champs = A_EXPOSER
    .map((n) => `    ${n}: (typeof ${n} !== "undefined" ? ${n} : undefined)`)
    .join(",\n");
  const injection = `\n  globalThis.__COACH_TEST__ = {\n${champs}\n  };\n`;
  return code.slice(0, fermeture) + injection + code.slice(fermeture);
}

/**
 * localStorage en memoire, avec la meme surface que celle du navigateur.
 *
 * Subtilite : l'application inventorie les donnees via `Object.keys(localStorage)`.
 * Un objet ordinaire renverrait ses methodes au lieu des cles stockees. Un Proxy
 * reproduit fidelement le comportement du navigateur, ou les cles sont exposees
 * comme des proprietes enumerables.
 */
export function creerLocalStorage(initial = {}) {
  const donnees = new Map(Object.entries(initial));
  const api = {
    getItem: (k) => (donnees.has(k) ? donnees.get(k) : null),
    setItem: (k, v) => donnees.set(k, String(v)),
    removeItem: (k) => donnees.delete(k),
    clear: () => donnees.clear(),
    key: (i) => Array.from(donnees.keys())[i] ?? null,
    get length() {
      return donnees.size;
    },
    __donnees: donnees
  };
  return new Proxy(api, {
    get: (cible, prop) =>
      prop in cible ? cible[prop] : donnees.has(prop) ? donnees.get(prop) : undefined,
    has: (cible, prop) => prop in cible || donnees.has(prop),
    ownKeys: () => Array.from(donnees.keys()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
  });
}

function doublureReact() {
  const creerElement = (type, props, ...enfants) => ({ type, props, enfants });
  return {
    createElement: creerElement,
    Fragment: "Fragment",
    useState: (v) => [typeof v === "function" ? v() : v, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (v) => ({ current: v })
  };
}

/**
 * Charge l'application et renvoie les fonctions exposees.
 *
 * @param {object} options
 * @param {object} options.localStorage  doublure de stockage (creerLocalStorage par defaut)
 * @param {function} options.fetch       doublure reseau ; par defaut, toute requete echoue
 *                                       bruyamment pour qu'un test n'appelle jamais Internet
 */
export function chargerApp(options = {}) {
  const html = readFileSync(INDEX, "utf8");
  const code = injecterExport(extraireScriptApplicatif(html));

  const stockage = options.localStorage || creerLocalStorage();
  const reseau =
    options.fetch ||
    (async () => {
      throw new Error("Appel reseau non attendu dans un test");
    });

  // Les telechargements passent par Blob / URL.createObjectURL / <a>.click().
  // On garde une trace du dernier contenu produit pour pouvoir le verifier.
  const captures = { dernierBlob: null, dernierNomFichier: null };

  class BlobDeTest {
    constructor(parties, opts) {
      this.parties = parties;
      this.type = (opts && opts.type) || "";
      // Un Blob peut etre construit a partir d'autres Blob : on deplie leur
      // contenu au lieu de les convertir bêtement en "[object Object]".
      this.contenu = (parties || [])
        .map((p) => (p instanceof BlobDeTest ? p.contenu : String(p)))
        .join("");
      // On ne retient que le Blob de donnees. Le File qui l'enveloppe ensuite
      // ne doit pas ecraser la capture.
      if (!(this instanceof FileDeTest)) captures.dernierBlob = this;
    }
    text() {
      return Promise.resolve(this.contenu);
    }
  }
  class FileDeTest extends BlobDeTest {
    constructor(parties, nom, opts) {
      super(parties, opts);
      this.name = nom;
    }
  }

  const UrlDeTest = Object.assign(function (...args) {
    return new URL(...args);
  }, URL, {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {}
  });

  const bacASable = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    URL: UrlDeTest,
    Intl,
    React: doublureReact(),
    ReactDOM: { createRoot: () => ({ render: () => {} }) },
    document: {
      getElementById: () => ({}),
      createElement: () => ({
        style: {},
        set download(v) {
          captures.dernierNomFichier = v;
        },
        get download() {
          return captures.dernierNomFichier;
        },
        setAttribute: () => {},
        appendChild: () => {},
        click: () => {},
        remove: () => {}
      }),
      body: { appendChild: () => {}, removeChild: () => {} }
    },
    localStorage: stockage,
    fetch: reseau,
    navigator: { userAgent: "test", share: undefined, canShare: undefined, clipboard: undefined },
    Notification: undefined,
    alert: () => {},
    Blob: BlobDeTest,
    File: FileDeTest,
    FileReader: class {},
    Image: class {},
    ...(options.globals || {})
  };
  bacASable.window = bacASable;
  bacASable.globalThis = bacASable;

  vm.createContext(bacASable);
  vm.runInContext(code, bacASable, { filename: "index.html (bloc applicatif)" });

  const expose = bacASable.__COACH_TEST__;
  if (!expose) throw new Error("L'injection n'a pas produit __COACH_TEST__");
  return { ...expose, __bacASable: bacASable, __stockage: stockage, __captures: captures };
}

/**
 * Piege a connaitre : les objets renvoyes par l'application viennent du bac a
 * sable, donc d'un autre realm JavaScript. Leur prototype differe de celui du
 * fichier de test, et `assert.deepEqual` en mode strict echoue sur ce seul
 * motif, valeurs identiques ou non.
 *
 * Solution : ramener l'objet dans le realm du test avant de comparer,
 * par exemple `assert.deepEqual({ ...resultat }, { ... })`.
 */
