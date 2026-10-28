/**
 * Communauté Team Neiram → « Classements » (24 octobre 2026), repris de
 * l'app publique Neiram (ui/OngletClassements.jsx) et réservé aux clients
 * du coach : régularité (accord « profil »), force athlétique,
 * haltérophilie, course et natation (accord « disciplines »),
 * transformation (accord « transformation »), athlète du mois et de
 * l'année, signalement. Les accords se donnent ici, sur demande seulement.
 * Textes : lib/communaute.js.
 */

import { useEffect, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import {
  CATEGORIES_COMMUNAUTE,
  DISCIPLINE_GROUPE,
  GROUPES_COMMUNAUTE,
  GROUPES_DISCIPLINES,
  GROUPE_TRANSFORMATION,
  MEDAILLES,
  SCORE_MOIS,
  TEXTES_COMMUNAUTE as T,
  athletesDuMois,
  categorieParId,
  classementDe,
  libelleCategorie,
  messageErreurCommunaute,
  nomMois,
  signaler
} from "../lib/communaute.js";
import { categorieIPF, categorieIWF } from "../lib/niveaux.js";
import { noterRang, retenirTitres } from "../lib/palmares.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";

export function puce(actif) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
    background: actif ? `${COLORS.gold}22` : "transparent",
    color: actif ? COLORS.gold : COLORS.text,
    fontSize: 12.5,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap"
  };
}

export const STYLE_AIDE = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  lineHeight: 1.5,
  margin: "0 0 8px"
};
export const STYLE_CASE = {
  display: "flex",
  alignItems: "flex-start",
  fontSize: 12,
  color: COLORS.textMuted,
  lineHeight: 1.45,
  margin: "8px 0",
  gap: 8
};
export const STYLE_COCHE = {
  width: 18,
  height: 18,
  accentColor: COLORS.gold,
  flexShrink: 0
};
export const STYLE_ERREUR = {
  fontSize: 12,
  color: COLORS.warn,
  margin: "8px 0 0"
};
export const STYLE_DISCRET = {
  fontSize: 12.5,
  color: COLORS.textMuted
};
const STYLE_RANGEE = {
  display: "flex",
  overflowX: "auto",
  paddingBottom: 6,
  marginBottom: 8,
  gap: 6
};
const STYLE_FILTRES = {
  display: "flex",
  flexWrap: "wrap",
  marginBottom: 10,
  gap: 6
};
const STYLE_LISTE = {
  listStyle: "none",
  padding: 0,
  margin: 0
};
const STYLE_RANG = {
  width: 30,
  textAlign: "center",
  fontFamily: POLICES.chiffres,
  color: COLORS.textMuted
};
const STYLE_PSEUDO = {
  flex: 1,
  minWidth: 0,
  color: COLORS.text,
  overflow: "hidden",
  textOverflow: "ellipsis"
};
const STYLE_VALEUR = {
  fontFamily: POLICES.chiffres,
  color: COLORS.gold,
  fontSize: 13
};
const STYLE_OPTIONS = {
  background: "none",
  border: "none",
  color: COLORS.textMuted,
  cursor: "pointer",
  fontSize: 16,
  padding: "0 4px"
};
const STYLE_ATHLETE = {
  border: `1px solid ${COLORS.gold}55`,
  borderRadius: 12,
  padding: 10,
  marginBottom: 12,
  background: `${COLORS.gold}0d`
};
const STYLE_ATHLETE_TITRE = {
  fontSize: 13,
  fontWeight: 700,
  color: COLORS.gold
};
const STYLE_ATHLETE_LIGNE = {
  fontSize: 12.5,
  color: COLORS.text,
  marginTop: 4
};
const STYLE_ATHLETE_SOUS = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  marginTop: 8
};
const STYLE_ATHLETE_REGLE = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  marginTop: 8,
  lineHeight: 1.4
};
const STYLE_ANNEE = {
  borderTop: `1px solid ${COLORS.gold}33`,
  marginTop: 10,
  paddingTop: 8
};

