import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Ecrit assets-manifest.json : la liste des fichiers construits, avec leur
 * empreinte.
 *
 * Le service worker en a besoin pour mettre l'application en cache a
 * l'installation. Il ne peut pas deviner ces noms : ils changent a chaque
 * construction. Sans ce manifeste, le premier lancement hors ligne
 * afficherait une page blanche — sans erreur, sans message, et sans que
 * rien dans la suite de tests ne le signale.
 */
function manifesteDesAssets() {
  return {
    name: "manifeste-des-assets",
    apply: "build",
    writeBundle(options, bundle) {
      const fichiers = Object.keys(bundle)
        .filter((nom) => /\.(js|css)$/.test(nom))
        .map((nom) => "./" + nom)
        .sort();
      writeFileSync(join(options.dir, "assets-manifest.json"), JSON.stringify(fichiers, null, 2));
    }
  };
}

// base: "./" produit des chemins relatifs dans le build.
// C'est ce qui permet a l'application de fonctionner aussi bien a la racine
// d'un domaine que dans un sous-dossier — le cas de GitHub Pages, qui sert
// le site depuis /coach-neiram-app/.
export default defineConfig({
  base: "./",
  plugins: [react(), manifesteDesAssets()],
  build: {
    outDir: "dist",
    // Un rapport clair sur ce qui pese lourd, utile quand on migrera les
    // ecrans un par un depuis un fichier de 450 Ko.
    reportCompressedSize: true
  }
});
