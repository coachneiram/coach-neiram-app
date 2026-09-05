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

## 3. Échec d'export silencieux

**Constat.** Dans Réglages, si l'export de sauvegarde échoue, rien ne
s'affiche. Le client peut croire qu'il a une sauvegarde alors qu'il n'en a
aucune.

**Gravité.** Réelle. C'est le seul filet du client : il n'existe aucune
copie serveur de ses données.

**Piste.** Afficher un message d'échec explicite. Le portage a
délibérément conservé le comportement d'origine, et un test verrouille ce
choix pour qu'il reste conscient.

---

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

## Champ fibres — pas fait, et pourquoi

Le catalogue signale le manque : les graines de chia annoncent 490 kcal alors
que leurs macros n'en donnent que 379. L'ecart, ce sont les fibres, qui ne
sont comptees nulle part.

Ce n'est pas une correction, c'est une fonctionnalite : il faut un champ dans
le journal, dans les fiches d'aliments, dans les objectifs, dans le bilan, et
une valeur pour les 648 aliments du catalogue. A faire dans une passe dediee,
pas en marge d'autre chose.
