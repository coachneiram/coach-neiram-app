/**
 * Import du programme depuis le Google Sheets du coach.
 *
 * Ecran ajoute apres la migration : il n'a pas d'equivalent dans
 * index.html. Il ne s'affiche qu'en mode d'entrainement « Google Sheets ».
 *
 * CE QU'IL RESOUT. Le client dont le programme vit dans un Sheets n'avait,
 * dans l'application, que le pointage. Ses exercices, ses charges et ses
 * series restaient dans le tableau du coach : pour les retrouver ici — et
 * profiter de la progression de charge, des records, de l'historique — il
 * aurait fallu tout ressaisir, seance par seance, a chaque bloc.
 *
 * DEUX CHEMINS, ET LE SECOND N'EST PAS UN REPLI. Le telechargement par
 * lien ne marche que sur un document partage « toute personne disposant du
 * lien » ; or un Google Sheets est prive par defaut, et le navigateur
 * refuse alors de le lire. Le collage, lui, marche toujours. On propose
 * donc les deux, et on dit clairement pourquoi le premier a echoue quand il
 * echoue — plutot que d'afficher une erreur technique dont le client ne
 * peut rien faire.
 *
 * RIEN N'EST ECRIT SANS VALIDATION. Le tableau lu est d'abord affiche tel
 * qu'il a ete compris, seance par seance et exercice par exercice. Le
 * client voit ce qui va entrer avant que quoi que ce soit n'entre.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { ROUTINE_COLORS } from "../lib/catalogues.js";
import { resumeExercice } from "../lib/constructeur-seances.js";
import { normaliser, seancesDepuisTexte, telechargerFeuille } from "../lib/import-seances.js";
import { Btn, Card, Field, SectionTitle, TextArea, TextInput } from "../ui/primitives.jsx";
import { Dumbbell, Plus } from "../ui/icones.jsx";

/* TEXTE-NOUVEAU
   Tout ce fichier est posterieur a la bascule. L'ecran n'existe nulle part
   dans index.html, ou un client en mode Google Sheets ne pouvait que
   pointer ses seances : aucune de ses phrases n'a d'original a respecter.
   Le marquage porte sur le fichier entier plutot que sur son seul rendu,
   parce que les messages d'erreur affiches au client vivent en tete, hors
   du JSX. */

/** Ce que chaque raison d'echec veut dire pour le client, en clair. */
const MESSAGES_ECHEC = {
  "url-invalide": "Ce lien n'est pas une adresse Google Sheets. Copie l'adresse complète depuis la barre du navigateur.",
  inaccessible:
    "Ton Google Sheets est privé : l'application n'a pas le droit de le lire. Deux solutions — le partager en « Lecteur, toute personne disposant du lien », ou copier-coller le tableau ci-dessous.",
  reseau:
    "Impossible de joindre Google : soit tu es hors ligne, soit ton navigateur bloque la lecture du document. Le copier-coller ci-dessous fonctionne dans tous les cas.",
  "entete-absent":
    "Aucune colonne « Exercice » trouvée. Ton tableau doit avoir une ligne d'en-tête avec au moins une colonne Exercice (ou Mouvement), et si possible Séance, Séries, Reps et Charge.",
  "aucun-exercice": "L'en-tête a été trouvé, mais aucune ligne d'exercice en dessous."
};

const styleAide = { fontSize: 11.5, color: COLORS.textFaint, margin: "8px 0 0", lineHeight: 1.5 };

const styleMessage = (couleur) => ({
  fontSize: 12,
  color: couleur,
  lineHeight: 1.5,
  margin: "10px 0 0"
});

