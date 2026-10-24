/**
 * Image story (1080 x 1920) de l'annee d'entrainement : grand chiffre, puis
 * les 12 mois en petites grilles dorees. Meme identite que la carte de
 * progres (lib/dessin-carte.js). Module navigateur (canvas).
 */

import { HAUTEUR, LARGEUR } from "./dessin-carte.js";
import { MOIS, grilleMois, niveauCase, seancesParJour } from "./calendrier.js";

const OR = "#F8D040";
const FOND = "#0B0B0C";
const TEXTE = "#F5F5F2";
const DISCRET = "#9C9C94";
const TITRE = '"Poppins", "Inter", system-ui, sans-serif';
const TEINTES = ["#1E1E22", "rgba(248,208,64,0.45)", "rgba(248,208,64,0.75)", OR];

export async function dessinerCalendrier(seances, stats, { pied = "Coaching sportif" } = {}) {
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // repli police systeme
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = LARGEUR;
  canvas.height = HAUTEUR;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  ctx.textAlign = "center";
  ctx.fillStyle = TEXTE;
  ctx.font = `800 64px ${TITRE}`;
  ctx.fillText("NEIRAM", LARGEUR / 2, 150);
  ctx.fillStyle = OR;
  ctx.font = `600 40px ${TITRE}`;
  ctx.fillText(`MON ANNÉE ${stats.annee}`, LARGEUR / 2, 215);
  ctx.font = `800 170px ${TITRE}`;
  ctx.fillText(String(stats.total), LARGEUR / 2, 400);
  ctx.fillStyle = TEXTE;
  ctx.font = `500 44px ${TITRE}`;
  ctx.fillText(`séance${stats.total > 1 ? "s" : ""} · ${stats.joursActifs} jour${stats.joursActifs > 1 ? "s" : ""} actif${stats.joursActifs > 1 ? "s" : ""}`, LARGEUR / 2, 470);

  // 12 mois : 3 colonnes x 4 lignes.
  const par = seancesParJour(seances, stats.annee);
  const colonnes = 3;
  const largeurMois = 300;
  const ecart = (LARGEUR - colonnes * largeurMois) / (colonnes + 1);
  const cote = 34;
  const pas = 41;
  for (let m = 0; m < 12; m++) {
    const x0 = ecart + (m % colonnes) * (largeurMois + ecart);
    const y0 = 560 + Math.floor(m / colonnes) * 300;
    ctx.textAlign = "left";
    ctx.fillStyle = DISCRET;
    ctx.font = `600 28px ${TITRE}`;
    ctx.fillText(MOIS[m].toUpperCase(), x0, y0);
    grilleMois(stats.annee, m).forEach((date, i) => {
      if (!date) return;
      const x = x0 + (i % 7) * pas;
      const y = y0 + 18 + Math.floor(i / 7) * pas;
      ctx.fillStyle = TEINTES[niveauCase(par[date])];
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, cote, cote, 7) : ctx.rect(x, y, cote, cote);
      ctx.fill();
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = TEXTE;
  ctx.font = `500 36px ${TITRE}`;
  const ligne = [
    stats.meilleureSerieSemaines > 1 ? `${stats.meilleureSerieSemaines} semaines d'affilée` : null,
    stats.meilleurMois != null ? `meilleur mois : ${MOIS[stats.meilleurMois].toLowerCase()}` : null
  ]
    .filter(Boolean)
    .join(" · ");
  if (ligne) ctx.fillText(ligne, LARGEUR / 2, HAUTEUR - 200);
  ctx.fillStyle = OR;
  ctx.font = `700 44px ${TITRE}`;
  ctx.fillText("Coach Neiram", LARGEUR / 2, HAUTEUR - 130);
  ctx.fillStyle = DISCRET;
  ctx.font = `500 ${pied.length > 40 ? 28 : 32}px ${TITRE}`;
  ctx.fillText(pied, LARGEUR / 2, HAUTEUR - 80);
  return canvas;
}
