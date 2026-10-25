/**
 * Espace coach (24 octobre 2026) : page à part (app/espace-coach.html),
 * jamais reliée à l'application des clients. Liste des clients, codes
 * d'accès, révocation, modération de la communauté, par les routes /admin
 * du Worker.
 *
 * Le secret vit dans l'état de ce composant, et nulle part ailleurs
 * (lib/espace-coach.js). « Verrouiller » ou 15 minutes sans action
 * l'effacent. Textes : lib/espace-coach.js.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import {
  DELAI_VERROU_MS,
  TEXTES_ESPACE_COACH as T,
  creerCode,
  etatClient,
  libelleValide,
  listeClients,
  messageErreurAdmin,
  moderation,
  presenceClients,
  revoquerClient,
  trierPresence,
  ERREURS_ESPACE_COACH
} from "../lib/espace-coach.js";
import { Btn, Card, SectionTitle, TextInput } from "./primitives.jsx";

const STYLE_PAGE = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "24px 16px 60px",
  display: "flex",
  flexDirection: "column",
  gap: 16
};
const STYLE_TITRE = {
  fontFamily: POLICES.titre,
  fontSize: 22,
  fontWeight: 700,
  color: COLORS.gold,
  margin: 0
};
const STYLE_AIDE = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  lineHeight: 1.5,
  margin: "4px 0 10px"
};
const STYLE_ERREUR = {
  fontSize: 12.5,
  color: COLORS.warn,
  lineHeight: 1.45,
  margin: "8px 0 0"
};
const STYLE_OK = {
  fontSize: 12.5,
  color: COLORS.good,
  margin: "8px 0 0"
};
const STYLE_LIGNE = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: `1px solid ${COLORS.border}`,
  gap: 8
};
const STYLE_NOM = {
  fontSize: 13.5,
  fontWeight: 600,
  color: COLORS.text
};
const STYLE_DETAIL = {
  fontSize: 11.5,
  color: COLORS.textMuted
};
const STYLE_ACTIONS = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};
const STYLE_RANGEE = {
  display: "flex",
  marginTop: 8,
  gap: 8
};
const STYLE_CODE = {
  fontFamily: POLICES.chiffres,
  fontSize: 22,
  letterSpacing: 3,
  color: COLORS.gold,
  margin: "6px 0"
};
const STYLE_ENCADRE = {
  border: `1px solid ${COLORS.gold}`,
  borderRadius: 10,
  padding: "10px 12px",
  marginTop: 10,
  background: `${COLORS.gold}11`
};

function puce(couleur = COLORS.border) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${couleur}`,
    background: "transparent",
    color: COLORS.text,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit"
  };
}
const styleEtat = (etat) => ({ ...STYLE_DETAIL, color: etat === "sans-jeton" ? COLORS.warn : etat === "revoque" ? COLORS.bad : COLORS.good, fontWeight: 600 });

const styleNiveau = (niveau) => ({
  ...STYLE_DETAIL,
  textAlign: "right",
  fontWeight: 600,
  color: niveau === "critique" ? COLORS.bad : niveau === "attention" ? COLORS.warn : COLORS.good
});

/** Saisie du secret : champ mot de passe, rien n'est gardé. */
function Verrou({ onOuvrir, message }) {
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const valider = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const d = await listeClients(saisie);
      onOuvrir(saisie, d.clients || []);
      setSaisie("");
    } catch (err) {
      setErreur(messageErreurAdmin(err));
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Card>
      <form data-verrou onSubmit={valider} autoComplete="off">
        <p style={STYLE_AIDE}>{T.intro}</p>
        <TextInput data-secret type="password" autoComplete="off" value={saisie} placeholder={T.secret} onChange={(e) => setSaisie(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <Btn disabled={envoi || !saisie} style={{ width: "100%" }}>
            {T.ouvrir}
          </Btn>
        </div>
        {message && <p style={STYLE_OK}>{message}</p>}
        {erreur && (
          <p data-erreur-espace style={STYLE_ERREUR}>
            {erreur}
          </p>
        )}
      </form>
    </Card>
  );
}

export function EspaceCoach() {
  // Le secret : ici seulement, jamais écrit ailleurs.
  const [secret, setSecret] = useState(null);
  const [clients, setClients] = useState([]);
  const [moder, setModer] = useState(null);
  const [presence, setPresence] = useState(null);
  const [nouveauCode, setNouveauCode] = useState(null);
  const [libelle, setLibelle] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [numero, setNumero] = useState("");
  const [erreur, setErreur] = useState(null);
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState(null);
  const [copie, setCopie] = useState(false);
  const minuteur = useRef(null);

  const verrouiller = (texte = T.verrouille) => {
    setSecret(null);
    setClients([]);
    setModer(null);
    setPresence(null);
    setNouveauCode(null);
    setErreur(null);
    setInfo(null);
    setMessage(texte);
  };

  // Oubli automatique après 15 minutes sans action.
  useEffect(() => {
    if (!secret) return undefined;
    const relancer = () => {
      clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => verrouiller(T.verrouAuto), DELAI_VERROU_MS);
    };
    relancer();
    const evenements = ["pointerdown", "keydown"];
    for (const ev of evenements) document.addEventListener(ev, relancer);
    return () => {
      clearTimeout(minuteur.current);
      for (const ev of evenements) document.removeEventListener(ev, relancer);
    };
  }, [secret]);

  const agir = async (fn, succes) => {
    setErreur(null);
    setInfo(null);
    try {
      const r = await fn();
      if (succes) setInfo(succes);
      return r;
    } catch (e) {
      setErreur(messageErreurAdmin(e));
      // Secret devenu invalide (changé dans Cloudflare) : on verrouille.
      if (e && e.message === "401") verrouiller(ERREURS_ESPACE_COACH[401]);
      return null;
    }
  };
  const recharger = async (s = secret) => {
    const [c, m, p] = await Promise.all([agir(() => listeClients(s)), agir(() => moderation("signalements", null, s)), agir(() => presenceClients(s))]);
    if (c) setClients(c.clients || []);
    if (m) setModer(m);
    if (p) setPresence(p.clients || []);
  };
  const ouvrir = (s, liste) => {
    setMessage(null);
    setSecret(s);
    setClients(liste);
    agir(() => moderation("signalements", null, s)).then((m) => m && setModer(m));
    agir(() => presenceClients(s)).then((p) => p && setPresence(p.clients || []));
  };

  if (!secret) {
    return (
      <div style={STYLE_PAGE} data-espace-coach="verrouille">
        <h1 style={STYLE_TITRE}>{T.titre}</h1>
        <Verrou onOuvrir={ouvrir} message={message} />
      </div>
    );
  }

  const creer = async (cible) => {
    if (!cible.client && !libelleValide(cible.libelle)) return setErreur(ERREURS_ESPACE_COACH["libelle-invalide"]);
    const r = await agir(() => creerCode(cible, secret));
    if (r) {
      setNouveauCode(r);
      setCopie(false);
      setLibelle("");
      recharger();
    }
  };
  const revoquer = async (c) => {
    if (!window.confirm(T.confirmerRevoquer(c.libelle))) return;
    if (await agir(() => revoquerClient(c.id, secret), T.revoqueOk(c.libelle))) recharger();
  };
  const moderer = async (action, cible, confirmer = false) => {
    if (confirmer && !window.confirm(T.confirmerSupprimer)) return;
    if (await agir(() => moderation(action, cible, secret), T.fait)) recharger();
  };
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(nouveauCode.code);
      setCopie(true);
    } catch (e) {
      setCopie(false);
    }
  };
  const signalements = (moder && moder.signalements) || [];

  return (
    <div style={STYLE_PAGE} data-espace-coach="ouvert">
      <div style={STYLE_LIGNE}>
        <h1 style={STYLE_TITRE}>{T.titre}</h1>
        <span style={STYLE_ACTIONS}>
          <button type="button" onClick={() => recharger()} style={puce()}>
            {T.actualiser}
          </button>
          <button type="button" data-verrouiller onClick={() => verrouiller()} style={puce(COLORS.gold)}>
            {T.verrouiller}
          </button>
        </span>
      </div>
      {erreur && (
        <p data-erreur-espace style={STYLE_ERREUR}>
          {erreur}
        </p>
      )}
      {info && (
        <p data-info-espace style={STYLE_OK}>
          {info}
        </p>
      )}

      <Card>
        <SectionTitle>{T.codeTitre}</SectionTitle>
        <p style={STYLE_AIDE}>{T.codeAide}</p>
        <div style={STYLE_RANGEE}>
          <TextInput data-libelle value={libelle} maxLength={40} placeholder={T.libelle} onChange={(e) => setLibelle(e.target.value)} style={{ flex: 1 }} />
          <Btn onClick={() => creer({ libelle: libelle.trim() })} disabled={!libelle.trim()}>
            {T.creerCode}
          </Btn>
        </div>
        {nouveauCode && (
          <div data-nouveau-code style={STYLE_ENCADRE}>
            <div style={STYLE_NOM}>{T.codePour(nouveauCode.libelle)}</div>
            <div data-code style={STYLE_CODE}>
              {nouveauCode.code}
            </div>
            <div style={STYLE_DETAIL}>{T.expire(nouveauCode.expireLe)}</div>
            <div style={STYLE_RANGEE}>
              <button type="button" data-copier onClick={copier} style={puce(COLORS.gold)}>
                {copie ? T.copie : T.copier}
              </button>
              <button type="button" onClick={() => setNouveauCode(null)} style={puce()}>
                {T.masquerCode}
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>{T.clientsTitre}</SectionTitle>
        {!clients.length ? (
          <p style={STYLE_AIDE}>{T.aucunClient}</p>
        ) : (
          clients.map((c) => {
            const etat = etatClient(c);
            return (
              <div key={c.id} data-client={c.libelle} data-etat={etat} style={STYLE_LIGNE}>
                <div>
                  <div style={STYLE_NOM}>{c.libelle}</div>
                  <div style={STYLE_DETAIL}>{T.creeLe(c.cree_le)}</div>
                  <div style={styleEtat(etat)}>{etat === "revoque" ? T.revoqueLe(c.revoque_le) : etat === "actif" ? T.jetons(Number(c.jetons)) : T.sansJeton}</div>
                </div>
                {etat !== "revoque" && (
                  <span style={STYLE_ACTIONS}>
                    <button type="button" data-nouveau-code-client={c.libelle} onClick={() => creer({ client: c.id })} style={puce()}>
                      {T.nouveauCodeClient}
                    </button>
                    <button type="button" data-revoquer={c.libelle} onClick={() => revoquer(c)} style={puce(COLORS.bad)}>
                      {T.revoquer}
                    </button>
                  </span>
                )}
              </div>
            );
          })
        )}
      </Card>

      <Card>
        <SectionTitle>{T.presenceTitre}</SectionTitle>
        <p style={STYLE_AIDE}>{T.presenceAide}</p>
        {!presence ? (
          <p style={STYLE_AIDE}>{T.chargement}</p>
        ) : !presence.length ? (
          <p style={STYLE_AIDE}>{T.aucunePresence}</p>
        ) : (
          trierPresence(presence).map((c) => (
            <div key={c.id} data-presence={c.libelle} data-niveau={c.niveau || (c.jours != null ? "ok" : c.vuLe ? "sans-saisie" : "jamais")} data-jours={c.jours == null ? "" : c.jours} style={STYLE_LIGNE}>
              <div>
                <div style={STYLE_NOM}>{c.libelle}</div>
                {c.vuLe ? (
                  <>
                    <div style={STYLE_DETAIL}>{T.derniereSaisie(c.derniereSaisie)}</div>
                    <div style={STYLE_DETAIL}>{T.vuLe(c.vuLe)}</div>
                  </>
                ) : (
                  <div style={STYLE_DETAIL}>{T.jamaisVu}</div>
                )}
              </div>
              {c.jours != null && (
                <div style={styleNiveau(c.niveau)}>
                  <div>{T.niveauPresence[c.niveau] || T.aJour}</div>
                  <div style={STYLE_DETAIL}>{T.joursSansSaisie(c.jours)}</div>
                  {c.alerteEnvoyee && <div style={STYLE_DETAIL}>{T.alerteEnvoyee(c.alerteEnvoyee)}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>{T.moderationTitre}</SectionTitle>
        {!moder ? (
          <p style={STYLE_AIDE}>{T.chargement}</p>
        ) : !signalements.length ? (
          <p style={STYLE_AIDE}>{T.aucunSignalement}</p>
        ) : (
          signalements.map((s) => {
            const cible = s.type === "profil" ? s.apercu : s.cible;
            const suffixe = s.type === "profil" ? "" : "-transformation";
            return (
              <div key={s.type + (s.cible || s.apercu)} data-signalement={s.type} data-cible={cible} style={STYLE_LIGNE}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={STYLE_NOM}>{T.signalement(s.type, Number(s.nombre))}</div>
                  <div style={STYLE_DETAIL}>{s.type === "profil" ? s.apercu : T.publication(s.cible, s.apercu)}</div>
                  {s.motifs && <div style={STYLE_DETAIL}>{T.motifs(s.motifs)}</div>}
                </div>
                <span style={STYLE_ACTIONS}>
                  <button type="button" data-moderer="masquer" onClick={() => moderer("masquer" + suffixe, cible)} style={puce(COLORS.warn)}>
                    {T.masquer}
                  </button>
                  <button type="button" data-moderer="afficher" onClick={() => moderer("afficher" + suffixe, cible)} style={puce()}>
                    {T.afficher}
                  </button>
                  <button type="button" data-moderer="supprimer" onClick={() => moderer(s.type === "profil" ? "supprimer-profil" : "supprimer-transformation", cible, true)} style={puce(COLORS.bad)}>
                    {T.supprimer}
                  </button>
                </span>
              </div>
            );
          })
        )}
        {moder && moder.masques && moder.masques.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={STYLE_DETAIL}>{T.masques}</div>
            {moder.masques.map((p) => (
              <div key={p} data-profil-masque={p} style={STYLE_LIGNE}>
                <span style={STYLE_NOM}>{p}</span>
                <button type="button" onClick={() => moderer("afficher", p)} style={puce()}>
                  {T.afficher}
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <div style={STYLE_DETAIL}>{T.profilTitre}</div>
          <div style={STYLE_RANGEE}>
            <TextInput data-pseudo-moderation value={pseudo} maxLength={20} placeholder={T.pseudo} onChange={(e) => setPseudo(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={STYLE_RANGEE}>
            <button type="button" disabled={!pseudo.trim()} onClick={() => moderer("masquer", pseudo.trim())} style={puce(COLORS.warn)}>
              {T.masquer}
            </button>
            <button type="button" disabled={!pseudo.trim()} onClick={() => moderer("afficher", pseudo.trim())} style={puce()}>
              {T.afficher}
            </button>
            <button type="button" disabled={!pseudo.trim()} onClick={() => moderer("supprimer-profil", pseudo.trim(), true)} style={puce(COLORS.bad)}>
              {T.supprimer}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={STYLE_DETAIL}>{T.publicationTitre}</div>
          <div style={STYLE_RANGEE}>
            <TextInput data-numero-moderation value={numero} inputMode="numeric" maxLength={10} placeholder={T.numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))} style={{ flex: 1 }} />
          </div>
          <div style={STYLE_RANGEE}>
            <button type="button" disabled={!numero} onClick={() => moderer("masquer-transformation", numero)} style={puce(COLORS.warn)}>
              {T.masquer}
            </button>
            <button type="button" disabled={!numero} onClick={() => moderer("afficher-transformation", numero)} style={puce()}>
              {T.afficher}
            </button>
            <button type="button" disabled={!numero} onClick={() => moderer("supprimer-transformation", numero, true)} style={puce(COLORS.bad)}>
              {T.supprimer}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
