import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" produit des chemins relatifs dans le build.
// C'est ce qui permet a l'application de fonctionner aussi bien a la racine
// d'un domaine que dans un sous-dossier — le cas de GitHub Pages, qui sert
// le site depuis /coach-neiram-app/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    // Un rapport clair sur ce qui pese lourd, utile quand on migrera les
    // ecrans un par un depuis un fichier de 450 Ko.
    reportCompressedSize: true
  }
});
