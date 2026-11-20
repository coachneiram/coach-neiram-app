/**
 * « Menu de la semaine » (Repas → Menu), repris de l'app Neiram le
 * 24/10/2026 : 7 jours de repas calés sur les objectifs du coach (targets,
 * calculés par computeTargets dans App.jsx), la fiche de chaque recette aux
 * bonnes quantités, et la liste de courses de la semaine. Tout inclus.
 *
 * Calculs dans lib/plan-repas.js, textes dans lib/textes-menu.js. Le menu
 * est gardé sur le téléphone (cn_plan_repas, dans la sauvegarde) et n'est
 * pas envoyé au coach. « Ajouter à ma liste » range les ingrédients dans la
 * liste de l'onglet Courses (coach_shopping_custom, origine « menu »), en
 * remplaçant ceux du menu précédent.
 *
 * « ✨ Menu sur mesure » (repris de l'app Neiram le 20/11/2026, tout
 * inclus) : repas à prévoir, budget, cuisine, aliments refusés, temps et
 * matériel ; l'IA crée les recettes, lib/menu-sur-mesure.js les contrôle.
 * Photo de chaque plat (Pexels, relayée par le Worker du coach :
 * lib/photos-recettes.js).
 */

import { useEffect, useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import { RECETTES_COACH } from "../lib/recettes-coach-catalogue.js";
import { CATEGORIES_RECETTE, versRecetteClient } from "../lib/recettes-coach.js";
import { enregistrerRecette, lireRepasTypes } from "../lib/repas-types.js";
import {
  CLE_AJOUTS_COURSES,
  CLE_PLAN_REPAS,
  REPAS_DU_JOUR,
  ajouterCoursesMenu,
  articlesPlacard,
  bilanPlan,
  changerRepas,
  ciblesChangees,
  genererPlanRepas,
  ingredientsPourParts,
  listeCoursesPlan,
  partsCuisinees
} from "../lib/plan-repas.js";
import { partagerTexte } from "../lib/partage-texte.js";
import { messageErreur } from "../lib/ia.js";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  CUISINES,
  MATERIELS_CUISINE,
  PREFS_DEFAUT,
  TEMPS_CUISINE,
  construireMenuSurMesure,
  coutPlan,
  genererMenuSurMesure,
  nombreRepas,
  preferencesValides,
  retirerInterdits
} from "../lib/menu-sur-mesure.js";
import { adresseImage, chercherPhoto, photoConnue } from "../lib/photos-recettes.js";
import { JOURS_COURTS, TEXTES_MENU as T, fmtEuros } from "../lib/textes-menu.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { Btn, Card, Modal, SectionTitle } from "../ui/primitives.jsx";
import { X } from "../ui/icones.jsx";

function puce(actif) {
  return {
    padding: "7px 10px",
    borderRadius: 10,
    border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
    background: actif ? `${COLORS.gold}22` : "transparent",
    color: actif ? COLORS.gold : COLORS.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    flex: "0 0 auto",
    textAlign: "center"
  };
}

