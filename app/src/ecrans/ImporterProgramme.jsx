/**
 * « Importer mon programme » : le programme du coach, dicte, photographie ou
 * depose en PDF, range en seances types.
 *
 * Trois temps :
 *   1. la saisie : voix ou clavier, photos (plusieurs pages), PDF
 *   2. l'analyse par l'IA (proxy du coach, fonction « programme »)
 *   3. la verification : le client garde ou ecarte chaque seance, corrige
 *      son nom, lit les avertissements, puis enregistre
 *
 * Rien n'est enregistre sans le geste final. Les seances importees sont des
 * seances types comme les autres : on les lance, on les modifie.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { messageErreur } from "../lib/ia.js";
import { ROUTINE_COLORS } from "../lib/catalogues.js";
import { analyserProgramme, MAX_FICHIERS, MSG_ERREUR_PROGRAMME, routinesDepuisProgramme } from "../lib/import-programme.js";
import { resumeExercice } from "../lib/constructeur-seances.js";
import { charger } from "../lib/stockage.js";
import { Btn, Card, LienTuto, Modal, SectionTitle, TextArea } from "../ui/primitives.jsx";
import { ChoixPhoto } from "../ui/ChoixPhoto.jsx";
import { useDictee } from "../ui/Dictee.jsx";
import { Loader2, Sparkles, Upload } from "../ui/icones.jsx";

/* TEXTE-NOUVEAU
   Tout ce fichier est posterieur a la bascule (29 octobre 2026) : index.html
   ne sait pas importer un programme depuis une photo, un PDF ou la voix,
   et aucune de ses phrases n'a d'original a respecter. Le marquage porte
   sur le fichier entier, comme pour ImportSeancesSheets.jsx, parce que les
   messages affiches au client vivent aussi hors du JSX. */
const lien = {
  background: "none",
  border: "none",
  color: COLORS.textMuted,
  cursor: "pointer",
  fontSize: 13,
  padding: "8px 0",
  textAlign: "left",
  minHeight: 40
};

const champNom = {
  width: "100%",
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "10px 10px",
  color: COLORS.text,
  fontSize: 14,
  outline: "none",
  minHeight: 44,
  boxSizing: "border-box"
};

const messageDe = (e) => MSG_ERREUR_PROGRAMME[e && e.message] || messageErreur(e, "Lecture impossible. Réessaie, ou ajoute le programme à la main.");

const resumeElement = (e) => `${e.name} · ${resumeExercice(e)}`;

