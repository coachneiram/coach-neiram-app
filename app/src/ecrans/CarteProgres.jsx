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
import { PARRAINAGE, debutSaisi, lignesCarte, messageInvitation, nomFichierCarte, statistiquesProgres } from "../lib/carte-progres.js";
import { canvasEnPng, dessinerCarte } from "../lib/dessin-carte.js";
import { inviterUnAmi, partagerCarte } from "../lib/partage-carte.js";
import { Btn, Card, Field, SectionTitle, TextInput } from "../ui/primitives.jsx";
import { Loader2, Send, Share } from "../ui/icones.jsx";

/* TEXTE-NOUVEAU
   Carte de progres a partager et invitation d'un ami, ajoutees a la demande
   du coach pour se demarquer des applications grand public : ce qu'elles
   n'ont pas, c'est un coach dont les clients deviennent la vitrine. Aucun de
   ces libelles n'existe dans index.html. */
export function CarteProgres({ allData, profile, onDebutCoaching }) {
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

  return (
    <Card>
      <SectionTitle>Partager mes progrès</SectionTitle>
      <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "8px 0 12px", lineHeight: 1.5 }}>
        Une image prête pour ta story Instagram ou WhatsApp, avec tes chiffres. Ton poids n'y apparaît que si tu le
        choisis.
      </p>

      {onDebutCoaching && (
        <div data-debut-coaching="">
          <Field label="Début de ton coaching">
            <TextInput
              type="date"
              aria-label="Début de ton coaching"
              value={debutManuel || (stats && stats.debut) || ""}
              min="2000-01-01"
              max={date}
              onChange={(e) => onDebutCoaching(e.target.value)}
            />
          </Field>
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "-8px 0 12px", lineHeight: 1.45 }}>
            Suivi(e) par le coach avant l'application ? Mets la date de ton premier rendez-vous : tes semaines de suivi se
            calculent toutes seules.
          </p>
        </div>
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
