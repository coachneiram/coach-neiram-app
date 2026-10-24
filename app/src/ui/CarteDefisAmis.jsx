/**
 * Carte « Défis entre amis » du Journal (lib/defis-amis.js), reprise de
 * l'app publique Neiram le 24 octobre 2026 et réservée aux clients du
 * coach : sans code d'accès activé, elle renvoie aux Réglages.
 *
 * Avant de créer ou de rejoindre un défi, un encadré dit ce qui sera vu
 * des autres participants (pseudo et total) ; son bouton vaut accord.
 */

import { useEffect, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { fmtDateShort } from "../lib/dates.js";
import {
  TEXTES_DEFIS_AMIS as T,
  TYPES_DEFI_AMIS,
  creerDefi,
  defisGagnes,
  defisPossibles,
  lienInvitation,
  lireDefisAmis,
  messageErreurDefi,
  noterVictoires,
  oublierDefi,
  prendreCodeInvitation,
  progresDefis,
  pseudoParDefaut,
  quitterDefi,
  rejoindreDefi,
  retenirDefi,
  retenirPseudo,
  texteInvitation,
  typeDefi,
  valeurDefi
} from "../lib/defis-amis.js";
import { partagerTexte } from "../lib/partage-texte.js";
import { Btn, Card, SectionTitle, TextInput } from "./primitives.jsx";

const MEDAILLES = { 1: "🥇", 2: "🥈", 3: "🥉" };

function puce(actif) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
    background: actif ? `${COLORS.gold}22` : "transparent",
    color: actif ? COLORS.gold : COLORS.text,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap"
  };
}

const STYLE_TEXTE = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  margin: "4px 0 10px",
  lineHeight: 1.5
};
const STYLE_DEFI = {
  background: COLORS.bgAlt,
  borderRadius: 10,
  padding: "10px 12px",
  marginBottom: 10
};
const STYLE_ENTETE_DEFI = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12.5,
  fontWeight: 700,
  color: COLORS.text,
  gap: 8
};
const STYLE_CODE = {
  fontFamily: POLICES.chiffres,
  fontSize: 15,
  letterSpacing: 2,
  color: COLORS.gold
};
const STYLE_LIEN = {
  fontSize: 11,
  color: COLORS.textMuted,
  wordBreak: "break-all",
  marginTop: 2
};
const STYLE_LIGNE = {
  display: "flex",
  flexWrap: "wrap",
  marginTop: 8,
  gap: 6
};
const STYLE_TYPES = {
  display: "flex",
  flexWrap: "wrap",
  margin: "8px 0",
  gap: 6
};
const STYLE_REJOINDRE = {
  display: "flex",
  marginTop: 10,
  gap: 8
};
const STYLE_ACCORD = {
  border: `1px solid ${COLORS.gold}`,
  borderRadius: 10,
  padding: "10px 12px",
  margin: "10px 0",
  background: `${COLORS.gold}11`
};

const fmtValeur = (v, type) => `${Math.round(v).toLocaleString("fr-FR")} ${typeDefi(type).unite}`;

function ligneParticipant(p) {
  return {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12.5,
    color: p.moi ? COLORS.gold : COLORS.text,
    fontWeight: p.moi ? 700 : 400,
    padding: "2px 0"
  };
}

