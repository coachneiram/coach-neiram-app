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
 */

import { useMemo, useState } from "react";
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
import { JOURS_COURTS, TEXTES_MENU as T } from "../lib/textes-menu.js";
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

function FicheRecette({ recette, parts, repas }) {
  const aCuisiner = parts || repas.parts;
  const [dejaAjoutee, setDejaAjoutee] = useState(() => lireRepasTypes().some((r) => r.origine === recette.id));
  return (
    <div data-fiche-menu={recette.id} style={fiche}>
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
  const [plan, setPlan] = useState(() => charger(CLE_PLAN_REPAS, null));
  const [jour, setJour] = useState(() => {
    const p = charger(CLE_PLAN_REPAS, null);
    const k = p && p.jours ? p.jours.findIndex((j) => j.date === aujourdhui) : -1;
    return Math.max(0, k);
  });
  const [restes, setRestes] = useState(() => (charger(CLE_PLAN_REPAS, null) || {}).restes !== false);
  const [ouverte, setOuverte] = useState(null);
  const [voirCourses, setVoirCourses] = useState(false);
  const [message, setMessage] = useState(null);

  const parId = useMemo(() => new Map(catalogue.map((r) => [r.id, r])), [catalogue]);
  const bilan = useMemo(() => bilanPlan(plan), [plan]);
  const courses = useMemo(() => (plan && plan.jours ? listeCoursesPlan(plan, catalogue) : []), [plan, catalogue]);
  const aDesObjectifs = Boolean(targets && targets.calories > 0);

  const garder = (p) => {
    setPlan(p);
    enregistrer(CLE_PLAN_REPAS, p);
  };
  const creer = (avecRestes = restes) => {
    const graine = (Date.now() % 100000) + 1;
    const p = genererPlanRepas({ catalogue, profil: profile, cibles: targets, debut: aujourdhui, graine, restes: avecRestes });
    if (!p) return;
    garder({ ...p, restes: avecRestes });
    setJour(0);
    setMessage(null);
  };
  const changer = (typeRepas) => garder({ ...changerRepas(plan, { catalogue, profil: profile, jour, typeRepas }), restes });

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
            </>
          ) : (
            <p data-menu-sans-objectifs style={texteDoux}>
              {T.sansObjectifs}
            </p>
          )}
        </div>
      </Card>
    );
  }

  const leJour = plan.jours[Math.min(jour, plan.jours.length - 1)];
  const termine = plan.jours[plan.jours.length - 1].date < aujourdhui;
  const manqueProteines = bilan && bilan.cibleP && bilan.p < bilan.cibleP * 0.9 ? Math.round(bilan.cibleP - bilan.p) : 0;

  return (
    <div style={colonne}>
      <Card>
        <div data-menu-semaine>
          <SectionTitle tuto="menu-semaine">{T.titre}</SectionTitle>
          <div data-bilan-menu style={texteDoux}>
            <strong style={fort}>{T.moyenne(bilan)}</strong>
            {bilan.libresKcal > 0 && <div>{T.libres(bilan.libresKcal)}</div>}
            {manqueProteines > 0 && (
              <div data-manque-proteines style={alerte}>
                {T.manqueProteines(manqueProteines, profile)}
              </div>
            )}
          </div>
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
                      <div style={nomRepas}>{x.nom}</div>
                      <div style={detailRepas}>{T.ligneRepas(x)}</div>
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
                      {T.repasLibre(x.kcalVisees)}
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

      <Modal open={voirCourses} onClose={() => setVoirCourses(false)} title={T.titreCourses} iconeFermer={X}>
        <div data-courses-menu style={fiche}>
          <p style={intro}>{T.pourLesJours(plan.jours.length)}</p>
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
