/**
 * Partager ses progres, et inviter un ami.
 *
 * Voir lib/carte-progres.js : une image au format story, aux couleurs de
 * Coach Neiram, avec les chiffres du client (semaines de suivi, seances,
 * serie, et l'evolution du poids SEULEMENT s'il le choisit), plus un bouton
 * qui envoie a un ami un lien WhatsApp vers le coach, avec le prenom du
 * parrain deja ecrit.
 *
 * Le client suivi avant l'application saisit la date de debut de son
 * coaching : les semaines de suivi se calculent a partir d'elle.
 */

import { useEffect, useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { MOIS_FR, PARRAINAGE, SEANCES_MAX, choixDebut, debutSaisi, seancesAvant, seancesAvantDepuisTotal, joursDansMois, lignesCarte, partiesDate, messageInvitation, nomFichierCarte, statistiquesProgres } from "../lib/carte-progres.js";
import { canvasEnPng, dessinerCarte } from "../lib/dessin-carte.js";
import { inviterUnAmi, partagerCarte } from "../lib/partage-carte.js";
import { Btn, Card, SectionTitle, SelectInput, TextInput } from "../ui/primitives.jsx";
import { Loader2, Send, Share } from "../ui/icones.jsx";

/* TEXTE-NOUVEAU
   Carte de progres a partager et invitation d'un ami, ajoutees a la demande
   du coach pour se demarquer des applications grand public : ce qu'elles
   n'ont pas, c'est un coach dont les clients deviennent la vitrine. Aucun de
   ces libelles n'existe dans index.html. */
/**
 * Date de debut du coaching : trois listes Jour / Mois / Annee plutot que le
 * calendrier natif, qu'on ne savait pas faire remonter a 2022 sur Android.
 * La date n'est enregistree que lorsqu'elle est complete et passee.
 */
function DebutCoaching({ valeur, manuel, date, onChange }) {
  const [parties, setParties] = useState(() => partiesDate(valeur));
  const [futur, setFutur] = useState(false);
  useEffect(() => {
    setParties(partiesDate(valeur));
    setFutur(false);
  }, [valeur]);

  const choisir = (champ, v) => {
    const suivantes = { ...parties, [champ]: Number(v) };
    setParties(suivantes);
    const r = choixDebut(suivantes, date);
    setFutur(Boolean(r.futur));
    if (r.iso && r.iso !== valeur) onChange(r.iso);
  };

  const anneeMax = Number(date.slice(0, 4));
  const annees = [];
  for (let a = anneeMax; a >= 2000; a--) annees.push({ id: String(a), label: String(a) });
  const nbJours = joursDansMois(parties.annee, parties.mois);
  const jours = Array.from({ length: nbJours }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }));
  const mois = MOIS_FR.map((m, i) => ({ id: String(i + 1), label: m }));
  const libelle = { fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div data-debut-coaching="" style={{ marginBottom: 12 }}>
      <div style={{ ...libelle, marginBottom: 6 }}>Début de ton coaching</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.2fr", gap: 6 }}>
        <SelectInput
          aria-label="Jour de début"
          value={String(Math.min(parties.jour, nbJours))}
          onChange={(e) => choisir("jour", e.target.value)}
          options={jours}
        />
        <SelectInput aria-label="Mois de début" value={String(parties.mois)} onChange={(e) => choisir("mois", e.target.value)} options={mois} />
        <SelectInput aria-label="Année de début" value={String(parties.annee)} onChange={(e) => choisir("annee", e.target.value)} options={annees} />
      </div>
      {futur && (
        <p data-debut-futur="" style={{ fontSize: 11.5, color: COLORS.bad, margin: "6px 0 0" }}>
          Cette date est dans le futur : choisis le jour de ton premier rendez-vous.
        </p>
      )}
      <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 }}>
        Suivi(e) par le coach avant l'application ? Mets la date de ton premier rendez-vous : tes semaines de suivi se
        calculent toutes seules.
        {manuel && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => onChange("")}
              style={{ background: "none", border: "none", padding: 0, color: COLORS.gold, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
            >
              Revenir au calcul automatique
            </button>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Nombre total de seances, celles d'avant l'application comprises. Champ
 * texte a clavier numerique (pas de champ « nombre » : molette et virgules
 * s'y comportent differemment sur iPhone et Android). Enregistre a la
 * sortie du champ ou avec « OK ».
 */
function SeancesTotales({ total, seancesApp, avant, onChange }) {
  const [texte, setTexte] = useState(total > 0 ? String(total) : "");
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    setTexte(total > 0 ? String(total) : "");
  }, [total]);

  const valider = () => {
    const r = texte.trim() === "" ? 0 : seancesAvantDepuisTotal(texte, seancesApp);
    setErreur(r === null);
    if (r === null) return;
    if (r !== avant) onChange(r);
    else setTexte(total > 0 ? String(total) : "");
  };

  const libelle = { fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 };
  return (
    <form
      data-seances-totales=""
      onSubmit={(e) => {
        e.preventDefault();
        valider();
      }}
      style={{ marginBottom: 12 }}
    >
      <div style={{ ...libelle, marginBottom: 6 }}>Séances faites au total</div>
      <div style={{ display: "flex", gap: 8 }}>
        <TextInput
          aria-label="Séances faites au total"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          placeholder="Ex. 980"
          value={texte}
          maxLength={6}
          onChange={(e) => setTexte(e.target.value)}
          onBlur={valider}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Btn variant="ghost" style={{ flexShrink: 0, padding: "8px 14px" }}>
          OK
        </Btn>
      </div>
      {erreur ? (
        <p data-seances-erreur="" style={{ fontSize: 11.5, color: COLORS.bad, margin: "6px 0 0" }}>
          Écris un nombre entier entre 0 et {SEANCES_MAX}, par exemple 980.
        </p>
      ) : (
        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 }}>
          Toutes tes séances avec le coach depuis le début, y compris avant l'application
          {seancesApp > 0 ? ` (dont ${seancesApp} notée${seancesApp > 1 ? "s" : ""} dans l'application)` : ""}. Les
          prochaines s'ajoutent toutes seules.
        </p>
      )}
    </form>
  );
}

