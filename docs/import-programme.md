# Importer son programme (photo, PDF, dictée)

Ajouté le 29 octobre 2026, en plus de l'import depuis le Google Sheets (`ImportSeancesSheets.jsx`, inchangé).

- **Écran** : Séances → carte « Importer mon programme » → `ecrans/ImporterProgramme.jsx`. Saisie (photos, PDF, texte ou voix), lecture par l'IA, vérification (séances à garder, noms corrigeables), enregistrement en séances types. Rien n'est enregistré sans le geste final.
- **Lecture** : `lib/import-programme.js`. Le document est une donnée : la consigne ordonne d'ignorer toute instruction qu'il contient, et la lecture ne garde que des champs connus, bornés (14 séances, 20 exercices, 6 pages, PDF ≤ 4,4 Mo, total ≤ 7,5 Mo).
- **Version sans blocs** : cette app n'a pas de blocs (WOD, AMRAP...). Un circuit devient une suite d'exercices (tours en « séries »). Notes et repos du document vont dans la description de la séance.
- **Worker** (`worker/coach-neiram-proxy.js`) : champ facultatif `fonction: "programme"` — seul cas où `application/pdf` est accepté, 8 192 jetons de sortie (4 096 ailleurs), 5 lectures par jour et par client. **À recoller dans Cloudflare** pour que l'import fonctionne.
- **Consentement** : texte mis à jour (PDF et programme), `VERSION` 2 : l'accord est redemandé une fois. Aucune page de confidentialité dans ce dépôt à mettre à jour.
- **Non vérifié** : la lecture réelle par Gemini (le navigateur simule la réponse de l'IA).
