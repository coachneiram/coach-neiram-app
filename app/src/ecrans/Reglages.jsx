/**
 * Ecran Reglages.
 *
 * Portage fidele de SettingsModal (index.html, ligne 2152).
 *
 * Deux choses s'y jouent qui depassent le simple reglage :
 *
 * 1. La SAUVEGARDE. Il n'existe aucune copie serveur des donnees d'un
 *    client : son telephone est la seule source. L'export est donc le seul
 *    filet avant un changement d'appareil, et la restauration demande une
 *    confirmation explicite parce qu'elle remplace tout.
 *
 * 2. La CLE IA. Depuis la mise en place du proxy, la cle vit cote serveur
 *    et le champ n'a plus lieu d'etre : l'afficher inviterait le client a
 *    coller une cle personnelle dans son navigateur, ce que toute la
 *    phase 1 a servi a eviter. Un test verifie que le champ reste masque.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { PROXY_BASE_URL } from "../lib/config.js";
import {
  construireSauvegarde,
  estCleDePhoto,
  occupationStockage,
  restaurerSauvegarde,
  supprimerPhotos
} from "../lib/stockage.js";
import { exporterSauvegarde } from "../lib/sauvegarde.js";
import { enLigne } from "../lib/semaine.js";
import { ChampsProfil } from "./ChampsProfil.jsx";
import { Btn, Field, Modal, SelectInput } from "../ui/primitives.jsx";
import { Download, Upload, X } from "../ui/icones.jsx";

/** Reglages des rappels, avec leurs valeurs par defaut d'origine. */
const RAPPELS = {
  hydratation: {
    champActif: "hydrationRemindersEnabled",
    titre: "Rappels d'hydratation",
    intervalles: [
      { id: 60, label: "1 h" },
      { id: 90, label: "1 h 30" },
      { id: 120, label: "2 h" },
      { id: 180, label: "3 h" }
    ],
    champIntervalle: "hydrationIntervalMin",
    intervalleDefaut: 90,
    debuts: [7, 8, 9, 10, 11],
    champDebut: "hydrationStartHour",
    debutDefaut: 9,
    fins: [18, 19, 20, 21, 22],
    champFin: "hydrationEndHour",
    finDefaut: 21,
    aide:
      "Bannière dans l'app quand elle est ouverte ; notification système en arrière-plan sur ordinateur et Android (si autorisée). Safari iPhone ne permet pas les notifications pour ce type d'app : garde l'app ouverte."
  },
  nutrition: {
    champActif: "nutritionRemindersEnabled",
    titre: "Rappels nutrition (calories & macros restantes)",
    intervalles: [
      { id: 120, label: "2 h" },
      { id: 180, label: "3 h" },
      { id: 240, label: "4 h" }
    ],
    champIntervalle: "nutritionIntervalMin",
    intervalleDefaut: 180,
    debuts: [9, 10, 11, 12],
    champDebut: "nutritionStartHour",
    debutDefaut: 10,
    fins: [19, 20, 21, 22],
    champFin: "nutritionEndHour",
    finDefaut: 21,
    aide:
      "Chaque rappel indique les calories et macros restantes du jour, avec des idées d'aliments compatibles avec ton régime et tes allergies."
  }
};

const styleSection = { borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginBottom: 14 };
const styleCase = { width: 17, height: 17, accentColor: COLORS.gold };
const styleAide = { fontSize: 10.5, color: COLORS.textFaint, margin: 0, lineHeight: 1.5 };

/**
 * Demande l'autorisation de notifier au moment ou le client active le
 * rappel, pas au chargement de l'application. Demander a froid, sans
 * contexte, fait refuser — et un refus est definitif.
 */