export function CarteProgres({ allData, profile, onDebutCoaching, onSeancesAvantApp }) {
  const [avecPoids, setAvecPoids] = useState(false);
  const [apercu, setApercu] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [retour, setRetour] = useState(null);

  const date = todayISO();
  const stats = useMemo(
    () =>
      statistiquesProgres({
        profil: profile,
        seances: allData.sessions,
        pesees: allData.bodyLogs,
        repas: allData.logEntries,
        journal: allData.dailyForm,
        date
      }),
    [allData.sessions, allData.bodyLogs, allData.logEntries, allData.dailyForm, profile, date]
  );
  const lignes = useMemo(() => lignesCarte(stats, { avecPoids }), [stats, avecPoids]);
  const cleLignes = JSON.stringify(lignes);

  // L'apercu est l'image exacte qui sera partagee, redessinee a chaque
  // changement d'option.
  useEffect(() => {
    let annule = false;
    if (!lignes.length) {
      setApercu(null);
      return undefined;
    }
    dessinerCarte(lignes)
      .then((c) => {
        if (!annule) setApercu(c.toDataURL("image/png"));
      })
      .catch(() => {
        if (!annule) setApercu(null);
      });
    return () => {
      annule = true;
    };
  }, [cleLignes]);

  const partager = async () => {
    setEnCours(true);
    setRetour(null);
    try {
      const png = await canvasEnPng(await dessinerCarte(lignes));
      const r = await partagerCarte(png, nomFichierCarte(date));
      if (r === "downloaded") setRetour("Image enregistrée : publie-la en story depuis ta galerie.");
    } catch (e) {
      setRetour("Impossible de créer l'image sur ce téléphone. Fais une capture d'écran de l'aperçu.");
    } finally {
      setEnCours(false);
    }
  };

  const poidsDisponible = Boolean(stats && stats.poids && stats.poids.ecart !== 0);
  const debutManuel = debutSaisi(profile, date);
  const seancesApp = (allData.sessions || []).filter((s) => s && s.date && s.date <= date).length;

  return (
    <Card>
      <SectionTitle>Partager mes progrès</SectionTitle>
      <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "8px 0 12px", lineHeight: 1.5 }}>
        Une image prête pour ta story Instagram ou WhatsApp, avec tes chiffres. Ton poids n'y apparaît que si tu le
        choisis.
      </p>

      {onDebutCoaching && (
        <DebutCoaching
          valeur={debutManuel || (stats && stats.debut) || date}
          manuel={Boolean(debutManuel)}
          date={date}
          onChange={onDebutCoaching}
        />
      )}

      {onSeancesAvantApp && (
        <SeancesTotales
          total={seancesApp + seancesAvant(profile)}
          seancesApp={seancesApp}
          avant={seancesAvant(profile)}
          onChange={onSeancesAvantApp}
        />
      )}

      {!stats ? (
        <p style={{ fontSize: 12.5, color: COLORS.textFaint, margin: 0 }}>
          Note tes premiers repas ou ta première séance pour créer ta carte.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          {apercu && (
            <img
              src={apercu}
              alt="Aperçu de ma carte de progrès"
              data-carte-apercu=""
              style={{ width: 132, borderRadius: 10, border: `1px solid ${COLORS.border}`, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 170, display: "flex", flexDirection: "column", gap: 10 }}>
            {poidsDisponible && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: COLORS.text }}>
                <input
                  type="checkbox"
                  checked={avecPoids}
                  onChange={(e) => setAvecPoids(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: COLORS.gold }}
                />
                Afficher l'évolution de mon poids
              </label>
            )}
            <Btn icon={enCours ? Loader2 : Share} onClick={partager} disabled={enCours} style={{ width: "100%" }}>
              {enCours ? "Préparation..." : "Partager ma carte"}
            </Btn>
          </div>
        </div>
      )}

      {retour && <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "10px 0 0" }}>{retour}</p>}
    </Card>
  );
}

