# Améliorations à traiter après la bascule

Ce fichier existe pour une raison précise : pendant la migration, tout ce
qui ressemble à une amélioration est **écarté**, pas appliqué.

Mélanger migration et correction rendrait impossible de dire, devant un
écran inattendu, si c'est un bug de portage ou un changement voulu. Chaque
point ci-dessous a donc été identifié, vérifié, puis **volontairement
laissé en l'état**.

À reprendre une fois la phase 8 terminée et stabilisée.

---

## 1. Doublons dans la recherche d'aliments

**Constat.** 82 aliments apparaissent deux fois, sous deux codes distincts
(`cn-fr-pomme-golden` et `cn-f-apple-golden` par exemple). Le client qui
cherche « pomme » voit chaque variété en double.

**Gravité.** Faible. 81 des 82 doublons ont des valeurs nutritionnelles
strictement identiques : c'est du bruit d'affichage, pas une erreur de
données.

**Une exception à traiter :** « café au lait » existe à 30 kcal et à
35 kcal selon le doublon.

**Piste.** Dédoublonner sur le nom normalisé en plus du code, ou fusionner
les deux séries d'identifiants.

---

## 2. Ligne « Huile » qui déborde dans les équivalences

**Constat.** Dans Repas → Aliments → Équivalences → Lipides, la ligne
« Huile » affiche un texte trop long (« 10 g huile = 12 g beurre = 30 g
crème fraîche ») qui déborde à droite, et son libellé « (1 CàS = 10 g) »
se retrouve écrasé sur cinq lignes d'un caractère.

**Gravité.** Cosmétique, mais visible et présent en production.

**Piste.** Autoriser le retour à la ligne sur la valeur, ou raccourcir le
libellé.

---

## 3. Échec d'export silencieux — ✅ CORRIGÉ le 05/09/2026

**Constat.** Dans Réglages, si l'export de sauvegarde échouait, rien ne
s'affichait. Le client pouvait croire qu'il avait une sauvegarde alors
qu'il n'en avait aucune.

**Gravité.** Réelle. C'était le seul filet du client : il n'existe aucune
copie serveur de ses données.

**Corrigé.** Un message explicite s'affiche désormais, avec l'action à
faire : « L'export a échoué : aucune sauvegarde n'a été créée. Réessaie,
et si ça recommence, libère de la place puis reprends. »

C'est une **divergence assumée** avec l'application d'origine, qui restait
muette. Le silence avait été conservé pendant toute la migration pour ne
pas mélanger portage et amélioration ; la migration étant terminée, la
raison de le garder a disparu. Le test qui verrouillait le silence
verrouille maintenant la divergence.

## 4. Champ « fibres » absent du catalogue

**Constat.** Les aliments ne portent que protéines, glucides et lipides.
Les aliments très riches en fibres (spiruline, psyllium, son) ne peuvent
pas être décrits correctement : leur valeur énergétique publiée ne se
déduit pas de leurs macronutriments.

**Conséquence immédiate.** Deux aliments ont été écartés du catalogue
plutôt que d'y inscrire des valeurs incohérentes.

**Piste.** Ajouter un champ `fiber_100g` et l'exclure du calcul
énergétique.

## Nettoyer l'ancienne application après la bascule (CLEAN-02)

La bascule du 05/09/2026 a mis l'application Vite en production. `index.html`
et ses composants dupliqués (`EntrainementsTabLegacy`) restent dans le dépôt :
ils ne sont plus servis, mais ils sont le chemin de retour en arrière.

À supprimer une fois la bascule stable depuis quelques jours d'usage réel —
pas avant. Tant que personne n'a utilisé la nouvelle version un week-end
complet, le retour en arrière vaut plus que la propreté du dépôt.

## Source GitHub Pages passée sur « GitHub Actions » — 01/10/2026

**Constat.** Jusqu'au 01/10, Settings → Pages → Source était resté sur
« Déployer à partir d'une branche ». Chaque fusion sur `main` lançait deux
publications : la nôtre (workflow « Deploiement ») et celle de GitHub
(« pages build and deployment »), qui publiait la racine du dépôt,
c'est-à-dire l'ancienne application. La dernière à finir l'emportait.

**Preuve (29/09/2026, fusion de la PR #47).** Notre publication s'est
terminée à 09:20:31 UTC
([exécution 36548453052](https://github.com/coachneiram/coach-neiram-app/actions/runs/36548453052)),
celle de GitHub à 09:21:00 UTC
([exécution 36548452134](https://github.com/coachneiram/coach-neiram-app/actions/runs/36548452134)) :
l'ancienne version a été servie (constaté sur le site réel le jour même)
jusqu'à la relance manuelle de 09:51–09:52 UTC
([exécution 36551860410](https://github.com/coachneiram/coach-neiram-app/actions/runs/36551860410)).
La PR #48 a ensuite fait passer notre publication en dernier
(`.github/scripts/attendre-pages-github.sh`).

**Fait.** Réglage passé sur « GitHub Actions » le 01/10 (vérifié par Marien
vers 21h33). Vérification après bascule, relance manuelle du workflow
« Deploiement » sur `main`
([exécution 36915272457](https://github.com/coachneiram/coach-neiram-app/actions/runs/36915272457),
01/10 19:34–19:35 UTC) : workflow vert, étape « Vérifier que la nouvelle
version est en ligne » comprise ; aucune publication « pages build and
deployment » depuis la bascule (la dernière date de 19:27 UTC, avant) ; le
site sert toujours `assets/index-Cn1ag4VM.js`, le build de `main`.

**Limite de cette vérification.** Une relance manuelle ne déclenche jamais
la publication de GitHub, quel que soit le réglage. La preuve définitive
viendra de la prochaine fusion sur `main` : elle ne doit produire aucune
exécution « pages build and deployment ».

**À retirer ensuite, après une semaine de déploiements propres.** L'étape
« Attendre la publication automatique de GitHub » n'aura plus rien à
attendre. Le `index.html` racine n'est plus publié ; il reste seulement le
chemin de retour en arrière (voir CLEAN-02).

**Retour en arrière.** Remettre la source sur « Déployer à partir d'une
branche » (`main`, racine) rétablit la situation d'avant.

## Champ fibres — pas fait, et pourquoi

Le catalogue signale le manque : les graines de chia annoncent 490 kcal alors
que leurs macros n'en donnent que 379. L'ecart, ce sont les fibres, qui ne
sont comptees nulle part.

Ce n'est pas une correction, c'est une fonctionnalite : il faut un champ dans
le journal, dans les fiches d'aliments, dans les objectifs, dans le bilan, et
une valeur pour les 648 aliments du catalogue. A faire dans une passe dediee,
pas en marge d'autre chose.