function styleLigne(moi) {
  return {
    display: "flex",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 10,
    background: moi ? `${COLORS.gold}1f` : "transparent",
    border: moi ? `1px solid ${COLORS.gold}` : `1px solid transparent`,
    gap: 10
  };
}
const stylePodium = (moi) => ({ fontSize: 12.5, color: moi ? COLORS.gold : COLORS.text, fontWeight: moi ? 700 : 400, marginTop: 2 });

/** Ma catégorie de poids (dernière pesée), pour le filtre « Ma catégorie ». Le poids reste ici. */
function mesFiltres(profil, corps) {
  const pesees = (corps || []).filter((c) => c && Number(c.weightKg) > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
  const poids = pesees.length ? Number(pesees[0].weightKg) : Number(profil && profil.startWeightKg) || null;
  const sexe = profil && profil.sex === "femme" ? "f" : "h";
  return { sexe, cat_pl: categorieIPF(sexe, poids, profil && profil.age), cat_halt: categorieIWF(sexe, poids) };
}

/**
 * Accord « disciplines » ou « transformation » : une case à cocher, puis
 * le bouton. Rien ne part sans.
 */
export function BlocAccord({ type, onAccepte, envoi }) {
  const [coche, setCoche] = useState(false);
  return (
    <div data-accord-communaute={type}>
      <p style={STYLE_AIDE}>{T[type + "Aide"]}</p>
      <label style={STYLE_CASE}>
        <input data-accord-case type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} style={STYLE_COCHE} />
        {T[type + "Accord"]}
      </label>
      <Btn onClick={() => coche && onAccepte()} disabled={!coche || envoi} style={{ width: "100%" }}>
        {T[type + "Creer"]}
      </Btn>
    </div>
  );
}

function Podium({ lignes, format, vide, periode }) {
  if (!lignes || !lignes.length) return <div style={STYLE_ATHLETE_LIGNE}>{vide}</div>;
  return lignes.map((l) => (
    <div key={l.pseudo} data-podium={l.rang} data-periode={periode} style={stylePodium(l.moi)}>
      {T.podium(MEDAILLES[l.rang], l.pseudo, format(l.score))}
    </div>
  ));
}

/** Podium du mois en cours, athlète du mois dernier, et l'année, pour une discipline. */
function AthleteDuMois({ donnees, discipline }) {
  if (!donnees) return null;
  const trouver = (liste) => (liste || []).find((d) => d.discipline === discipline);
  const format = SCORE_MOIS[discipline];
  const elu = (trouver(donnees.precedent) || { lignes: [] }).lignes[0];
  const eluAnnee = (trouver(donnees.anneePrecedente) || { lignes: [] }).lignes[0];
  return (
    <div data-athlete-du-mois={discipline} style={STYLE_ATHLETE}>
      <div style={STYLE_ATHLETE_TITRE}>{T.athleteTitre}</div>
      <div style={STYLE_ATHLETE_LIGNE}>
        {elu ? T.athleteElu(nomMois(donnees.moisPrecedent), elu.pseudo, format(elu.score)) + (elu.moi ? T.cestToi : "") : T.athletePersonne}
      </div>
      <div style={STYLE_ATHLETE_SOUS}>{T.athleteCourse(nomMois(donnees.mois))}</div>
      <Podium periode="mois" lignes={(trouver(donnees.enCours) || {}).lignes} format={format} vide={T.athleteVide} />
      <div data-athlete-de-l-annee={discipline} style={STYLE_ANNEE}>
        <div style={STYLE_ATHLETE_TITRE}>{T.anneeTitre}</div>
        {eluAnnee && (
          <div style={STYLE_ATHLETE_LIGNE}>{T.athleteElu(String(Number(donnees.annee) - 1), eluAnnee.pseudo, format(eluAnnee.score)) + (eluAnnee.moi ? T.cestToi : "")}</div>
        )}
        <div style={STYLE_ATHLETE_SOUS}>{T.anneeCourse(donnees.annee)}</div>
        <Podium periode="annee" lignes={(trouver(donnees.anneeEnCours) || {}).lignes} format={format} vide={T.anneeVide} />
      </div>
      <div style={STYLE_ATHLETE_REGLE}>{T.athleteRegle}</div>
    </div>
  );
}