/**
 * Parrainage : les conditions du coach (visuel du 01/10/2026) et le bouton
 * qui envoie a un ami le lien WhatsApp du coach, prenom du parrain deja
 * ecrit. Meme bloc de texte nouveau que la carte : c'est la meme
 * fonctionnalite (le client comme vitrine).
 */
export function Parrainage({ profile }) {
  const inviter = () => inviterUnAmi(messageInvitation({ prenom: profile && (profile.firstName || profile.name) }));
  return (
    <Card style={{ marginTop: 16 }}>
      <div data-parrainage="">
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 20,
            background: COLORS.gold,
            color: "#1A1503",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 2
          }}
        >
          PARRAINAGE
        </span>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, margin: "10px 0 6px", lineHeight: 1.25 }}>
          {PARRAINAGE.accroche}
        </h3>
        <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "0 0 12px", lineHeight: 1.5 }}>{PARRAINAGE.explication}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PARRAINAGE.paliers.map((p) => (
            <div
              key={p.formule}
              data-palier-parrainage={p.formule}
              style={{ background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {p.formule}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.gold, marginTop: 2 }}>{p.gain}</div>
              <div style={{ fontSize: 11.5, color: COLORS.text }}>{PARRAINAGE.precision}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "10px 0 12px", lineHeight: 1.45 }}>{PARRAINAGE.condition}</p>
        <Btn icon={Send} onClick={inviter} style={{ width: "100%" }}>
          Inviter un ami
        </Btn>
        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "8px 0 0", lineHeight: 1.45 }}>
          Ton ami reçoit un lien pour écrire directement à ton coach sur WhatsApp, avec ton prénom déjà indiqué.
        </p>
      </div>
    </Card>
  );
}
/* FIN-TEXTE-NOUVEAU */
