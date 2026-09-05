/**
 * Coach nutrition IA — conversation.
 *
 * Portage fidele de CoachChatSection (index.html, ligne 2718).
 *
 * La conversation est conservee sur l'appareil, limitee aux quarante
 * derniers messages. Seuls les douze derniers sont envoyes au modele : au
 * dela, la reponse ne s'ameliore plus et le cout grimpe.
 *
 * En cas d'echec, le message de l'utilisateur reste affiche et la
 * conversation n'est pas enregistree. Perdre ce qu'il vient d'ecrire parce
 * que le reseau a lache serait la pire reponse possible.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { computeRemainingToday } from "../lib/nutrition.js";
import { genererTexte, messageErreur } from "../lib/ia.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { Btn, Card, TextInput } from "../ui/primitives.jsx";
import { Loader2, Sparkles } from "../ui/icones.jsx";

const CLE_CONVERSATION = "coach_chat";

/** Messages conserves sur l'appareil, et messages envoyes au modele. */
const MAX_CONSERVES = 40;
const MAX_ENVOYES = 12;

/** Questions proposees tant que la conversation est vide. */
const AMORCES = ["Idée de dîner ce soir ?", "Une collation protéinée ?", "Par quoi remplacer le riz ?"];

export function CoachIA({ profile, targets, logEntries, construireConsigne }) {
  const [messages, setMessages] = useState([]);
  const [brouillon, setBrouillon] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [pret, setPret] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    setMessages(charger(CLE_CONVERSATION, []) || []);
    setPret(true);
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, enCours]);

  const envoyer = async (texteArg) => {
    const texte = (texteArg != null ? texteArg : brouillon).trim();
    if (!texte || enCours) return;

    setErreur(null);
    setBrouillon("");
    const avecQuestion = [...messages, { role: "user", text: texte }];
    setMessages(avecQuestion);
    setEnCours(true);

    try {
      const restant = computeRemainingToday(logEntries, targets);
      const reponse = await genererTexte({
        history: avecQuestion.slice(-MAX_ENVOYES),
        systemPrompt: construireConsigne?.(profile, targets, restant),
        maxTokens: 700
      });
      const avecReponse = [...avecQuestion, { role: "assistant", text: reponse }];
      setMessages(avecReponse);
      enregistrer(CLE_CONVERSATION, avecReponse.slice(-MAX_CONSERVES));
    } catch (e) {
      setErreur(messageErreur(e, "Réponse impossible pour l'instant. Vérifie ta connexion, puis réessaie."));
      // La question reste affichee : elle n'est pas perdue.
      setMessages(avecQuestion);
    } finally {
      setEnCours(false);
    }
  };

  const effacer = async () => {
    setMessages([]);
    enregistrer(CLE_CONVERSATION, []);
  };

  if (!pret) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <Loader2 size={18} className="spin" color={COLORS.gold} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Card style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 280 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: COLORS.textMuted, padding: "18px 8px" }}>
            <Sparkles size={22} color={COLORS.gold} />
            <p style={{ fontSize: 13, margin: "10px 0 4px", color: COLORS.text, fontWeight: 600 }}>
              Coach nutrition IA
            </p>
            <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
              Pose ta question : il conseille aliments et repas selon ton objectif, tes macros restantes du jour
              et les recommandations du Coach Neiram — en respectant ton régime et tes allergies.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "86%",
                background: m.role === "user" ? `${COLORS.gold}1E` : COLORS.bgAlt,
                border: `1px solid ${m.role === "user" ? COLORS.gold + "44" : COLORS.border}`,
                // Le coin plat designe l'auteur : a droite pour le client,
                // a gauche pour le coach.
                borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                padding: "9px 12px",
                fontSize: 13,
                color: COLORS.text,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap"
              }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {enCours && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textMuted, fontSize: 12 }}>
            <Loader2 size={14} className="spin" /> Le coach réfléchit...
          </div>
        )}

        {erreur && <p style={{ fontSize: 12, color: COLORS.bad, margin: 0 }}>{erreur}</p>}

        <div ref={finRef} />
      </Card>

      {messages.length === 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {AMORCES.map((amorce) => (
            <button
              key={amorce}
              onClick={() => envoyer(amorce)}
              style={{
                padding: "7px 11px",
                borderRadius: 9,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bgAlt,
                color: COLORS.textMuted,
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              {amorce}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <TextInput
          placeholder="Ex : je suis à 40 g de protéines, quoi manger ce soir ?"
          value={brouillon}
          onChange={(e) => setBrouillon(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") envoyer();
          }}
          style={{ flex: 1 }}
        />
        <Btn onClick={() => envoyer()} disabled={enCours || !brouillon.trim()} style={{ padding: "10px 16px" }}>
          Envoyer
        </Btn>
      </div>

      {messages.length > 0 && (
        <button
          onClick={effacer}
          style={{
            background: "none",
            border: "none",
            color: COLORS.textFaint,
            fontSize: 11,
            cursor: "pointer",
            alignSelf: "center",
            padding: 4
          }}
        >
          Effacer la conversation
        </button>
      )}
    </div>
  );
}
