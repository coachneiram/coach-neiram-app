/**
 * Redimensionnement des photos avant envoi a l'IA.
 *
 * Portage de drawToDataUrl et resizeImageFile (index.html 573-642).
 *
 * Une photo d'iPhone fait plusieurs megaoctets. L'envoyer telle quelle a
 * l'IA coute du forfait mobile au client, sature le quota, et n'ameliore
 * rien : le modele n'a pas besoin de 12 megapixels pour reconnaitre une
 * assiette. On la ramene donc a une largeur raisonnable, en JPEG.
 *
 * Deux chemins de decodage, dans cet ordre :
 *
 * 1. createImageBitmap, avec imageOrientation « from-image » — c'est le seul
 *    qui redresse une photo prise en mode portrait a partir de son EXIF.
 * 2. A defaut, un <img> sur une object URL.
 *
 * Le second chemin porte un delai de 20 secondes, parce qu'un <img> a qui on
 * donne un format qu'il ne sait pas lire (un HEIC d'iPhone ouvert depuis un
 * ordinateur) ne declenche parfois ni onload ni onerror : il ne repond
 * jamais. Sans ce delai, le bouton resterait bloque sur « Analyse en
 * cours... » indefiniment.
 */

/**
 * Cote maximal du canvas.
 *
 * Au-dela, Safari sur iOS rend un canvas vide sans lever d'erreur : le
 * plafond n'est pas une optimisation, c'est ce qui evite une photo noire.
 */
const MAX_CANVAS_PX = 4096;

/** Dessine une source deja decodee dans un canvas, et rend un data URL JPEG. */
export function dessinerEnDataUrl(source, sw, sh, maxW, qualite, doc = document) {
  if (!sw || !sh) throw new Error("image-format");

  let echelle = Math.min(1, maxW / sw);
  const plafond = MAX_CANVAS_PX / Math.max(sw, sh);
  if (plafond < echelle) echelle = plafond;

  const w = Math.max(1, Math.round(sw * echelle));
  const h = Math.max(1, Math.round(sh * echelle));

  const canvas = doc.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("image-format");
  ctx.drawImage(source, 0, 0, w, h);

  const sortie = canvas.toDataURL("image/jpeg", qualite);

  // Liberer tout de suite : sur iOS, une poignee de canvas de cette taille
  // suffit a faire recharger l'onglet par manque de memoire.
  canvas.width = 0;
  canvas.height = 0;

  // Un data URL de moins de 64 caracteres n'est pas une image : c'est ce que
  // rend un canvas que le navigateur a refuse de peindre.
  if (!sortie || sortie.length < 64) throw new Error("image-format");
  return sortie;
}

/** Redimensionne un fichier photo choisi par le client. */
export function redimensionnerPhoto(fichier, maxW, qualite, env = window) {
  return new Promise((resolve, reject) => {
    if (!fichier) return reject(new Error("read error"));

    const parBitmap = async () => {
      if (typeof env.createImageBitmap !== "function") throw new Error("no-bitmap");
      let bmp;
      try {
        bmp = await env.createImageBitmap(fichier, { imageOrientation: "from-image" });
      } catch (e) {
        // Les navigateurs qui ignorent l'option refusent l'appel entier.
        bmp = await env.createImageBitmap(fichier);
      }
      try {
        return dessinerEnDataUrl(bmp, bmp.width, bmp.height, maxW, qualite);
      } finally {
        if (bmp && bmp.close) bmp.close();
      }
    };

    const parObjectUrl = () =>
      new Promise((res, rej) => {
        let url = null;
        try {
          url = URL.createObjectURL(fichier);
        } catch (e) {
          return rej(new Error("read error"));
        }
        const img = new env.Image();
        const fini = (fn, arg) => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            // L'URL a deja ete liberee : sans consequence.
          }
          fn(arg);
        };
        const minuteur = setTimeout(() => fini(rej, new Error("image-format")), 20000);
        img.onerror = () => {
          clearTimeout(minuteur);
          fini(rej, new Error("image-format"));
        };
        img.onload = () => {
          clearTimeout(minuteur);
          try {
            fini(
              res,
              dessinerEnDataUrl(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxW, qualite)
            );
          } catch (e) {
            fini(rej, e);
          }
        };
        img.src = url;
      });

    parBitmap()
      .then(resolve)
      .catch(() => parObjectUrl().then(resolve).catch(reject));
  });
}
