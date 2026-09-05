/**
 * Bibliotheque de seances sans materiel.
 *
 * Portage fidele de SeancesCoachCard (index.html, ligne ~4370).
 *
 * Les seances deja ajoutees sont reconnues par leur templateId : sans lui,
 * un client qui appuie deux fois se retrouverait avec quatorze seances
 * types au lieu de sept.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { Btn, Card, SectionTitle } from "../ui/primitives.jsx";
import { Plus } from "../ui/icones.jsx";

/** Duree d'affichage du message de confirmation, en millisecondes. */
const DUREE_MESSAGE = 3200;

export function SeancesCoach({ routinesApi, modeles }) {
  const [message, setMessage] = useState(null);

  const dejaAjoutees = new Set(routinesApi.items.map((r) => r.templateId).filter(Boolean));
  const manquantes = modeles.filter((t) => !dejaAjoutees.has(t.id));

  const ajouter = async () => {
    await routinesApi.addMany(
      manquantes.map((t) => ({ name: t.name, description: t.description, color: t.color, templateId: t.id }))
    );
    setMessage(
      manquantes.length +
        (manquantes.length > 1 ? " séances ajoutées" : " séance ajoutée") +
        " à tes séances types, plus bas."
    );
    window.setTimeout(() => setMessage(null), DUREE_MESSAGE);
  };

  return (
    <Card>
      <SectionTitle>Bibliothèque de séances (sans matériel)</SectionTitle>
      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 12px" }}>
        7 séances prêtes à l'emploi (45, 30 ou 15 min), conçues par ton coach pour t'entraîner à la maison sans
        matériel.
      </p>

      {manquantes.length > 0 ? (
        <Btn icon={Plus} style={{ width: "100%" }} onClick={ajouter}>
          {"Ajouter les " + manquantes.length + (manquantes.length > 1 ? " séances" : " séance") + " à mes séances types"}
        </Btn>
      ) : (
        <p style={{ fontSize: 12.5, color: COLORS.good, margin: 0 }}>
          Les 7 séances du coach sont dans tes séances types, dans l'onglet ci-dessous.
        </p>
      )}

      {message && <p style={{ fontSize: 12, color: COLORS.good, margin: "10px 0 0" }}>{message}</p>}

      <p style={{ fontSize: 11, color: COLORS.textFaint, lineHeight: 1.5, margin: "12px 0 0" }}>
        L'échauffement (5 min) est inclus au début de chaque séance. RPE 7 maximum les 4 premières semaines. Une
        douleur qui persiste ou s'aggrave : note-la dans Douleurs pendant la séance, et consulte un professionnel de
        santé.
      </p>
    </Card>
  );
}
