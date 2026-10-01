/**
 * Dessin de la carte de progres, au format story (1080 x 1920).
 *
 * Fond noir et or, comme l'application et le logo : la carte doit etre
 * reconnaissable comme « Coach Neiram » au premier coup d'oeil dans un fil
 * Instagram. Les chiffres viennent de lignesCarte() (carte-progres.js).
 *
 * Module navigateur uniquement (canvas) : il est verifie par la fumee
 * fumee-carte-progres.mjs, qui decode l'image produite.
 */

import { COMPTE_INSTAGRAM } from "./carte-progres.js";

export const LARGEUR = 1080;
export const HAUTEUR = 1920;

const OR = "#F8D040";
const FOND = "#0B0B0C";
const TEXTE = "#F5F5F2";
const DISCRET = "#9C9C94";
const TITRE = '"Poppins", "Inter", system-ui, sans-serif';

/** Rectangle aux coins arrondis. */
function rectangleArrondi(ctx, x, y, l, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

/**
 * L'haltere du logo, dessine en vecteurs : l'icone PNG de l'application a
 * son propre fond carre, qui faisait une tache sur le halo dore. Memes
 * proportions que icon-512.png, centrees en (cx, cy), largeur ~ 300 * e.
 */
function dessinerHaltere(ctx, cx, cy, e = 1) {
  ctx.fillStyle = OR;
  const bloc = (x, y, l, h, r) => {
    rectangleArrondi(ctx, cx + x * e, cy + y * e, l * e, h * e, r * e);
    ctx.fill();
  };
  bloc(-146, -42, 36, 84, 14); // disque exterieur gauche
  bloc(-94, -70, 40, 140, 14); // disque interieur gauche
  bloc(-56, -14, 112, 28, 12); // barre
  bloc(54, -70, 40, 140, 14); // disque interieur droit
  bloc(110, -42, 36, 84, 14); // disque exterieur droit
}

/**
 * Dessine la carte et rend le canvas.
 *
 * `lignes` : [{ valeur, libelle }], quatre au plus.
 */
export async function dessinerCarte(lignes) {
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    // Les polices du site doivent etre pretes, sinon le canvas dessine en
    // police systeme et la carte perd son identite.
    try {
      await document.fonts.ready;
    } catch (e) {
      // Pas grave : repli sur la police systeme.
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = LARGEUR;
  canvas.height = HAUTEUR;
  const ctx = canvas.getContext("2d");

  // Fond, et halo dore discret en haut.
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  const halo = ctx.createRadialGradient(LARGEUR / 2, 380, 40, LARGEUR / 2, 380, 760);
  halo.addColorStop(0, "rgba(248,208,64,0.20)");
  halo.addColorStop(1, "rgba(248,208,64,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, LARGEUR, 1100);

  // Logo (haltere) et marque.
  dessinerHaltere(ctx, LARGEUR / 2, 300, 1.25);
  ctx.textAlign = "center";
  ctx.fillStyle = TEXTE;
  ctx.font = `800 76px ${TITRE}`;
  ctx.fillText("COACH NEIRAM", LARGEUR / 2, 520);
  ctx.fillStyle = OR;
  ctx.font = `600 40px ${TITRE}`;
  ctx.fillText("MES PROGRÈS", LARGEUR / 2, 590);

  // Les chiffres, un bloc par ligne.
  // Les blocs sont centres dans l'espace disponible : avec trois chiffres
  // au lieu de quatre, un vide restait en bas de l'image.
  const hauteurBloc = 210;
  const affichees = lignes.slice(0, 4);
  const haut = 660 + ((4 - affichees.length) * (hauteurBloc + 28)) / 2;
  affichees.forEach((l, i) => {
    const y = haut + i * (hauteurBloc + 28);
    rectangleArrondi(ctx, 90, y, LARGEUR - 180, hauteurBloc, 36);
    ctx.fillStyle = "#18181B";
    ctx.fill();
    ctx.strokeStyle = "rgba(248,208,64,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = OR;
    ctx.font = `800 104px ${TITRE}`;
    ctx.fillText(String(l.valeur), LARGEUR / 2, y + 112);
    ctx.fillStyle = TEXTE;
    ctx.font = `500 42px ${TITRE}`;
    ctx.fillText(String(l.libelle), LARGEUR / 2, y + 172);
  });

  // Pied : compte Instagram et promesse.
  ctx.fillStyle = OR;
  ctx.font = `700 48px ${TITRE}`;
  ctx.fillText(COMPTE_INSTAGRAM, LARGEUR / 2, HAUTEUR - 170);
  ctx.fillStyle = DISCRET;
  ctx.font = `500 34px ${TITRE}`;
  ctx.fillText("Coaching sportif · Clermont-Ferrand & en ligne", LARGEUR / 2, HAUTEUR - 110);

  return canvas;
}

/** Le canvas en fichier PNG. */
export function canvasEnPng(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image-impossible"))), "image/png")
  );
}