function demanderAutorisation() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function BlocRappel({ reglage, value, set }) {
  const actif = !!value[reglage.champActif];
  const heures = (liste) => liste.map((h) => ({ id: h, label: h + " h" }));

  return (
    <div style={styleSection}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={actif}
          onChange={(e) => {
            set({ [reglage.champActif]: e.target.checked });
            if (e.target.checked) demanderAutorisation();
          }}
          style={styleCase}
        />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{reglage.titre}</span>
      </label>

      {actif && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="Intervalle">
              <SelectInput
                options={reglage.intervalles}
                value={value[reglage.champIntervalle] || reglage.intervalleDefaut}
                onChange={(e) => set({ [reglage.champIntervalle]: parseInt(e.target.value) })}
              />
            </Field>
            <Field label="De">
              <SelectInput
                options={heures(reglage.debuts)}
                value={value[reglage.champDebut] ?? reglage.debutDefaut}
                onChange={(e) => set({ [reglage.champDebut]: parseInt(e.target.value) })}
              />
            </Field>
            <Field label="Jusqu'à">
              <SelectInput
                options={heures(reglage.fins)}
                value={value[reglage.champFin] ?? reglage.finDefaut}
                onChange={(e) => set({ [reglage.champFin]: parseInt(e.target.value) })}
              />
            </Field>
          </div>
          <p style={styleAide}>{reglage.aide}</p>
          {typeof Notification !== "undefined" && Notification.permission === "denied" && (
            <p style={{ fontSize: 10.5, color: COLORS.warn, margin: "6px 0 0" }}>
              Notifications bloquées dans les réglages du navigateur — seules les bannières dans l'app s'afficheront.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Case a cocher simple, pour les rappels sans reglage d'horaire. */
function CaseRappel({ actif, onChange, titre, aide }) {
  return (
    <div style={styleSection}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={actif}
          onChange={(e) => {
            onChange(e.target.checked);
            if (e.target.checked) demanderAutorisation();
          }}
          style={styleCase}
        />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{titre}</span>
      </label>
      {aide && <p style={{ ...styleAide, margin: "6px 0 0" }}>{aide}</p>}
    </div>
  );
}

/** Occupation du stockage, en unites lisibles. */
function mesurerOccupation() {
  const { entrees, total } = occupationStockage();
  const photos = entrees.filter((e) => estCleDePhoto(e.cle)).reduce((a, e) => a + e.octets, 0);
  // Le plafond des navigateurs tourne autour de 5 Mo par site.
  const PLAFOND = 5 * 1024 * 1024;
  return {
    mo: Math.round((total / 1048576) * 10) / 10,
    photosMo: Math.round((photos / 1048576) * 10) / 10,
    pct: Math.min(100, Math.round((total / PLAFOND) * 100))
  };
}

export function Reglages({ open, onClose, profile, onSave, onRestaurer }) {
  const [occupation, setOccupation] = useState(mesurerOccupation);
  const [messageStockage, setMessageStockage] = useState(null);

  useEffect(() => {
    if (open) setOccupation(mesurerOccupation());
  }, [open]);
  const [value, setValue] = useState(profile);
  const [message, setMessage] = useState(null);
  const fichierRef = useRef(null);

  useEffect(() => setValue(profile), [profile, open]);

  const set = (modif) => setValue((v) => ({ ...v, ...modif }));

  const exporter = async () => {
    try {
      const resultat = await exporterSauvegarde(construireSauvegarde(), value.name);
      setMessage(
        resultat === "downloaded"
          ? "Sauvegarde téléchargée — garde ce fichier en lieu sûr (Drive, mail...)."
          : resultat === "shared"
            ? "Sauvegarde partagée."
            : null
      );
    } catch (e) {
      /*
       * L'application d'origine n'affiche rien ici : l'echec est
       * silencieux, et le client peut croire qu'il a une sauvegarde alors
       * qu'il n'en a aucune. C'est une faiblesse reelle, mais la corriger
       * maintenant melangerait migration et amelioration — et devant un
       * comportement inattendu, plus personne ne saurait si c'est un bug de
       * portage ou un changement voulu.
       *
       * A traiter apres la bascule. Voir AMELIORATIONS.md.
       */
      setMessage(null);
    }
  };

  const restaurer = (evenement) => {
    const fichier = evenement.target.files[0];
    evenement.target.value = "";
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = async () => {
      try {
        // Confirmation explicite : la restauration remplace tout, et il
        // n'existe aucune copie serveur pour revenir en arriere.
        if (!window.confirm("Restaurer cette sauvegarde ? Les données actuelles de cet appareil seront remplacées.")) {
          return;
        }
        const nombre = restaurerSauvegarde(JSON.parse(String(lecteur.result)));
        await onRestaurer?.(nombre);
        setMessage(`Sauvegarde restaurée (${nombre} éléments). Rechargement...`);
        setTimeout(() => window.location.reload(), 900);
      } catch (e) {
        setMessage("Fichier de sauvegarde invalide.");
      }
    };
    lecteur.readAsText(fichier);
  };

  return (
    <Modal open={open} onClose={onClose} title="Réglages" iconeFermer={X}>
      {value && (
        <>
          <ChampsProfil value={value} onChange={setValue} />

          <BlocRappel reglage={RAPPELS.hydratation} value={value} set={set} />
          <BlocRappel reglage={RAPPELS.nutrition} value={value} set={set} />

          <CaseRappel
            actif={value.reportReminderEnabled !== false}
            onChange={(on) => set({ reportReminderEnabled: on })}
            titre="Rappel du dimanche — envoyer mon bilan au coach"
          />

          {enLigne(value) && (
            <CaseRappel
              actif={value.creneauReminderEnabled !== false}
              onChange={(on) => set({ creneauReminderEnabled: on })}
              titre="Rappel de créneau (coaching en ligne)"
              aide="Une notification 1 h avant ton créneau du jour, si tu ne l'as pas encore pointé."
            />
          )}

          {/*
           * Le champ « Clé IA » n'apparait que si aucun proxy n'est
           * configure. Avec le proxy, la cle vit cote serveur : afficher ce
           * champ inviterait le client a coller une cle personnelle dans
           * son navigateur, ce que la phase 1 a precisement supprime.
           */}
          {!PROXY_BASE_URL && (
            <div style={styleSection}>
              <Field label="Clé IA (fournie par ton coach)">
                <p style={styleAide}>
                  Active la photo de repas, le chatbot nutrition, la lecture des codes-barres et le bilan IA
                  optionnel.
                </p>
              </Field>
            </div>
          )}

          <div style={styleSection}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>
              Sauvegarde des données
            </div>
            <p style={{ ...styleAide, margin: "0 0 10px" }}>
              Le fichier contient tout ton suivi, photos comprises. Exporte régulièrement, et avant de changer de
              téléphone : Restaurer sur le nouvel appareil remet tout en place.
            </p>

            {/* TEXTE-NOUVEAU
                Occupation du stockage et suppression des photos. Ajoute apres
                un signalement client : « on ne peut meme plus enregistrer de
                repas ». La memoire du navigateur etait pleine — les photos de
                progression pesent ~180 Ko chacune pour un plafond de 5 Mo —
                et rien ne le disait ni ne permettait de faire de la place.
            */}
            <div
              style={{
                background: COLORS.bgAlt,
                border: `1px solid ${occupation.pct >= 80 ? COLORS.warn : COLORS.border}`,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: COLORS.textMuted }}>Mémoire utilisée</span>
                <span
                  style={{
                    fontFamily: "IBM Plex Mono",
                    color: occupation.pct >= 80 ? COLORS.warn : COLORS.textMuted
                  }}
                >
                  {occupation.mo} Mo{occupation.photosMo > 0 ? ` · dont ${occupation.photosMo} Mo de photos` : ""}
                </span>
              </div>
              {occupation.pct >= 80 && (
                <p style={{ fontSize: 11.5, color: COLORS.warn, margin: "0 0 8px", lineHeight: 1.45 }}>
                  La mémoire est presque pleine. Au-delà, plus rien ne s'enregistre. Exporte tes données, puis
                  libère de la place.
                </p>
              )}
              {occupation.photosMo > 0 && (
                <Btn
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm("Supprimer les photos de progression de cet appareil ? Exporte tes données avant : elles ne seront plus récupérables ici.")) return;
                    const liberes = supprimerPhotos();
                    setOccupation(mesurerOccupation());
                    setMessageStockage(`${Math.round(liberes / 1048576 * 10) / 10} Mo libérés.`);
                  }}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 12.5 }}
                >
                  Supprimer les photos de cet appareil
                </Btn>
              )}
              {messageStockage && (
                <p style={{ fontSize: 11.5, color: COLORS.good, margin: "8px 0 0" }}>{messageStockage}</p>
              )}
            </div>
            {/* FIN-TEXTE-NOUVEAU */}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" icon={Download} onClick={exporter} style={{ flex: 1 }}>
                Exporter mes données
              </Btn>
              <input
                type="file"
                accept=".json,application/json"
                ref={fichierRef}
                style={{ display: "none" }}
                onChange={restaurer}
              />
              <Btn variant="ghost" icon={Upload} onClick={() => fichierRef.current?.click()} style={{ flex: 1 }}>
                Restaurer
              </Btn>
            </div>
            {message && <p style={{ fontSize: 11.5, color: COLORS.gold, margin: "8px 0 0" }}>{message}</p>}
          </div>

          <Btn
            onClick={() => {
              onSave(value);
              onClose();
            }}
            style={{ width: "100%" }}
          >
            Enregistrer
          </Btn>
        </>
      )}
    </Modal>
  );
}