export function ImporterProgramme({ ouvert, onFermer, perso = [], nbRoutines = 0, onAjouter }) {
  const [etape, setEtape] = useState("saisie"); // saisie | analyse | verif
  const [texte, setTexte] = useState("");
  const [fichiers, setFichiers] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [choix, setChoix] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);
  const champPdf = useRef(null);
  const { peutDicter, ecoute, basculer, couper } = useDictee(texte, setTexte, setErreur);

  const fermer = () => {
    couper();
    onFermer();
    setEtape("saisie");
    setTexte("");
    setFichiers([]);
    setErreur(null);
    setResultat(null);
    setChoix({});
    setEnregistrement(false);
  };

  const ajouterFichier = (f) => {
    setErreur(null);
    setFichiers((liste) => {
      if (liste.length >= MAX_FICHIERS) {
        setErreur(MSG_ERREUR_PROGRAMME["trop-de-pages"]);
        return liste;
      }
      return [...liste, f];
    });
  };

  const retirerFichier = (i) => setFichiers((liste) => liste.filter((_, k) => k !== i));

  const lancer = async () => {
    couper();
    setErreur(null);
    setEtape("analyse");
    try {
      const r = await analyserProgramme({ texte, fichiers, perso });
      setResultat(r);
      setChoix(Object.fromEntries(r.seances.map((s) => [s.id, { nom: s.nom, inclure: true }])));
      setEtape("verif");
    } catch (e) {
      setErreur(messageDe(e));
      setEtape("saisie");
    }
  };

  const retenues = resultat ? resultat.seances.filter((s) => (choix[s.id] || {}).inclure !== false) : [];

  const enregistrer = async () => {
    if (!retenues.length || enregistrement) return;
    setEnregistrement(true);
    try {
      const routines = routinesDepuisProgramme(resultat.seances, {
        choix: resultat.seances.map((s) => ({ id: s.id, ...(choix[s.id] || {}) })),
        couleurs: ROUTINE_COLORS,
        debut: nbRoutines
      });
      await onAjouter(routines);
      fermer();
    } catch (e) {
      setErreur("Enregistrement impossible. Réessaie.");
      setEnregistrement(false);
    }
  };

  return (
    <Modal open={ouvert} onClose={fermer} title="Importer mon programme" width={560}>
      <>
        {etape === "saisie" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: COLORS.textMuted, lineHeight: 1.5 }}>
                Le programme de ton coach, comme tu l'as : dicte-le, photographie-le ou envoie le PDF. L'application le range en séances types que tu pourras lancer et modifier.
              </p>
              <LienTuto id="importer-programme" />
            </div>

            <div>
              <div style={{ fontSize: 12, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Photos ou PDF</div>
              <ChoixPhoto
                onFichier={ajouterFichier}
                libelleAppareil={fichiers.length ? "Photographier une autre page" : "Photographier"}
                libelleGalerie="Choisir une photo"
              />
              <input
                ref={champPdf}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: "none" }}
                aria-label="Choisir un PDF"
                onChange={(ev) => {
                  const f = ev.target.files && ev.target.files[0];
                  ev.target.value = "";
                  if (f) ajouterFichier(f);
                }}
              />
              <Btn variant="ghost" icon={Upload} onClick={() => champPdf.current && champPdf.current.click()} style={{ width: "100%", marginTop: 8, fontSize: 12.5 }}>
                Choisir un PDF dans mes fichiers
              </Btn>
              {fichiers.length > 0 && (
                <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {fichiers.map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.text }}>
                      <span style={{ flex: 1, overflowWrap: "anywhere" }}>
                        {/pdf/i.test(f.type || f.name || "") ? "📄" : "🖼️"} {f.name || `Page ${i + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => retirerFichier(i)}
                        aria-label={`Retirer ${f.name || "la page " + (i + 1)}`}
                        style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 9, color: COLORS.bad, cursor: "pointer", minHeight: 40, minWidth: 40 }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                Ou dicte / tape ton programme
              </div>
              <TextArea
                rows={5}
                value={texte}
                onChange={(e) => setTexte(e.target.value.slice(0, 6000))}
                placeholder="Ex : Lundi haut du corps, développé couché 4 fois 8 à 60 kilos, tractions 3 fois max. Mardi WOD : 20 minutes AMRAP de 5 tractions, 10 pompes, 15 squats."
                aria-label="Programme dicté ou tapé"
              />
              {peutDicter && (
                <Btn variant="ghost" onClick={basculer} style={{ width: "100%", marginTop: 8 }}>
                  {ecoute ? "⏹ Arrêter" : "🎤 Dicter"}
                </Btn>
              )}
              {ecoute && <p style={{ fontSize: 11.5, color: COLORS.gold, margin: "8px 0 0" }}>Je t'écoute… une séance après l'autre, puis touche « Arrêter ».</p>}
              {!peutDicter && <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "8px 0 0" }}>Pour dicter, touche le micro de ton clavier.</p>}
            </div>

            {erreur && (
              <p role="alert" style={{ fontSize: 12.5, color: COLORS.bad, margin: 0, lineHeight: 1.45 }}>
                {erreur}
              </p>
            )}
            <Btn icon={Sparkles} onClick={lancer} disabled={!texte.trim() && !fichiers.length}>
              Lire mon programme
            </Btn>
            <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0, lineHeight: 1.45 }}>
              Tu vérifies tout avant d'enregistrer. La photo, le PDF ou le texte est envoyé à l'IA pour la lecture, puis n'est pas conservé.
            </p>
          </div>
        )}

        {etape === "analyse" && (
          <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "28px 8px", color: COLORS.textMuted, textAlign: "center" }}>
            <Loader2 size={28} />
            <strong style={{ color: COLORS.text }}>Lecture du programme…</strong>
            <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>Cela peut prendre une minute pour un programme de plusieurs séances.</span>
          </div>
        )}

        {etape === "verif" && resultat && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button type="button" style={lien} onClick={() => setEtape("saisie")}>
              ← Revenir à la saisie
            </button>
            <p style={{ margin: 0, fontSize: 13.5, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {resultat.seances.length} séance{resultat.seances.length > 1 ? "s" : ""} lue{resultat.seances.length > 1 ? "s" : ""}. Décoche celles que tu ne veux pas, corrige les noms, puis enregistre. Tu pourras tout modifier ensuite.
            </p>
            {resultat.avertissements.map((a) => (
              <p key={a} style={{ margin: 0, fontSize: 12.5, color: COLORS.warn }}>
                {a}
              </p>
            ))}
            {resultat.seances.map((s) => {
              const c = choix[s.id] || { nom: s.nom, inclure: true };
              return (
                <div key={s.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, background: COLORS.surface, opacity: c.inclure === false ? 0.55 : 1 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.text, minHeight: 40 }}>
                    <input
                      type="checkbox"
                      checked={c.inclure !== false}
                      onChange={(e) => setChoix((m) => ({ ...m, [s.id]: { ...c, inclure: e.target.checked } }))}
                      style={{ width: 22, height: 22 }}
                    />
                    Garder cette séance
                  </label>
                  <input
                    style={{ ...champNom, marginTop: 6 }}
                    value={c.nom}
                    maxLength={80}
                    aria-label={`Nom de la séance ${s.nom}`}
                    onChange={(e) => setChoix((m) => ({ ...m, [s.id]: { ...c, nom: e.target.value } }))}
                  />
                  <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55 }}>
                    {s.exercises.map((e) => (
                      <li key={e.id}>{resumeElement(e)}</li>
                    ))}
                  </ol>
                  {s.notes && <p style={{ margin: "6px 0 0", fontSize: 12, color: COLORS.textFaint, lineHeight: 1.45 }}>Dans la description : {s.notes}</p>}
                  {s.avertissements.map((a) => (
                    <p key={a} style={{ margin: "6px 0 0", fontSize: 12, color: COLORS.warn }}>
                      {a}
                    </p>
                  ))}
                </div>
              );
            })}
            {erreur && (
              <p role="alert" style={{ fontSize: 12.5, color: COLORS.bad, margin: 0 }}>
                {erreur}
              </p>
            )}
            <Btn onClick={enregistrer} disabled={!retenues.length || enregistrement}>
              {enregistrement
                ? "Enregistrement…"
                : retenues.length
                  ? `Ajouter ${retenues.length} séance${retenues.length > 1 ? "s" : ""} à mes séances types`
                  : "Aucune séance gardée"}
            </Btn>
          </div>
        )}
      </>
    </Modal>
  );
}

const CLE_EXERCICES_PERSO = "cn_custom_exercises";

/**
 * Carte d'entree dans l'ecran d'entrainement : « Importer mon programme »,
 * a cote de l'import depuis le Google Sheets. Elle porte aussi la modale.
 */
export function CarteImporterProgramme({ routinesApi }) {
  const [ouvert, setOuvert] = useState(false);
  const [perso, setPerso] = useState([]);
  const [ajoutees, setAjoutees] = useState(0);

  // Relus a l'ouverture : le client a pu en creer depuis le constructeur.
  useEffect(() => {
    if (!ouvert) return;
    const stockes = charger(CLE_EXERCICES_PERSO, []);
    setPerso(Array.isArray(stockes) ? stockes : []);
  }, [ouvert]);

  return (
    <Card data-import-programme>
      <SectionTitle tuto="importer-programme">Importer mon programme</SectionTitle>
      <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "4px 0 10px", lineHeight: 1.5 }}>
        Le programme de ton coach est sur une photo, un PDF ou dans ta tête ? Photographie-le, dépose-le ou dicte-le : il devient des séances types.
      </p>
      {ajoutees > 0 && (
        <p role="status" style={{ fontSize: 12.5, color: COLORS.gold, margin: "0 0 10px" }}>
          {ajoutees} séance{ajoutees > 1 ? "s" : ""} ajoutée{ajoutees > 1 ? "s" : ""} à tes séances types.
        </p>
      )}
      <Btn icon={Sparkles} onClick={() => setOuvert(true)}>
        Photo, PDF ou dictée
      </Btn>
      <ImporterProgramme
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        perso={perso}
        nbRoutines={routinesApi.items.length}
        onAjouter={async (routines) => {
          await routinesApi.addMany(routines);
          setAjoutees(routines.length);
        }}
      />
    </Card>
  );
}
/* FIN-TEXTE-NOUVEAU */
