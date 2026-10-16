/**
 * Codes d'acces des clients — outil du coach.
 *
 * A lancer sur ton ordinateur (Node 22), jamais dans l'application :
 *
 *   export ADMIN_SECRET='…'      (le meme que dans Cloudflare)
 *   node worker/invitations.mjs creer "Thomas B."     → nouveau client + code
 *   node worker/invitations.mjs code <id-client>      → nouveau code (nouveau telephone)
 *   node worker/invitations.mjs liste                 → clients, jetons actifs
 *   node worker/invitations.mjs revoquer <id-client>  → coupe tous ses acces
 *
 * Le code (8 caracteres, ex. K7PM-Q4XT) est a usage unique et valable
 * 30 jours. Envoie-le au client par WhatsApp : il le saisit dans
 * Reglages → Accès de ton coach.
 *
 * Un libelle court suffit (prenom + initiale) : c'est lui qui apparait dans
 * ton classeur « Suivi Coaching en ligne ». Pas de nom complet, pas de
 * telephone.
 */

import { PROXY_BASE_URL } from "../app/src/lib/config.js";

export async function commande(args, { secret, fetch: f = globalThis.fetch, base = PROXY_BASE_URL } = {}) {
  const [action, valeur] = args;
  const appeler = async (chemin, corps) => {
    const r = await f(base + chemin, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret },
      body: JSON.stringify(corps)
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(`refus du proxy (${r.status}) : ${d.error || "réponse illisible"}`);
    return d;
  };

  if (!secret) throw new Error("ADMIN_SECRET manquant : export ADMIN_SECRET='…' avant de lancer l'outil.");
  if (action === "creer" && valeur) {
    const d = await appeler("/admin/invitations", { libelle: valeur });
    return `Client « ${d.libelle} » (id ${d.client})\nCode : ${d.code}  — valable jusqu'au ${d.expireLe.slice(0, 10)}, usage unique.`;
  }
  if (action === "code" && valeur) {
    const d = await appeler("/admin/invitations", { client: valeur });
    return `Nouveau code pour « ${d.libelle} » : ${d.code}  — valable jusqu'au ${d.expireLe.slice(0, 10)}.`;
  }
  if (action === "liste") {
    const d = await appeler("/admin/clients", {});
    if (!d.clients.length) return "Aucun client.";
    return d.clients
      .map((c) => `${c.id}  ${c.libelle.padEnd(20)} ${c.revoque_le ? "RÉVOQUÉ" : c.jetons + " téléphone(s) actif(s)"}`)
      .join("\n");
  }
  if (action === "revoquer" && valeur) {
    await appeler("/admin/revoquer", { client: valeur });
    return `Accès de ${valeur} révoqués : ses téléphones ne peuvent plus utiliser l'IA ni envoyer au coach.`;
  }
  throw new Error('Usage : node worker/invitations.mjs creer "Prénom I." | code <id> | liste | revoquer <id>');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(await commande(process.argv.slice(2), { secret: process.env.ADMIN_SECRET }));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