export function ImportSeancesSheets({ routinesApi, profile, onEnregistrerLien }) {
  const [lien, setLien] = useState(profile?.sheetsUrl || "");
  const [colle, setColle] = useState("");
  const [collageOuvert, setCollageOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [apercu, setApercu] = useState(null);
  const [echec, setEchec] = useState(null);
  const [entetesLus, setEntetesLus] = useState(null);
  const [colonnes, setColonnes] = useState([]);
  const [resultat, setResultat] = useState(null);

  const analyser = (texte) => {
    const { seances, erreur, entetesLus: lues, colonnes: lecture } = seancesDepuisTexte(texte);
    setColonnes(lecture || []);
    if (erreur) {
      setApercu(null);
      setEchec(erreur);
      // Ce que l'application a REELLEMENT lu. Sans cette ligne, le client
      // voit « aucune colonne Exercice » sans pouvoir deviner si c'est son
      // en-tete qui est écrit autrement ou le mauvais onglet qui a été lu.
      setEntetesLus((lues || []).filter(Boolean));
      // Un tableau illisible est presque toujours un tableau sans en-tete :
      // le collage reste ouvert pour que le client corrige et recommence.
      setCollageOuvert(true);
      return;
    }
    setEchec(null);
    setEntetesLus(null);
    setApercu(seances);
  };

  const recupererParLien = async () => {
    setEnCours(true);
    setResultat(null);
    const reponse = await telechargerFeuille(lien);
    setEnCours(false);

    if (!reponse.ok) {
      setApercu(null);
      setEchec(reponse.raison);
      setEntetesLus(null);
      setCollageOuvert(true);
      return;
    }
    if (lien && lien !== profile?.sheetsUrl && onEnregistrerLien) onEnregistrerLien(lien);
    analyser(reponse.texte);
  };

  const importer = async () => {
    if (!apercu?.length) return;

    const aImporter = apercu.map((seance, i) => ({
      name: seance.nom,
      description: seance.exercises.length + " exercices · importé du Google Sheets",
      color: ROUTINE_COLORS[i % ROUTINE_COLORS.length],
      source: "sheets",
      exercises: seance.exercises
    }));

    await routinesApi.replaceMany(aImporter, (r) => normaliser(r.name));

    setResultat(aImporter.length);
    setApercu(null);
    setColle("");
    setCollageOuvert(false);
  };

  const total = apercu ? apercu.reduce((n, s) => n + s.exercises.length, 0) : 0;

  return (
    <Card>
      <SectionTitle>Importer mes séances</SectionTitle>
      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 14px" }}>
        Colle le lien de ton Google Sheets : l'application y lit ton programme et crée tes séances types,
        avec leurs séries, leurs reps et leurs charges. Tu n'as plus rien à recopier à la main.
      </p>

      <Field label="Lien de mon Google Sheets">
        <TextInput
          type="url"
          value={lien}
          placeholder="https://docs.google.com/spreadsheets/..."
          onChange={(e) => setLien(e.target.value.trim())}
        />
      </Field>

      <Btn icon={Dumbbell} style={{ width: "100%" }} disabled={!lien || enCours} onClick={recupererParLien}>
        {enCours ? "Lecture du tableau..." : "Lire mon programme"}
      </Btn>

      <p style={styleAide}>
        Ton tableau doit avoir une ligne d'en-tête. Colonnes reconnues : Séance, Exercice, Séries, Reps,
        Charge, RPE, Technique, Notes — au singulier comme au pluriel. Seule la colonne Exercice est
        obligatoire. Deux colonnes réunies en une, comme « RPE/Charge » avec « 8 / 60 » en dessous, sont
        lues dans l'ordre annoncé. Une fourchette de reps (« 8-10 ») est ramenée à sa valeur basse, que
        tu peux ajuster ensuite.
      </p>

      <button
        onClick={() => setCollageOuvert((o) => !o)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          marginTop: 12,
          color: COLORS.gold,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          borderBottom: `1px dotted ${COLORS.gold}66`
        }}
      >
        {collageOuvert ? "Masquer le copier-coller" : "Mon Sheets est privé : coller le tableau à la place"}
      </button>

      {collageOuvert && (
        <div style={{ marginTop: 12 }}>
          <Field label="Colle ici les cellules copiées depuis ton Google Sheets">
            <TextArea
              rows={5}
              value={colle}
              placeholder="Séance	Exercice	Séries	Reps	Charge"
              onChange={(e) => setColle(e.target.value)}
            />
          </Field>
          <Btn variant="ghost" style={{ width: "100%" }} disabled={!colle.trim()} onClick={() => analyser(colle)}>
            Analyser ce tableau
          </Btn>
          <p style={styleAide}>
            Dans ton Google Sheets : sélectionne le tableau avec sa ligne d'en-tête, copie, puis colle ici.
            Ce chemin fonctionne même sur un document privé.
          </p>
        </div>
      )}

      {echec && (
        <p style={styleMessage(COLORS.warn)}>
          {MESSAGES_ECHEC[echec] || "Lecture impossible."}
          {entetesLus?.length ? (
            <>
              <br />
              <br />
              Première ligne lue : « {entetesLus.join(" · ")} ». Si ce n'est pas ton tableau d'exercices,
              c'est le mauvais onglet du classeur : ouvre le bon onglet dans ton Google Sheets et recopie
              le lien depuis là.
            </>
          ) : null}
        </p>
      )}

      {resultat != null && (
        <p style={styleMessage(COLORS.good)}>
          {resultat} séance{resultat > 1 ? "s" : ""} enregistrée{resultat > 1 ? "s" : ""}. Tu les retrouves
          ci-dessous : ouvre-en une pour t'entraîner, tes charges se suivront de semaine en semaine.
        </p>
      )}

      {apercu?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
            {apercu.length} séance{apercu.length > 1 ? "s" : ""} lue{apercu.length > 1 ? "s" : ""}, {total}{" "}
            exercices. Vérifie avant d'enregistrer.
          </div>

          {colonnes.length > 0 && (
            <div
              style={{
                background: COLORS.bgAlt,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "9px 11px",
                marginBottom: 10,
                fontSize: 11,
                color: COLORS.textFaint,
                lineHeight: 1.6
              }}
            >
              Colonnes comprises —{" "}
              {colonnes.map((c, i) => (
                <span key={c.role + i}>
                  {i > 0 ? " · " : ""}
                  <strong style={{ color: COLORS.textMuted }}>{c.role}</strong> ← « {c.entete} »
                </span>
              ))}
              . Si l'une d'elles est fausse, tes séances le seront aussi : renomme la colonne dans ton
              Google Sheets, ou envoie cette ligne à ton coach.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {apercu.map((seance, iSeance) => (
              <div
                key={seance.nom + iSeance}
                style={{
                  background: COLORS.bgAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: "10px 12px"
                }}
              >
                <div
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: COLORS.text,
                    textTransform: "uppercase"
                  }}
                >
                  {seance.nom}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                  {seance.exercises.map((ex, i) => (
                    <div
                      key={ex.name + i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 12.5,
                        color: COLORS.textMuted
                      }}
                    >
                      <span style={{ minWidth: 0 }}>{ex.name}</span>
                      <span
                        style={{
                          fontFamily: "IBM Plex Mono",
                          fontSize: 11.5,
                          color: COLORS.text,
                          flexShrink: 0
                        }}
                      >
                        {resumeExercice(ex)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Btn icon={Plus} style={{ width: "100%", marginTop: 12 }} onClick={importer}>
            Enregistrer ces séances
          </Btn>
          <p style={styleAide}>
            Une séance déjà importée sous le même nom est remplacée, pas dupliquée. Tes séances créées à la
            main dans l'application ne sont pas touchées.
          </p>
        </div>
      )}
    </Card>
  );
}

/* FIN-TEXTE-NOUVEAU */
