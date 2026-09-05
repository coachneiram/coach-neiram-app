# Message aux clients — phase de test

Trois versions selon le canal. Le fond est le même : dire ce qui change,
dire ce qui ne change pas, et demander un retour *précis*.

Le point le plus important est le troisième paragraphe. Un client à qui on
demande « dis-moi si ça marche » répond « oui super » et on n'apprend rien.
Un client à qui on demande trois choses concrètes répond utilement.

---

## Version WhatsApp (à envoyer tel quel)

Salut 👋

J'ai passé l'application au propre cette semaine. Elle a été entièrement
reconstruite derrière, mais **tu ne devrais voir aucune différence** : mêmes
écrans, mêmes chiffres, mêmes données. Rien n'est à réinstaller, et ton
historique est intact.

Si tu l'as sur ton écran d'accueil, elle s'ouvre exactement pareil. Le mode
hors ligne fonctionne toujours (utile en salle quand ça capte mal).

**Ce que j'aimerais que tu regardes ces prochains jours :**

1. **Tes données sont-elles bien toutes là ?** Ton poids, tes mensurations,
   tes séances, tes repas des dernières semaines — jette un œil à Tendances
   et à ton Journal.
2. **Y a-t-il un endroit où un chiffre te paraît différent d'avant ?**
   Calories, macros, score du jour, records. Même une petite différence
   m'intéresse.
3. **Est-ce que quelque chose est plus lent, ou bug ?** Surtout au moment
   d'ajouter un aliment ou d'enregistrer une séance.

Si tu vois quoi que ce soit d'anormal, **envoie-moi une capture d'écran** —
c'est ce qui m'aide le plus. Et si tout va bien, dis-le moi aussi, ça compte
autant.

Merci 💪

---

## Version courte (SMS, story, message groupé)

Salut ! L'application a été reconstruite cette semaine. Normalement tu ne
vois aucune différence et toutes tes données sont là. Rien à réinstaller.

Peux-tu me confirmer ces 3 points d'ici quelques jours ?
1. Tes données sont bien toutes là (poids, séances, repas)
2. Aucun chiffre ne te paraît différent d'avant
3. Rien ne bugue quand tu ajoutes un aliment ou une séance

Une capture d'écran si quelque chose cloche. Merci 💪

---

## Version longue (mail, ou clients qui aiment comprendre)

Salut,

Petit point sur l'application.

**Ce qui a changé.** J'ai fait reconstruire l'application de fond en comble.
Jusqu'ici elle tenait dans un seul gros fichier, ce qui la rendait risquée à
faire évoluer : la moindre modification pouvait casser autre chose sans que
je m'en aperçoive. Elle est maintenant découpée proprement, et près de 700
vérifications automatiques tournent avant chaque mise en ligne. Concrètement,
je peux enfin ajouter des choses sans craindre de casser ton suivi.

**Ce qui ne change pas.** Tout le reste. Mêmes écrans, mêmes calculs, mêmes
données, même adresse. Ton historique est intact — rien n'a été déplacé ni
recalculé. Tu n'as rien à réinstaller ni à reconfigurer.

**Ce que j'aimerais que tu vérifies.** J'ai testé tout ce que je pouvais,
mais rien ne remplace un usage réel avec de vraies données :

1. **Tes données** — poids, mensurations, séances, repas des dernières
   semaines. Va faire un tour dans Tendances et dans ton Journal.
2. **Tes chiffres** — calories, macros, score du jour, records. Est-ce que
   quelque chose te paraît différent d'avant ? Même un écart minime
   m'intéresse.
3. **Le confort d'usage** — ajout d'un aliment, enregistrement d'une séance,
   mode hors ligne en salle. Quelque chose est-il plus lent, ou bloque ?

Une capture d'écran vaut dix explications, n'hésite pas.

Et si tout fonctionne normalement, dis-le moi quand même : savoir que ça
tourne bien chez toi m'est aussi utile que de savoir que ça bugue.

Merci de ton aide,
Marien

---

## Paragraphe à ajouter SI tu fusionnes aussi le changement de macros

À insérer juste avant « Ce que j'aimerais que tu regardes ». Sans lui, un
client verra ses macros bouger et te le signalera comme un bug.

> **Une précision : j'ai aussi ajusté la répartition de tes macros.** Tes
> calories ne changent pas d'un gramme — c'est la répartition entre
> protéines, glucides et lipides qui bouge, et seulement chez certains
> d'entre vous. Deux corrections : un minimum de lipides pour ne pas
> descendre trop bas (ça concerne surtout les profils légers en perte de
> poids), et des protéines calculées plus justement pour ceux qui sont
> encore loin de leur objectif de poids. Si tes macros ont changé, c'est
> voulu — et si tu as une question là-dessus, demande-moi.

Avec ce paragraphe, un changement de macros devient une information, pas une
alerte. **Le nombre de calories, lui, ne bouge pour personne** : c'est le
chiffre le plus regardé, et il reste identique.

---

## Ce qu'il faut surveiller dans les retours

Ces trois retours-là méritent une réaction immédiate :

- **« Il me manque des données »** → le plus grave, et le plus improbable :
  les deux versions lisent le même stockage. Vérifier d'abord que le client
  n'a pas changé de téléphone ou de navigateur.
- **« Le chiffre X a changé »** → demander une capture. Les calculs ont été
  comparés un par un à l'ancienne version, donc un écart réel serait un
  vrai bug. Exception : si tu as fusionné le changement de macros, protéines
  / glucides / lipides peuvent avoir bougé — mais **jamais les calories**.
  Un total calorique différent reste donc un signal à prendre au sérieux.
- **« Page blanche »** → faire fermer et rouvrir l'application. Si ça
  persiste, me le dire : c'est le seul symptôme qui justifierait un retour
  en arrière, et celui-ci prend une minute.

Une remarque du type « c'est plus rapide » ou « je trouve ça plus fluide »
est bon signe, mais ce n'est pas un test : c'est le point 1 qui compte.