export function OngletClassements({ profil, onAccord, envoi, onToast, donnees, disciplineInitiale, versionScores = 0 }) {
  const groupeDepart = (disciplineInitiale && Object.keys(DISCIPLINE_GROUPE).find((g) => DISCIPLINE_GROUPE[g] === disciplineInitiale)) || GROUPES_COMMUNAUTE[0];
  const [groupe, setGroupe] = useState(groupeDepart);
  const [categorie, setCategorie] = useState(CATEGORIES_COMMUNAUTE.find((c) => c.groupe === groupeDepart).id);
  const [sexeFiltre, setSexeFiltre] = useState("moi");
  const [maCategorie, setMaCategorie] = useState(true);
  const [resultat, setResultat] = useState(null);
  const [podiums, setPodiums] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [menu, setMenu] = useState(null);

  const moi = mesFiltres(donnees.profil, donnees.corps);
  const enDiscipline = GROUPES_DISCIPLINES.includes(groupe);
  const typeAccord = enDiscipline ? "disciplines" : groupe === GROUPE_TRANSFORMATION ? "transformation" : null;
  const accord = typeAccord === "disciplines" ? profil.disciplines : typeAccord === "transformation" ? profil.transformation : true;
  const cat = categorieParId(categorie);

  const filtres = {};
  for (const f of (cat && cat.filtres) || []) {
    if (f === "sexe" && sexeFiltre !== "tous") filtres.sexe = sexeFiltre === "moi" ? moi.sexe : sexeFiltre;
    if ((f === "cat_pl" || f === "cat_halt") && maCategorie && moi[f]) filtres[f] = moi[f];
  }
  const cleFiltres = JSON.stringify(filtres);

  useEffect(() => {
    if (!accord) return undefined;
    let actif = true;
    setResultat(null);
    setErreur(null);
    classementDe(categorie, Object.keys(filtres).length ? filtres : undefined)
      .then((r) => {
        if (!actif) return;
        setResultat(r);
        if (r && r.moi && typeAccord) noterRang(r.moi.rang, r.total);
      })
      .catch((e) => actif && setErreur(messageErreurCommunaute(e)));
    return () => {
      actif = false;
    };
    // versionScores : la liste est relue après chaque publication de score.
  }, [categorie, cleFiltres, accord, versionScores]);

  // Une publication de score change le podium : il est relu lui aussi.
  useEffect(() => {
    if (versionScores) setPodiums(null);
  }, [versionScores]);

  // Athlète du mois : une fois, à l'arrivée sur une discipline (accord donné).
  useEffect(() => {
    if (!enDiscipline || !profil.disciplines || podiums) return undefined;
    let actif = true;
    athletesDuMois()
      .then((r) => {
        if (!actif) return;
        setPodiums(r);
        retenirTitres(r.titres, r.titresAnnee);
      })
      .catch(() => null);
    return () => {
      actif = false;
    };
  }, [enDiscipline, profil.disciplines, podiums]);

  const choisirGroupe = (g) => {
    setGroupe(g);
    setCategorie(CATEGORIES_COMMUNAUTE.find((c) => c.groupe === g).id);
  };
  const lignes = (resultat && resultat.lignes) || [];
  const champCategorie = cat && (cat.filtres || []).find((f) => f.startsWith("cat_"));
  const optionsSexe = [
    { id: "moi", libelle: moi.sexe === "f" ? T.femmes : T.hommes },
    { id: moi.sexe === "f" ? "h" : "f", libelle: moi.sexe === "f" ? T.hommes : T.femmes },
    { id: "tous", libelle: T.toutLeMonde }
  ];

  return (
    <div data-onglet-classements>
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle tuto="classements">{T.accroche}</SectionTitle>
        <div style={STYLE_RANGEE}>
          {GROUPES_COMMUNAUTE.map((g) => (
            <button key={g} type="button" data-groupe={g} aria-pressed={groupe === g} onClick={() => choisirGroupe(g)} style={{ ...puce(groupe === g), fontWeight: 700 }}>
              {g}
            </button>
          ))}
        </div>
        <div style={STYLE_RANGEE}>
          {CATEGORIES_COMMUNAUTE.filter((c) => c.groupe === groupe).map((c) => (
            <button key={c.id} type="button" data-categorie={c.id} aria-pressed={categorie === c.id} onClick={() => setCategorie(c.id)} style={puce(categorie === c.id)}>
              {c.emoji} {c.titre}
            </button>
          ))}
        </div>

        {!accord ? (
          <BlocAccord key={typeAccord} type={typeAccord} envoi={envoi} onAccepte={() => onAccord(typeAccord, true)} />
        ) : (
          <>
            {enDiscipline && <AthleteDuMois donnees={podiums} discipline={DISCIPLINE_GROUPE[groupe]} />}
            {typeAccord && cat && cat.filtres && (
              <div style={STYLE_FILTRES} data-filtres-classement>
                {optionsSexe.map((o) => (
                  <button key={o.id} type="button" data-filtre-sexe={o.id} aria-pressed={sexeFiltre === o.id} onClick={() => setSexeFiltre(o.id)} style={{ ...puce(sexeFiltre === o.id), fontSize: 11.5 }}>
                    {o.libelle}
                  </button>
                ))}
                {champCategorie && (
                  <button type="button" data-filtre-categorie aria-pressed={maCategorie} onClick={() => setMaCategorie(!maCategorie)} style={{ ...puce(maCategorie), fontSize: 11.5 }}>
                    {libelleCategorie(moi[champCategorie])}
                  </button>
                )}
              </div>
            )}
            {erreur ? (
              <p style={STYLE_ERREUR}>{erreur}</p>
            ) : !resultat ? (
              <p style={STYLE_DISCRET}>{T.chargement}</p>
            ) : !lignes.length ? (
              <p style={STYLE_DISCRET}>{T.vide}</p>
            ) : (
              <ol style={STYLE_LISTE} data-classement={categorie}>
                {lignes.map((l) => (
                  <li key={l.pseudo} data-ligne-classement={l.rang} data-pseudo={l.pseudo} style={styleLigne(l.moi)}>
                    <span style={STYLE_RANG}>{MEDAILLES[l.rang] || l.rang}</span>
                    <span style={{ ...STYLE_PSEUDO, fontWeight: l.moi ? 700 : 500 }}>{l.pseudo}</span>
                    <span data-valeur style={STYLE_VALEUR}>
                      {cat.unite(l.valeur)}
                    </span>
                    {!l.moi && (
                      <button type="button" aria-label={T.options(l.pseudo)} onClick={() => setMenu(menu === l.pseudo ? null : l.pseudo)} style={STYLE_OPTIONS}>
                        ⋯
                      </button>
                    )}
                    {menu === l.pseudo && (
                      <button
                        type="button"
                        data-signaler={l.pseudo}
                        onClick={() =>
                          signaler("profil", l.pseudo, T.motifProfil)
                            .then(() => onToast && onToast(T.signale))
                            .catch((e) => setErreur(messageErreurCommunaute(e)))
                            .finally(() => setMenu(null))
                        }
                        style={{ ...puce(false), fontSize: 11 }}
                      >
                        {T.signaler}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {resultat && (
              <p data-mon-rang style={{ ...STYLE_DISCRET, margin: "10px 0 0" }}>
                {resultat.moi ? T.monRang(resultat.moi.rang, resultat.total) : T.absent}
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