const colonne = {
  display: "flex",
  flexDirection: "column",
  gap: 14
};
const texteDoux = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  margin: "6px 0 12px",
  lineHeight: 1.5
};
const texteOr = {
  fontSize: 12.5,
  color: COLORS.gold,
  margin: "0 0 10px"
};
const caseACocher = {
  display: "flex",
  alignItems: "center",
  fontSize: 12.5,
  color: COLORS.text,
  marginBottom: 12,
  gap: 8
};
const caseACocherBas = {
  display: "flex",
  alignItems: "center",
  fontSize: 12,
  color: COLORS.textMuted,
  marginTop: 10,
  gap: 8
};
const accent = {
  accentColor: COLORS.gold
};
const bandeJours = {
  display: "flex",
  overflowX: "auto",
  paddingBottom: 6,
  gap: 6
};
const dateJour = {
  fontSize: 10.5,
  fontWeight: 500,
  opacity: 0.8
};
const listeRepas = {
  display: "flex",
  flexDirection: "column",
  marginTop: 8,
  gap: 8
};
const carteRepas = {
  background: COLORS.bgAlt,
  borderRadius: 10,
  padding: "10px 12px"
};
const enteteRepas = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: COLORS.textFaint,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  gap: 8
};
const etiquetteRestes = {
  color: COLORS.gold,
  textTransform: "none",
  letterSpacing: 0
};
const nomRepas = {
  fontSize: 13.5,
  fontWeight: 700,
  color: COLORS.text,
  marginTop: 3
};
const detailRepas = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  marginTop: 2
};
const boutonsRepas = {
  display: "flex",
  marginTop: 8,
  gap: 6
};
const repasLibre = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  marginTop: 3
};
const totalJour = {
  fontSize: 12,
  color: COLORS.textMuted,
  marginTop: 8,
  textAlign: "right"
};
const deuxBoutons = {
  display: "flex",
  marginTop: 12,
  gap: 8
};
const moitie = {
  flex: 1
};
const pleineLargeur = {
  width: "100%"
};
const reperes = {
  fontSize: 11,
  color: COLORS.textFaint,
  margin: "10px 0 0",
  lineHeight: 1.45
};
const fiche = {
  fontSize: 13,
  color: COLORS.text,
  lineHeight: 1.5
};
const ficheDescription = {
  margin: "0 0 8px",
  color: COLORS.textMuted
};
const ficheInfos = {
  fontSize: 12,
  color: COLORS.textMuted,
  marginBottom: 10
};
const ficheTitre = {
  fontWeight: 700,
  marginBottom: 4
};
const ficheListe = {
  margin: "0 0 12px",
  paddingLeft: 18
};
const ficheEtape = {
  marginBottom: 4
};
const fichePart = {
  fontSize: 12,
  color: COLORS.textMuted,
  marginBottom: 12
};
const intro = {
  fontSize: 12,
  color: COLORS.textMuted,
  margin: "0 0 10px"
};
const ligneArticle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  borderBottom: `1px solid ${COLORS.border}`,
  gap: 10
};
const quantiteArticle = {
  color: COLORS.gold,
  whiteSpace: "nowrap"
};
const placard = {
  fontSize: 12,
  color: COLORS.textMuted,
  margin: "10px 0"
};
const messageOk = {
  fontSize: 12,
  color: COLORS.good,
  margin: "10px 0 0"
};
const alerte = {
  color: COLORS.warn
};
const fort = {
  color: COLORS.text
};

/** Derniers réglages du menu sur mesure, pour ne pas tout ressaisir. */
const CLE_PREFS_SUR_MESURE = "cn_menu_sur_mesure_prefs";

const cadrePhoto = {
  margin: "8px 0"
};
const imagePhoto = {
  width: "100%",
  objectFit: "cover",
  borderRadius: 8,
  display: "block",
  background: COLORS.bg
};
const creditPhoto = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  marginTop: 4
};
const formulaire = {
  fontSize: 13,
  color: COLORS.text
};
const introFormulaire = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  margin: "0 0 4px",
  lineHeight: 1.5
};
const titreChamp = {
  fontSize: 12,
  fontWeight: 700,
  color: COLORS.text,
  margin: "12px 0 6px"
};
const lignePuces = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};
const aideChamp = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  marginTop: 4
};
const ligneBudget = {
  display: "flex",
  alignItems: "center",
  gap: 8
};
const champBudget = {
  width: 90,
  padding: "8px 10px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.bgAlt,
  color: COLORS.text,
  fontSize: 14,
  fontFamily: "inherit"
};
const champTexte = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.bgAlt,
  color: COLORS.text,
  fontSize: 13.5,
  fontFamily: "inherit"
};
const erreurFormulaire = {
  fontSize: 12.5,
  color: COLORS.warn,
  margin: "12px 0 0"
};
const boutonCreerSurMesure = {
  width: "100%",
  marginTop: 14
};
const noteFormulaire = {
  fontSize: 11,
  color: COLORS.textFaint,
  margin: "8px 0 0",
  lineHeight: 1.45
};
const espaceSurMesure = {
  marginTop: 8
};
const cadreBudget = (depasse) => ({
  background: COLORS.bgAlt,
  borderRadius: 10,
  padding: "10px 12px",
  margin: "0 0 10px",
  fontSize: 12.5,
  lineHeight: 1.5,
  border: `1px solid ${depasse ? COLORS.warn : COLORS.border}`
});
const montantBudget = (depasse) => ({
  color: depasse ? COLORS.warn : COLORS.good
});
const notePrix = {
  fontSize: 11,
  color: COLORS.textFaint
};