export function CarteDefisAmis({ seances, journal }) {
  const possible = defisPossibles();
  const [defis, setDefis] = useState([]);
  const [type, setType] = useState("pas");
  const [pseudo, setPseudo] = useState(() => pseudoParDefaut());
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState(false);
  const [accord, setAccord] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [gagnes, setGagnes] = useState(() => defisGagnes());

  const valeur = (e) => valeurDefi(e.type, e.debut, e.fin, { journal, seances });

  // Envoie mes totaux et recharge les classements.
  const synchroniser = async (connus = defis) => {
    const suivis = lireDefisAmis();
    if (!suivis.length) return setDefis([]);
    // Sans les dates d'un défi (premier passage), on demande seulement son
    // état : aucun total n'est envoyé, donc rien n'est écrasé.
    const envoyer = suivis.map((d) => {
      const e = connus.find((x) => x.code === d.code);
      return e ? { code: d.code, valeur: valeur(e) } : { code: d.code };
    });
    try {
      let r = await progresDefis(envoyer);
      if (r.defis.some((e) => !connus.some((x) => x.code === e.code))) {
        r = await progresDefis(r.defis.map((e) => ({ code: e.code, valeur: valeur(e) })));
      }
      // Un défi effacé côté serveur (quitté ailleurs, accès révoqué) n'est plus suivi.
      for (const d of suivis) if (!r.defis.some((e) => e.code === d.code)) oublierDefi(d.code);
      noterVictoires(r.defis);
      setGagnes(defisGagnes());
      setDefis(r.defis);
    } catch (e) {
      setErreur(messageErreurDefi(e));
    }
  };

  useEffect(() => {
    const recu = prendreCodeInvitation();
    if (recu) {
      setCode(recu);
      setInvite(true);
    }
    if (possible) synchroniser([]);
  }, []);

  const agir = async (action) => {
    setAccord(null);
    setEnvoi(true);
    setErreur(null);
    const p = pseudo.trim();
    try {
      const r = action === "creer" ? await creerDefi(type, p) : await rejoindreDefi(code.trim(), p);
      retenirDefi(r.defi.code, p);
      retenirPseudo(p);
      setCode("");
      setInvite(false);
      await synchroniser([r.defi, ...defis.filter((x) => x.code !== r.defi.code)]);
    } catch (e) {
      setErreur(messageErreurDefi(e));
    } finally {
      setEnvoi(false);
    }
  };

  const quitter = (d) => {
    if (!d.termine && typeof window !== "undefined" && !window.confirm(T.confirmerQuitter)) return;
    quitterDefi(d.code).catch(() => null);
    oublierDefi(d.code);
    setDefis(defis.filter((x) => x.code !== d.code));
  };

  if (!possible) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <div data-defis-amis="sans-acces">
          <SectionTitle tuto="defis-amis">{T.titre}</SectionTitle>
          <p style={STYLE_TEXTE}>{T.sansAcces}</p>
        </div>
      </Card>
    );
  }

  const pseudoOk = pseudo.trim().length >= 3;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div data-defis-amis="actif">
        <SectionTitle tuto="defis-amis">{T.titre}</SectionTitle>
        <p style={STYLE_TEXTE}>
          {T.intro}
          {gagnes > 0 && <span data-defis-gagnes={gagnes}> {T.gagnes(gagnes)}</span>}
        </p>

        {defis.map((d) => {
          const t = typeDefi(d.type);
          const restant = Math.max(0, Math.round((new Date(d.fin + "T23:59:59") - new Date()) / 86400000));
          const lien = lienInvitation(d.code);
          return (
            <div key={d.code} data-defi-ami={d.code} style={STYLE_DEFI}>
              <div style={STYLE_ENTETE_DEFI}>
                <span>
                  {t.emoji} {t.label}
                </span>
                <span style={{ color: d.termine ? COLORS.textFaint : COLORS.gold, fontWeight: 500, fontSize: 11.5 }}>
                  {d.termine ? T.termineLe(fmtDateShort(d.fin)) : restant <= 0 ? T.dernierJour : T.encore(restant)}
                </span>
              </div>
              <div data-classement style={{ marginTop: 6 }}>
                {d.participants.map((p) => (
                  <div key={p.pseudo} data-participant={p.pseudo} data-moi={p.moi ? "1" : "0"} style={ligneParticipant(p)}>
                    <span>
                      {MEDAILLES[p.rang] || p.rang + "."} {p.pseudo}
                      {d.termine && p.rang === 1 && d.participants.length > 1 ? " 🏆" : ""}
                    </span>
                    <span data-total>{fmtValeur(p.valeur, d.type)}</span>
                  </div>
                ))}
              </div>
              {d.participants.length < 2 && !d.termine && <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 4 }}>{T.seul}</div>}
              {!d.termine && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {T.codeDuDefi} : <span data-code-defi-ami style={STYLE_CODE}>{d.code}</span>
                  </div>
                  <div data-lien-defi={lien} style={STYLE_LIEN}>
                    {T.lienCopie} : {lien}
                  </div>
                </div>
              )}
              <div style={STYLE_LIGNE}>
                {!d.termine && (
                  <button type="button" data-inviter={d.code} onClick={() => partagerTexte(texteInvitation(d.code, d.type))} style={puce(true)}>
                    📨 {T.inviter}
                  </button>
                )}
                <button type="button" data-quitter={d.code} onClick={() => quitter(d)} style={puce(false)}>
                  {d.termine ? T.retirer : T.quitter}
                </button>
              </div>
            </div>
          );
        })}

        <TextInput data-pseudo-defi value={pseudo} maxLength={20} placeholder={T.pseudo} onChange={(e) => setPseudo(e.target.value)} />
        <div style={STYLE_TYPES}>
          {TYPES_DEFI_AMIS.map((t) => (
            <button key={t.id} type="button" data-type-defi={t.id} aria-pressed={type === t.id} onClick={() => setType(t.id)} style={puce(type === t.id)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <Btn onClick={() => setAccord("creer")} disabled={envoi || !pseudoOk} style={{ width: "100%" }}>
          {T.lancer}
        </Btn>
        {invite && <p style={{ ...STYLE_TEXTE, color: COLORS.gold }}>{T.codeRecu}</p>}
        <div style={STYLE_REJOINDRE}>
          <TextInput data-code-defi value={code} maxLength={6} placeholder={T.code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={() => setAccord("rejoindre")} disabled={envoi || code.trim().length < 6 || !pseudoOk}>
            {T.rejoindre}
          </Btn>
        </div>

        {accord && (
          <div data-accord-defi={accord} role="alertdialog" style={STYLE_ACCORD}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0 }}>{T.accord}</p>
            <p style={STYLE_TEXTE}>{T.accordDetail}</p>
            <Btn onClick={() => agir(accord)} disabled={envoi} style={{ width: "100%" }}>
              {T.boutonAccord}
            </Btn>
          </div>
        )}
        {erreur && <p data-erreur-defi style={{ fontSize: 12, color: COLORS.warn, margin: "8px 0 0" }}>{erreur}</p>}
      </div>
    </Card>
  );
}
