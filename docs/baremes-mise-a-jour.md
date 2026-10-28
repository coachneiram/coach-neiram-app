# Barèmes officiels : veille et mise à jour

Dernière mise à jour de ce document : 28 octobre 2026.

## Ce que fait la veille

Chaque lundi à 6 h 17 (7 h 17 l'été, heure de Paris), le workflow `Veille des barèmes`
(`.github/workflows/baremes.yml`) lance `scripts-donnees/verifier-sources.mjs`.
Il compare le registre des sources (`app/src/lib/sources-baremes.js`) :

1. **au calendrier** : l'échéance de chaque jeu de données, sans réseau ;
2. **aux documents connus** : un fichier modifié après la date de relevé, ou
   qui n'est plus à son adresse ;
3. **aux pages de la fédération** : un lien vers un document qui ressemble à
   un barème et qu'on ne connaît pas ;
4. **aux adresses devinées de la prochaine édition** (par exemple
   `livret_2027_running.pdf`), dès que l'échéance approche.

Le script **ne modifie aucune donnée**. S'il y a quelque chose à faire, ou si
un site n'a pas pu être consulté, il ouvre une demande GitHub **« Barèmes
officiels à vérifier »** (une seule, mise à jour sur place, étiquette
`baremes`). Quand il n'y a plus rien, il la referme. Tu peux aussi le lancer à
la main : onglet Actions → « Veille des barèmes » → Run workflow.

Pourquoi une demande et pas une mise à jour automatique : un parseur qui lit
mal un PDF afficherait un faux « niveau officiel » à un compétiteur, sans que
personne ne le voie. Une demande demande cinq minutes de vérification ; un
barème faux peut coûter une qualification manquée.

## Les sources et leur calendrier

| Jeu de données | Fédération | Saison actuelle | À revoir |
|---|---|---|---|
| Niveaux de force athlétique | FFForce | 2025-2026 (V03-1) | chaque mois (publications sans calendrier fixe) |
| Catégories IPF, coefficients GL | IPF | 2026 | fin 2026 |
| Séries d'haltérophilie | FFHM | 2026-2027 | 90 jours avant le 31/08/2027 (parution habituelle : juillet) |
| Catégories de poids IWF | IWF | cycle 2028 | chaque année |
| Coefficients Sinclair | IWF | 2025-2028 | fin 2028 |
| Barème des niveaux (IA à D7) | FFA | 2010 | chaque année |
| Minima des championnats de France | FFA | 2025-2026 | fin 2026 (livret annuel) |
| Records du monde sur route | World Athletics | ratifiés | tous les 90 jours |
| Qualifications France Élite et Challenge | FFN | 2026 | fin 2026 (règlements annuels, parus en septembre) |
| Temps de base des points | World Aquatics | 2026 | fin 2026 (50 m : 31/12 ; 25 m : 31/08/2027) |

Les dates de fin sont **supposées** quand la fédération n'en donne pas :
chaque source dit sur quoi repose sa date (`echeanceNote` dans le registre),
toujours au plus tôt plausible. Une fausse alerte coûte une vérification ; une
alerte tardive laisse un barème périmé.

## Quand la demande s'ouvre

1. Lis le rapport dans la demande : chaque case décrit une action (« nouvelle
   édition trouvée », « document modifié », « échéance passée »…).
2. Ouvre la page ou le document de la fédération indiqué.
3. **Rien n'a changé** (la fédération n'a pas publié) : dans
   `app/src/lib/sources-baremes.js`, mets `releveLe` à la date du jour pour
   cette source. Si la fin de saison supposée était fausse, corrige aussi
   `echeance` et `echeanceNote`.
4. **Une nouvelle édition existe** : demande-moi « mets à jour les barèmes
   {fédération} ». Je relève les valeurs, je mets à jour le fichier de
   données, la saison et la date de relevé dans le registre, puis je lance
   `node --test tests/*.test.mjs`. La demande se referme à la vérification
   suivante.

## Ce qui protège contre une faute de relevé

`tests/baremes-integrite.test.mjs` contrôle à chaque envoi que les grilles sont
cohérentes : les seuils montent dans l'ordre des niveaux, aucune catégorie de
poids ne manque, les colonnes Europe et Monde ne sont vides que là où la
fédération n'en a pas, le temps des hommes est plus rapide que celui des
femmes, un record du monde bat le meilleur niveau du barème. Il ne prouve pas
que les valeurs sont celles de la fédération, il prouve qu'elles sont
cohérentes entre elles.

## Ce que voit le client

Sous « Ton niveau » (Mes performances, Force athlétique), une ligne dit d'où
viennent les barèmes : « Barèmes relevés le 24/10/2026 : FFForce 2025-2026
(V03-1) et IPF 2026. » Quand l'échéance d'une source est passée sans que le
relevé ait été renouvelé, une seconde ligne ajoute : « Une nouvelle édition a
pu paraître depuis… Avant une compétition, vérifie sur le site de la
fédération. » L'app n'affirme jamais qu'une édition existe : elle dit que la
saison est finie.

## Limites connues (au 28 octobre 2026)

- Les sites des fédérations ne sont pas joignables depuis l'environnement où
  le contrôleur a été écrit. Le calendrier, les tests et la logique de
  détection sont vérifiés ; **la première lecture réelle des sites est celle du
  premier lundi** (ou d'un lancement à la main). Si un site bloque GitHub, la
  demande l'indique sous « Non vérifiés ».
- Aucun parseur de PDF : la veille détecte qu'un document est nouveau ou
  modifié, elle n'en lit pas les valeurs.
- Les pages suivies sont celles que le code cite déjà. La FFN et la FFHM n'ont
  pas de page de liste connue : leur détection repose sur le document de
  l'année, l'adresse devinée et le calendrier.
- Sur un dépôt public, GitHub désactive les workflows planifiés après 60 jours
  sans aucune activité ; il écrit alors au propriétaire, qui peut les réactiver
  (onglet Actions).