/** Photo du plat (Pexels, relayée par le Worker) ; rien si elle manque ou ne charge pas. */
function PhotoRecette({ recette, hauteur = 120, credit = false }) {
  const [photo, setPhoto] = useState(() => photoConnue(recette));
  const [cassee, setCassee] = useState(false);
  const cle = recette ? `${recette.id}|${recette.photo || ""}` : "";
  useEffect(() => {
    let actif = true;
    const connue = photoConnue(recette);
    setPhoto(connue);
    setCassee(false);
    if (connue === undefined) chercherPhoto(recette).then((p) => actif && setPhoto(p));
    return () => {
      actif = false;
    };
  }, [cle]);
  const src = adresseImage(photo);
  if (!recette || !src || cassee) return null;
  return (
    <div data-photo-recette={recette.id} style={cadrePhoto}>
      <img src={src} alt="" loading="lazy" onError={() => setCassee(true)} style={{ ...imagePhoto, height: hauteur }} />
      {credit && photo.auteur && <div style={creditPhoto}>{T.creditPhoto(photo.auteur)}</div>}
    </div>
  );
}

/** Formulaire du menu sur mesure : repas, budget, cuisine, goûts, temps, matériel. */
function FormulaireSurMesure({ initial, enCours, erreur, onValider }) {
  const [p, setP] = useState(() => preferencesValides(initial));
  const basculer = (champ, id) => setP((x) => ({ ...x, [champ]: x[champ].includes(id) ? x[champ].filter((y) => y !== id) : [...x[champ], id] }));
  return (
    <div data-formulaire-sur-mesure style={formulaire}>
      <p style={introFormulaire}>{T.introSurMesure}</p>
      <div style={titreChamp}>{T.repasAPrevoir}</div>
      <div style={lignePuces}>
        {REPAS_DU_JOUR.map((t) => (
          <button key={t.id} type="button" data-sm-repas={t.id} aria-pressed={p.repas.includes(t.id)} onClick={() => basculer("repas", t.id)} style={puce(p.repas.includes(t.id))}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={aideChamp}>{T.nombreRepas(nombreRepas(p))}</div>
      <div style={titreChamp}>{T.budgetSemaine}</div>
      <label style={ligneBudget}>
        <input
          type="number"
          inputMode="numeric"
          data-sm-budget
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          value={p.budget}
          onChange={(e) => setP((x) => ({ ...x, budget: e.target.value }))}
          style={champBudget}
        />
        <span>{T.euro}</span>
      </label>
      <div style={titreChamp}>{T.styleCuisine}</div>
      <div style={lignePuces}>
        {CUISINES.map((c) => (
          <button key={c.id} type="button" data-sm-cuisine={c.id} aria-pressed={p.cuisine === c.id} onClick={() => setP((x) => ({ ...x, cuisine: c.id }))} style={puce(p.cuisine === c.id)}>
            {c.libelle}
          </button>
        ))}
      </div>
      <div style={titreChamp}>{T.aEviter}</div>
      <input
        type="text"
        data-sm-eviter
        placeholder={T.aEviterExemple}
        value={p.aEviter}
        maxLength={200}
        onChange={(e) => setP((x) => ({ ...x, aEviter: e.target.value }))}
        style={champTexte}
      />
      <div style={titreChamp}>{T.tempsCuisine}</div>
      <div style={lignePuces}>
        {TEMPS_CUISINE.map((t) => (
          <button key={t} type="button" data-sm-temps={t} aria-pressed={p.tempsMax === t} onClick={() => setP((x) => ({ ...x, tempsMax: t }))} style={puce(p.tempsMax === t)}>
            {T.minutes(t)}
          </button>
        ))}
      </div>
      <div style={titreChamp}>{T.materiel}</div>
      <div style={lignePuces}>
        {MATERIELS_CUISINE.map((m) => (
          <button key={m.id} type="button" data-sm-materiel={m.id} aria-pressed={p.materiel.includes(m.id)} onClick={() => basculer("materiel", m.id)} style={puce(p.materiel.includes(m.id))}>
            {m.libelle}
          </button>
        ))}
      </div>
      {erreur && (
        <p data-erreur-sur-mesure style={erreurFormulaire}>
          {erreur}
        </p>
      )}
      <Btn onClick={() => onValider(preferencesValides(p))} disabled={enCours || !p.repas.length} style={boutonCreerSurMesure}>
        {enCours ? T.enCoursSurMesure : T.creerSurMesure(nombreRepas(p))}
      </Btn>
      <p style={noteFormulaire}>{T.noteSurMesure}</p>
    </div>
  );
}

function FicheRecette({ recette, parts, repas }) {
  const aCuisiner = parts || repas.parts;
  const [dejaAjoutee, setDejaAjoutee] = useState(() => lireRepasTypes().some((r) => r.origine === recette.id));
  return (
    <div data-fiche-menu={recette.id} style={fiche}>
      <PhotoRecette recette={recette} hauteur={180} credit />
      <p style={ficheDescription}>{recette.description}</p>
      <div style={ficheInfos}>{T.infosRecette(CATEGORIES_RECETTE[recette.categorie], recette)}</div>
      <p style={texteOr}>{repas.restes ? T.dejaCuisine(repas.parts) : T.aCuisiner(aCuisiner, repas.parts)}</p>
      <div style={ficheTitre}>{T.ingredients}</div>
      <ul style={ficheListe}>
        {ingredientsPourParts(recette, aCuisiner).map((i, k) => (
          <li key={k}>{T.ligneIngredient(i)}</li>
        ))}
      </ul>
      {!repas.restes && (
        <>
          <div style={ficheTitre}>{T.preparation}</div>
          <ol style={ficheListe}>
            {recette.etapes.map((e, k) => (
              <li key={k} style={ficheEtape}>
                {e}
              </li>
            ))}
          </ol>
        </>
      )}
      <div style={fichePart}>{T.taPart(repas)}</div>
      {dejaAjoutee ? (
        <Btn variant="ghost" disabled style={pleineLargeur}>
          {T.dansMesRecettes}
        </Btn>
      ) : (
        <Btn
          onClick={() => {
            enregistrerRecette(lireRepasTypes(), versRecetteClient(recette));
            setDejaAjoutee(true);
          }}
          style={pleineLargeur}
        >
          {T.ajouterRecette}
        </Btn>
      )}
    </div>
  );
}

export function MenuSemaine({ profile, targets, catalogue = RECETTES_COACH }) {
  const aujourdhui = todayISO();
  const [planGarde, setPlan] = useState(() => charger(CLE_PLAN_REPAS, null));
  // Le menu gardé est toujours relu avec le profil actuel : un repas
  // devenu interdit (allergie, régime, halal…) n'est jamais affiché.
  const relu = useMemo(() => retirerInterdits(planGarde, { profil: profile, catalogue }), [planGarde, profile, catalogue]);
  const plan = relu.plan;
  const [jour, setJour] = useState(() => {
    const p = charger(CLE_PLAN_REPAS, null);
    const k = p && p.jours ? p.jours.findIndex((j) => j.date === aujourdhui) : -1;
    return Math.max(0, k);
  });
  const [restes, setRestes] = useState(() => (charger(CLE_PLAN_REPAS, null) || {}).restes !== false);
  const [ouverte, setOuverte] = useState(null);
  const [voirCourses, setVoirCourses] = useState(false);
  const [message, setMessage] = useState(null);
  const [surMesure, setSurMesure] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreurSm, setErreurSm] = useState(null);

  // Un menu sur mesure porte ses propres recettes (créées par l'IA).
  const recettesDuPlan = plan && Array.isArray(plan.recettes) ? plan.recettes : catalogue;
  const parId = useMemo(() => new Map(recettesDuPlan.map((r) => [r.id, r])), [recettesDuPlan]);
  const bilan = useMemo(() => bilanPlan(plan), [plan]);
  const courses = useMemo(() => (plan && plan.jours ? listeCoursesPlan(plan, recettesDuPlan) : []), [plan, recettesDuPlan]);
  const aDesObjectifs = Boolean(targets && targets.calories > 0);

  const garder = (p) => {
    setPlan(p);
    enregistrer(CLE_PLAN_REPAS, p);
  };
  const creer = (avecRestes = restes) => {
    const graine = (Date.now() % 100000) + 1;
    // Menu sur mesure : on rebat les mêmes recettes, relues avec le profil
    // actuel, sans nouvel appel à l'IA.
    const p =
      plan && plan.surMesure && Array.isArray(plan.recettes)
        ? construireMenuSurMesure({ recettes: plan.recettes, profil: profile, cibles: targets, prefs: plan.surMesure, debut: aujourdhui, graine, restes: avecRestes })
        : genererPlanRepas({ catalogue, profil: profile, cibles: targets, debut: aujourdhui, graine, restes: avecRestes });
    if (!p) return;
    garder({ ...p, restes: avecRestes });
    setJour(0);
    setMessage(null);
  };
  const changer = (typeRepas) => {
    const suivant = { ...changerRepas(plan, { catalogue: recettesDuPlan, profil: profile, jour, typeRepas }), restes };
    if (suivant.surMesure) {
      const cout = coutPlan(suivant, suivant.recettes);
      suivant.cout = { ...suivant.cout, ...cout, budget: Number(suivant.surMesure.budget), depasse: cout.total > Number(suivant.surMesure.budget) };
    }
    garder(suivant);
  };
  const lancerSurMesure = async (prefs) => {
    if (enCours) return;
    setEnCours(true);
    setErreurSm(null);
    enregistrer(CLE_PREFS_SUR_MESURE, prefs);
    try {
      const menu = await genererMenuSurMesure({ profil: profile, cibles: targets, prefs, debut: aujourdhui, restes });
      const { ecartees, ...aGarder } = menu;
      garder(aGarder);
      setJour(0);
      setSurMesure(false);
      setMessage(null);
    } catch (e) {
      setErreurSm(
        e && e.message === "peu-de-recettes"
          ? T.erreurPeuDeRecettes
          : e && e.message === "sans-objectifs"
            ? T.sansObjectifs
            : e instanceof SyntaxError
              ? T.erreurReponseIncomplete
              : messageErreur(e)
      );
    } finally {
      setEnCours(false);
    }
  };
  const modaleSurMesure = (
    <Modal open={surMesure} onClose={() => !enCours && setSurMesure(false)} title={T.titreSurMesure} iconeFermer={X}>
      {surMesure && (
        <FormulaireSurMesure initial={charger(CLE_PREFS_SUR_MESURE, null) || (plan && plan.surMesure) || PREFS_DEFAUT} enCours={enCours} erreur={erreurSm} onValider={lancerSurMesure} />
      )}
    </Modal>
  );
  const boutonSurMesure = (libelle) => (
    <div data-ouvrir-sur-mesure style={espaceSurMesure}>
      <Btn variant="ghost" onClick={() => setSurMesure(true)} style={pleineLargeur}>
        {libelle}
      </Btn>
    </div>
  );

  const ajouterAuxCourses = () => {
    const { liste, ajoutes } = ajouterCoursesMenu(charger(CLE_AJOUTS_COURSES, []), courses);
    enregistrer(CLE_AJOUTS_COURSES, liste);
    setMessage(T.ajoutes(ajoutes));
  };
  const partagerCourses = async () => {
    const r = await partagerTexte({ titre: T.titreCourses, texte: T.texteCourses(courses, articlesPlacard(courses)) });
    setMessage(T.partage[r] || null);
  };

  if (!plan || !plan.jours) {
    return (
      <Card>
        <div data-menu-semaine>
          <SectionTitle tuto="menu-semaine">{T.titre}</SectionTitle>
          {aDesObjectifs ? (
            <>
              <p style={texteDoux}>{T.intro(targets)}</p>
              <label style={caseACocher}>
                <input type="checkbox" checked={restes} onChange={(e) => setRestes(e.target.checked)} style={accent} />
                {T.restesLong}
              </label>
              <Btn onClick={() => creer()} style={pleineLargeur}>
                {T.creer}
              </Btn>
              {boutonSurMesure(T.ouvrirSurMesure)}
            </>
          ) : (
            <p data-menu-sans-objectifs style={texteDoux}>
              {T.sansObjectifs}
            </p>
          )}
        </div>
        {modaleSurMesure}
      </Card>
    );
  }

  const leJour = plan.jours[Math.min(jour, plan.jours.length - 1)];
  const termine = plan.jours[plan.jours.length - 1].date < aujourdhui;
  // Menu sur mesure sans petit-déjeuner ni collation : les protéines se
  // comparent à la part de la journée que le menu couvre, pas à toute.
  const partPrevue = bilan && bilan.horsMenuKcal > 0 && bilan.cibleKcal > 0 ? Math.max(0, 1 - bilan.horsMenuKcal / bilan.cibleKcal) : 1;
  const cibleProteinesMenu = bilan && bilan.cibleP ? bilan.cibleP * partPrevue : 0;
  const manqueProteines = cibleProteinesMenu && bilan.p < cibleProteinesMenu * 0.9 ? Math.round(cibleProteinesMenu - bilan.p) : 0;

  return (
    <div style={colonne}>
      <Card>
        <div data-menu-semaine>
          <SectionTitle tuto="menu-semaine">{T.titre}</SectionTitle>
          <div data-bilan-menu style={texteDoux}>
            <strong style={fort}>{T.moyenne(bilan)}</strong>
            {bilan.horsMenuKcal > 0 && <div data-hors-menu>{T.horsMenu(bilan.horsMenuKcal)}</div>}
            {bilan.libresKcal > 0 && <div>{T.libres(bilan.libresKcal)}</div>}
            {manqueProteines > 0 && (
              <div data-manque-proteines style={alerte}>
                {T.manqueProteines(manqueProteines, profile)}
              </div>
            )}
          </div>
          {plan.surMesure && plan.cout && (
            <div data-budget-menu style={cadreBudget(plan.cout.depasse)}>
              <div>
                {T.coursesEstimees}
                <strong data-cout-menu style={montantBudget(plan.cout.depasse)}>
                  {fmtEuros(plan.cout.total)}
                </strong>
                {T.pourUnBudget(plan.cout.budget, nombreRepas(plan.surMesure))}
              </div>
              {plan.cout.depasse && (
                <div data-budget-depasse style={alerte}>
                  {T.auDessusBudget}
                </div>
              )}
              <div style={notePrix}>{T.estimationPrix}</div>
            </div>
          )}
          {relu.retires > 0 && (
            <p data-repas-retires style={texteOr}>
              {T.profilChange(relu.retires)}
            </p>
          )}
          {termine && <p style={texteOr}>{T.termine}</p>}
          {!termine && ciblesChangees(plan, targets) && (
            <p data-cibles-changees style={texteOr}>
              {T.ciblesChangees}
            </p>
          )}

          <div style={bandeJours}>
            {plan.jours.map((j, k) => (
              <button key={j.date} type="button" data-jour-menu={k} aria-pressed={k === jour} onClick={() => setJour(k)} style={puce(k === jour)}>
                {JOURS_COURTS[new Date(j.date + "T12:00:00").getDay()]}
                <div style={dateJour}>{fmtDateShort(j.date)}</div>
              </button>
            ))}
          </div>

          <div style={listeRepas}>
            {REPAS_DU_JOUR.map((c) => {
              const x = leJour.repas.find((r) => r.typeRepas === c.id);
              if (!x) return null;
              return (
                <div key={c.id} data-repas-menu={c.id} style={carteRepas}>
                  <div style={enteteRepas}>
                    <span>{c.label}</span>
                    {x.restes && <span style={etiquetteRestes}>{T.restesHier}</span>}
                  </div>
                  {x.recetteId ? (
                    <>
                      <PhotoRecette recette={parId.get(x.recetteId)} />
                      <div style={nomRepas}>{x.nom}</div>
                      <div style={detailRepas}>
                        {T.ligneRepas(x)}
                        {plan.surMesure && !x.restes && parId.get(x.recetteId) && Number(parId.get(x.recetteId).coutPortion) > 0
                          ? T.coutRepas(Number(parId.get(x.recetteId).coutPortion) * x.parts)
                          : ""}
                      </div>
                      <div style={boutonsRepas}>
                        <button type="button" data-voir-recette={c.id} onClick={() => setOuverte(x)} style={puce(true)}>
                          {T.voirRecette}
                        </button>
                        {!x.restes && (
                          <button type="button" data-changer-repas={c.id} onClick={() => changer(c.id)} style={puce(false)}>
                            {T.changer}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div data-repas-libre style={repasLibre}>
                      {x.horsMenu ? T.pasPrevu(x.kcalVisees) : x.retire ? T.recetteRetiree(x.kcalVisees) : T.repasLibre(x.kcalVisees)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={totalJour}>{T.totalJour(leJour.total)}</div>

          <div style={deuxBoutons}>
            <Btn variant="ghost" onClick={() => creer()} style={moitie}>
              {T.nouveauMenu}
            </Btn>
            <Btn onClick={() => setVoirCourses(true)} style={moitie}>
              {T.mesCourses}
            </Btn>
          </div>
          {boutonSurMesure(plan.surMesure ? T.nouvellesRecettesSurMesure : T.ouvrirSurMesure)}
          <label style={caseACocherBas}>
            <input
              type="checkbox"
              checked={restes}
              onChange={(e) => {
                setRestes(e.target.checked);
                creer(e.target.checked);
              }}
              style={accent}
            />
            {T.restesCourt}
          </label>
          <p style={reperes}>{T.reperes}</p>
        </div>
      </Card>

      <Modal open={!!ouverte} onClose={() => setOuverte(null)} title={ouverte ? ouverte.nom : ""} iconeFermer={X}>
        {ouverte && parId.get(ouverte.recetteId) && (
          <FicheRecette recette={parId.get(ouverte.recetteId)} parts={ouverte.restes ? null : partsCuisinees(plan, jour, ouverte)} repas={ouverte} />
        )}
      </Modal>

      {modaleSurMesure}

      <Modal open={voirCourses} onClose={() => setVoirCourses(false)} title={T.titreCourses} iconeFermer={X}>
        <div data-courses-menu style={fiche}>
          <p style={intro}>
            {T.pourLesJours(plan.jours.length)}
            {plan.surMesure && plan.cout ? T.coutCourses(plan.cout.total, plan.cout.budget) : ""}
          </p>
          {courses
            .filter((l) => !l.placard)
            .map((l) => (
              <div key={l.nom} data-article-menu style={ligneArticle}>
                <span>{l.nom}</span>
                <span style={quantiteArticle}>{l.quantite}</span>
              </div>
            ))}
          {courses.some((l) => l.placard) && (
            <p data-placard-menu style={placard}>
              <strong>{T.auPlacard}</strong>
              {T.listePlacard(articlesPlacard(courses))}
            </p>
          )}
          <div style={deuxBoutons}>
            <Btn onClick={ajouterAuxCourses} style={moitie}>
              {T.ajouterListe}
            </Btn>
            <Btn variant="ghost" onClick={partagerCourses} style={moitie}>
              {T.partager}
            </Btn>
          </div>
          {message && (
            <p data-message-courses style={messageOk}>
              {message}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
