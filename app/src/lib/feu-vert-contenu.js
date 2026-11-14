/**
 * Feu Vert — contenu du cycle (cohorte 1 : lun. 18 janv. → dim. 28 févr. 2027).
 *
 * GÉNÉRÉ depuis les documents de livraison vendus aux participantes
 * (programme, fiches des 8 gestes, missions et modules mentaux), le
 * 14 novembre 2026, sans réécriture : l'application doit montrer
 * exactement ce que la page de vente promet. Pour modifier un texte,
 * modifier ici ET le document de livraison.
 *
 * `video` : lien de la vidéo de démonstration de chaque geste, vide tant
 * que Marien ne l'a pas tournée (l'écran affiche alors « bientôt »).
 * tests/feu-vert.test.mjs vérifie la forme (8 gestes, 6 semaines, A et B
 * pour les deux parcours, bonus S4-S6, 4 missions, 6 modules).
 */

export const CONTENU_FEU_VERT = {
  "gestes": [
    {
      "id": "squat",
      "numero": 1,
      "nom": "Squat gobelet",
      "objectif": "apprendre à s'asseoir et se relever avec une charge devant soi, dos stable. C'est la base de tous les gestes « jambes ».",
      "miseEnPlace": [
        "Pieds largeur d'épaules ou un peu plus, pointes légèrement ouvertes.",
        "Un haltère tenu verticalement contre la poitrine, coudes sous l'haltère.",
        "Regard devant, à 2-3 m au sol."
      ],
      "pointsCles": [
        "Tu inspires, tu bloques le ventre comme si tu allais tousser, puis tu descends.",
        "Les genoux suivent la direction des pointes de pieds.",
        "Tu descends jusqu'à ce que le haut des cuisses soit à peu près parallèle au sol, ou un peu au-dessus si ton dos commence à s'arrondir.",
        "Tu remontes en poussant le sol avec tout le pied, tu souffles en fin de montée."
      ],
      "erreurs": [
        "Les genoux qui rentrent vers l'intérieur en remontant.",
        "Les talons qui décollent.",
        "Le buste qui plonge vers l'avant et l'haltère qui s'éloigne de la poitrine."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "bas du dos qui garde sa forme du début à la fin (pas d'enroulement visible en bas)."
        },
        {
          "code": "S2",
          "texte": "genoux alignés avec les pieds (pas de bascule vers l'intérieur visible de face ou de 3/4)."
        },
        {
          "code": "S3",
          "texte": "talons au sol pendant toute la répétition."
        },
        {
          "code": "Q1",
          "texte": "profondeur identique sur toutes les répétitions."
        },
        {
          "code": "Q2",
          "texte": "haltère qui reste collé à la poitrine."
        },
        {
          "code": "Q3",
          "texte": "vitesse contrôlée à la descente (environ 2-3 s), sans rebond en bas."
        }
      ],
      "filmer": "angle 3/4 avant (45°), à 2-3 m, téléphone à hauteur de hanche, corps entier dans le cadre, pieds visibles.",
      "facilitee": "squat sur banc (tu t'assois brièvement sur un banc ou un box, puis tu te relèves), sans charge ou avec un haltère léger.",
      "video": ""
    },
    {
      "id": "rdl",
      "numero": 2,
      "nom": "Soulevé de terre jambes tendues (roumain)",
      "objectif": "apprendre à se pencher en avant avec le dos droit en pliant les hanches. C'est le geste qui protège ton dos quand tu ramasses une charge.",
      "miseEnPlace": [
        "Debout, pieds largeur de hanches, un haltère dans chaque main devant les cuisses.",
        "Genoux légèrement fléchis (environ 15-20°) et ils restent ainsi.",
        "Épaules basses, poitrine ouverte."
      ],
      "pointsCles": [
        "Tu pousses les fesses vers l'arrière comme pour fermer une porte avec elles.",
        "Les haltères glissent le long des cuisses, puis des tibias.",
        "Tu t'arrêtes quand tu sens l'arrière des cuisses tirer, ou dès que ton dos voudrait s'arrondir (souvent mi-tibia).",
        "Tu remontes en serrant les fesses, sans te pencher en arrière en haut."
      ],
      "erreurs": [
        "Le dos qui s'arrondit pour aller plus bas.",
        "Les genoux qui se plient de plus en plus (le geste devient un squat).",
        "Les haltères qui partent loin devant les jambes."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "dos plat de la nuque au bassin pendant toute la répétition."
        },
        {
          "code": "S2",
          "texte": "pas d'hyperextension (buste qui part en arrière) en fin de montée."
        },
        {
          "code": "S3",
          "texte": "haltères à moins d'une main des jambes pendant tout le trajet."
        },
        {
          "code": "Q1",
          "texte": "angle des genoux constant (pas de squat qui s'installe)."
        },
        {
          "code": "Q2",
          "texte": "hanches qui reculent nettement à la descente."
        },
        {
          "code": "Q3",
          "texte": "amplitude identique sur toutes les répétitions."
        }
      ],
      "filmer": "profil strict (90°), à 2-3 m, téléphone à hauteur de hanche, de la tête aux pieds.",
      "facilitee": "charnière de hanche avec un bâton (ou un manche de balai) posé le long du dos : 3 points de contact (tête, haut du dos, bas du dos) qui ne doivent pas se décoller. Puis haltères légers.",
      "video": ""
    },
    {
      "id": "rowing",
      "numero": 3,
      "nom": "Rowing haltère (un bras, appui banc)",
      "objectif": "muscler le dos en tirant une charge vers la hanche, dos stable.",
      "miseEnPlace": [
        "Une main et le genou du même côté sur un banc plat, l'autre pied au sol un peu en arrière.",
        "Dos plat, à peu près parallèle au sol.",
        "Haltère dans la main libre, bras tendu sous l'épaule."
      ],
      "pointsCles": [
        "Tu tires le coude vers la hanche (le coude passe près du corps).",
        "Tu marques 1 s en haut, l'omoplate rapprochée de la colonne.",
        "Tu redescends en 2 s, bras tendu, épaule qui « s'allonge » un peu vers le sol.",
        "Le buste ne tourne pas : les épaules restent parallèles au banc."
      ],
      "erreurs": [
        "Le buste qui pivote pour aider à monter la charge.",
        "Le coude qui part vers l'extérieur (on tire vers l'aisselle au lieu de la hanche).",
        "L'épaule qui remonte vers l'oreille."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "dos plat, pas de creux ni d'arrondi visible."
        },
        {
          "code": "S2",
          "texte": "buste qui ne tourne pas de plus de quelques degrés pendant la montée."
        },
        {
          "code": "Q1",
          "texte": "coude qui finit à hauteur du buste ou légèrement au-dessus, près du corps."
        },
        {
          "code": "Q2",
          "texte": "pause visible en haut."
        },
        {
          "code": "Q3",
          "texte": "descente contrôlée jusqu'au bras tendu à chaque répétition."
        }
      ],
      "filmer": "3/4 arrière du côté du bras qui tire, à 2 m, téléphone à hauteur du banc.",
      "facilitee": "rowing poitrine appuyée sur un banc incliné (deux haltères, le banc porte ton buste) : le dos n'a plus à se stabiliser seul.",
      "video": ""
    },
    {
      "id": "developpe",
      "numero": 4,
      "nom": "Développé haltères (banc plat)",
      "objectif": "muscler la poitrine, les épaules et l'arrière des bras en poussant, épaules protégées.",
      "miseEnPlace": [
        "Allongée sur un banc plat, pieds au sol, fesses et omoplates sur le banc.",
        "Haltères posés sur les cuisses, puis amenés à hauteur de poitrine en t'allongeant (mise en place montrée dans la vidéo de démonstration et au live 2).",
        "Omoplates serrées et basses, comme si tu les rangeais dans tes poches arrière."
      ],
      "pointsCles": [
        "Coudes à environ 45° du buste (ni collés, ni ouverts à 90°).",
        "Tu descends jusqu'à ce que les haltères soient à hauteur de poitrine, avant-bras verticaux.",
        "Tu pousses vers le haut en souffle, les haltères se rapprochent un peu en haut sans s'entrechoquer.",
        "Les fesses restent sur le banc."
      ],
      "erreurs": [
        "Les coudes ouverts à 90° (bras en T).",
        "Les fesses qui décollent du banc.",
        "Les haltères qui descendent de façon asymétrique (un côté plus bas)."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "fesses en contact avec le banc sur toutes les répétitions."
        },
        {
          "code": "S2",
          "texte": "avant-bras proches de la verticale en bas du mouvement."
        },
        {
          "code": "S3",
          "texte": "poignets droits (pas cassés vers l'arrière)."
        },
        {
          "code": "Q1",
          "texte": "angle des coudes autour de 45°."
        },
        {
          "code": "Q2",
          "texte": "les deux haltères à la même hauteur."
        },
        {
          "code": "Q3",
          "texte": "descente en 2-3 s, sans rebond."
        }
      ],
      "filmer": "depuis le pied du banc, en léger surplomb (téléphone posé sur un support ou une marche, à 1,5-2 m), pour voir les deux bras. Option : profil pour la profondeur.",
      "facilitee": "développé au sol (floor press) : le sol limite l'amplitude et rend la mise en place plus simple. Ou pompes inclinées mains sur un banc.",
      "video": ""
    },
    {
      "id": "fente",
      "numero": 5,
      "nom": "Fente (fente arrière)",
      "objectif": "travailler une jambe à la fois et l'équilibre. Utile pour monter des escaliers, porter un enfant, se relever du sol.",
      "miseEnPlace": [
        "Debout, pieds largeur de hanches, un haltère dans chaque main le long du corps (ou sans charge).",
        "Regard devant."
      ],
      "pointsCles": [
        "Tu recules un pied d'un grand pas, tu poses l'avant du pied.",
        "Tu descends à la verticale : le genou arrière va vers le sol sans le toucher.",
        "Le genou avant reste au-dessus du pied avant, dans l'axe des orteils.",
        "Tu remontes en poussant dans le talon du pied avant et tu ramènes le pied arrière."
      ],
      "erreurs": [
        "Le genou avant qui rentre vers l'intérieur.",
        "Le pas trop court : le talon avant décolle.",
        "Le buste qui bascule fort vers l'avant ou sur le côté."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "genou avant aligné avec le pied avant (pas de bascule intérieure visible de face)."
        },
        {
          "code": "S2",
          "texte": "talon avant au sol pendant toute la descente et la remontée."
        },
        {
          "code": "Q1",
          "texte": "buste à peu près vertical (légère inclinaison acceptée)."
        },
        {
          "code": "Q2",
          "texte": "genou arrière qui arrive à quelques centimètres du sol."
        },
        {
          "code": "Q3",
          "texte": "retour à la position debout stable, sans pas de rattrapage."
        }
      ],
      "filmer": "de face à 2-3 m pour l'alignement du genou, téléphone à hauteur de hanche. Si tu n'as qu'une prise : 3/4 avant.",
      "facilitee": "fente statique (pieds déjà écartés, tu montes et descends sur place) en tenant un support (poteau, rack) d'une main.",
      "video": ""
    },
    {
      "id": "gainage",
      "numero": 6,
      "nom": "Gainage (planche ventrale)",
      "objectif": "apprendre à tenir le tronc solide. C'est ce que tu fais au début de chaque autre geste quand tu « bloques le ventre ».",
      "miseEnPlace": [
        "Avant-bras au sol, coudes sous les épaules.",
        "Pieds écartés largeur de hanches, jambes tendues.",
        "Le corps forme une ligne de la tête aux talons."
      ],
      "pointsCles": [
        "Tu serres les fesses et tu rentres légèrement le bassin (comme pour effacer le creux du bas du dos).",
        "Tu pousses le sol avec les avant-bras, le haut du dos ne se creuse pas entre les omoplates.",
        "Tu respires calmement, sans bloquer l'air.",
        "Tu arrêtes la série dès que la ligne casse, même si le chrono n'est pas fini."
      ],
      "erreurs": [
        "Le bassin qui s'affaisse (creux dans le bas du dos).",
        "Les fesses trop hautes (corps en V).",
        "L'apnée."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "pas de creux visible dans le bas du dos."
        },
        {
          "code": "Q1",
          "texte": "ligne épaule-hanche-cheville droite (ni V, ni affaissement)."
        },
        {
          "code": "Q2",
          "texte": "respiration visible (épaules et ventre qui bougent légèrement, pas d'apnée)."
        },
        {
          "code": "Q3",
          "texte": "position tenue sans changement sur toute la durée annoncée."
        }
      ],
      "filmer": "profil strict, téléphone posé au sol à 1,5-2 m.",
      "facilitee": "planche sur les genoux, ou planche mains sur un banc (corps incliné).",
      "video": ""
    },
    {
      "id": "tirage",
      "numero": 7,
      "nom": "Tirage vertical à la poulie (tirage poitrine)",
      "objectif": "muscler le dos et apprendre à abaisser les épaules en tirant, première étape vers la traction.",
      "miseEnPlace": [
        "Assise face à la machine, cuisses calées sous les boudins (réglés pour que tu ne décolles pas).",
        "Barre saisie un peu plus large que les épaules, paumes vers l'avant.",
        "Buste légèrement incliné en arrière (10-20°), poitrine ouverte."
      ],
      "pointsCles": [
        "Tu commences par descendre les épaules (sans plier les bras).",
        "Tu tires la barre vers le haut de la poitrine, coudes vers le bas et vers les côtes.",
        "Tu remontes en 2 s jusqu'aux bras presque tendus.",
        "Le buste garde la même inclinaison du début à la fin."
      ],
      "erreurs": [
        "Se balancer en arrière pour amener la barre.",
        "Tirer la barre derrière la nuque.",
        "Les épaules qui remontent vers les oreilles."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "barre tirée devant le visage, jamais derrière la nuque."
        },
        {
          "code": "S2",
          "texte": "inclinaison du buste qui varie de moins de 15° pendant la répétition (pas de balancier)."
        },
        {
          "code": "Q1",
          "texte": "barre qui arrive entre le menton et le haut de la poitrine."
        },
        {
          "code": "Q2",
          "texte": "épaules basses en fin de tirage."
        },
        {
          "code": "Q3",
          "texte": "remontée contrôlée jusqu'aux bras presque tendus."
        }
      ],
      "filmer": "3/4 arrière à 2 m, téléphone à hauteur d'épaules si possible (posé sur une machine voisine libre). Profil accepté.",
      "facilitee": "tirage avec un élastique accroché en hauteur, à genoux, ou charge minimale de la machine avec un temps de 3 s à la remontée.",
      "video": ""
    },
    {
      "id": "hipthrust",
      "numero": 8,
      "nom": "Hip thrust (dos appuyé sur un banc)",
      "objectif": "muscler les fessiers en poussant les hanches vers le haut, bas du dos protégé.",
      "miseEnPlace": [
        "Le bas des omoplates appuyé contre le bord d'un banc stable (calé contre un mur ou une machine).",
        "Pieds à plat, largeur de hanches, à une distance telle que les tibias soient verticaux en haut du mouvement.",
        "Charge (haltère ou barre avec manchon de mousse) posée sur le pli de la hanche."
      ],
      "pointsCles": [
        "Menton légèrement rentré, regard vers l'avant (pas vers le plafond).",
        "Tu pousses dans les talons et tu montes les hanches jusqu'à l'alignement épaules-hanches-genoux.",
        "Tu serres les fesses 1 s en haut, sans creuser le bas du dos.",
        "Tu redescends en 2 s."
      ],
      "erreurs": [
        "Creuser le bas du dos en haut au lieu de finir avec les fesses.",
        "Pieds trop loin (on sent l'arrière des cuisses) ou trop près (on sent les cuisses avant).",
        "Le banc qui glisse."
      ],
      "criteres": [
        {
          "code": "S1",
          "texte": "banc stable (aucun déplacement visible)."
        },
        {
          "code": "S2",
          "texte": "pas d'hyperextension du bas du dos en haut (cage thoracique qui reste « fermée », côtes qui ne pointent pas vers le plafond)."
        },
        {
          "code": "Q1",
          "texte": "tibias verticaux en haut."
        },
        {
          "code": "Q2",
          "texte": "alignement épaules-hanches-genoux atteint à chaque répétition."
        },
        {
          "code": "Q3",
          "texte": "pause visible en haut."
        }
      ],
      "filmer": "profil strict, téléphone au sol ou sur un support bas, à 2 m.",
      "facilitee": "pont fessier au sol (dos au sol, pas de banc), sans charge puis avec un haltère sur les hanches.",
      "video": ""
    }
  ],
  "semaines": [
    {
      "numero": 1,
      "titre": "Point de départ",
      "dates": "18-24 janv.",
      "mission": "Mission 1 : heure creuse",
      "objectif": "découvrir les 8 gestes, trouver tes charges de départ, filmer tes premiers essais (2 vidéos : 1 geste de A, 1 geste de B, celui qui t'inquiète le plus). Tous les gestes sont rouges. En parcours Reprise, le temps gagné sur les séries sert à chercher tes charges, relire les fiches et te filmer : la séance reste à 45 min.",
      "A": [
        {
          "geste": "squat",
          "libelle": "Squat gobelet (ou squat sur banc)",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": "rdl",
          "libelle": "Soulevé de terre roumain (ou charnière au bâton)",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": "rowing",
          "libelle": "Rowing haltère (ou poitrine appuyée)",
          "reprise": "2 × 10 / bras",
          "basesplus": "3 × 10 / bras",
          "repos": "60 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": "developpe",
          "libelle": "Développé haltères (ou au sol)",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": null,
          "libelle": "Complément : marche du fermier (2 haltères, 20-30 m)",
          "reprise": "2 allers-retours",
          "basesplus": "3 allers-retours",
          "repos": "60 s",
          "consigne": "effort 5"
        }
      ],
      "B": [
        {
          "geste": "fente",
          "libelle": "Fente arrière (ou fente statique avec appui)",
          "reprise": "2 × 8 / jambe",
          "basesplus": "3 × 8 / jambe",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": "hipthrust",
          "libelle": "Hip thrust (ou pont fessier au sol)",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": "tirage",
          "libelle": "Tirage poulie",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5"
        },
        {
          "geste": "gainage",
          "libelle": "Gainage planche (ou sur genoux)",
          "reprise": "2 × 20 s",
          "basesplus": "3 × 30 s",
          "repos": "45 s",
          "consigne": "respiration calme"
        },
        {
          "geste": null,
          "libelle": "Complément : pompes inclinées mains sur banc",
          "reprise": "2 × 8",
          "basesplus": "2 × 10",
          "repos": "60 s",
          "consigne": "effort 5"
        }
      ],
      "bonus": null
    },
    {
      "numero": 2,
      "titre": "Gestes 1 à 4",
      "dates": "25-31 janv.",
      "mission": "Mission 1 à refaire si besoin",
      "objectif": "appliquer les premières corrections. Tes 2 vidéos de la semaine portent en priorité sur les gestes 1 à 4. Charges bloquées sur tous les gestes non verts.",
      "A": [
        {
          "geste": "squat",
          "libelle": "Squat gobelet",
          "reprise": "3 × 10",
          "basesplus": "3 × 10-12",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": "rdl",
          "libelle": "Soulevé de terre roumain",
          "reprise": "3 × 10",
          "basesplus": "3 × 10-12",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": "rowing",
          "libelle": "Rowing haltère",
          "reprise": "3 × 10 / bras",
          "basesplus": "3 × 10-12 / bras",
          "repos": "60 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": "developpe",
          "libelle": "Développé haltères",
          "reprise": "3 × 10",
          "basesplus": "3 × 10-12",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": null,
          "libelle": "Complément : marche du fermier",
          "reprise": "2 allers-retours",
          "basesplus": "3 allers-retours",
          "repos": "60 s",
          "consigne": "effort 6"
        }
      ],
      "B": [
        {
          "geste": "fente",
          "libelle": "Fente arrière",
          "reprise": "2 × 8 / jambe",
          "basesplus": "3 × 8-10 / jambe",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": "hipthrust",
          "libelle": "Hip thrust",
          "reprise": "3 × 10",
          "basesplus": "3 × 10-12",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": "tirage",
          "libelle": "Tirage poulie",
          "reprise": "3 × 10",
          "basesplus": "3 × 10-12",
          "repos": "90 s",
          "consigne": "3-1-1 · effort 5-6"
        },
        {
          "geste": "gainage",
          "libelle": "Gainage planche",
          "reprise": "3 × 20 s",
          "basesplus": "3 × 30 s",
          "repos": "45 s",
          "consigne": "respiration calme"
        },
        {
          "geste": null,
          "libelle": "Complément : pompes inclinées",
          "reprise": "2 × 8",
          "basesplus": "2 × 10",
          "repos": "60 s",
          "consigne": "effort 6"
        }
      ],
      "bonus": null
    },
    {
      "numero": 3,
      "titre": "Gestes 5 à 8",
      "dates": "1-7 févr.",
      "mission": "Mission 2 : zone principale",
      "objectif": "vidéos en priorité sur les gestes 5 à 8. Tu fais tes séances dans l'espace haltères (mission 2).",
      "A": [
        {
          "geste": "squat",
          "libelle": "Squat gobelet",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "rouge/orange 3-1-1 · vert 2-1-1 · effort 6 (B+ : 6-7)"
        },
        {
          "geste": "rdl",
          "libelle": "Soulevé de terre roumain",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "rowing",
          "libelle": "Rowing haltère",
          "reprise": "3 × 10-12 / bras",
          "basesplus": "3 × 8-12 / bras",
          "repos": "60 s",
          "consigne": "idem"
        },
        {
          "geste": "developpe",
          "libelle": "Développé haltères",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": null,
          "libelle": "Complément : marche du fermier",
          "reprise": "3 allers-retours",
          "basesplus": "3 allers-retours",
          "repos": "60 s",
          "consigne": "effort 6"
        }
      ],
      "B": [
        {
          "geste": "fente",
          "libelle": "Fente arrière",
          "reprise": "3 × 8 / jambe",
          "basesplus": "3 × 8-10 / jambe",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "hipthrust",
          "libelle": "Hip thrust",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "tirage",
          "libelle": "Tirage poulie",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "gainage",
          "libelle": "Gainage planche",
          "reprise": "3 × 25 s",
          "basesplus": "3 × 35 s",
          "repos": "45 s",
          "consigne": "respiration calme"
        },
        {
          "geste": null,
          "libelle": "Complément : pompes inclinées",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "60 s",
          "consigne": "effort 6"
        }
      ],
      "bonus": null
    },
    {
      "numero": 4,
      "titre": "Premiers verts",
      "dates": "8-14 févr.",
      "mission": "Mission 3 : demander un poste",
      "objectif": "la règle de progression s'applique aux gestes verts. Vidéos : les gestes orange les plus proches du vert. Séance bonus n° 1 possible.",
      "A": [
        {
          "geste": "squat",
          "libelle": "Squat gobelet",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "rouge/orange 3-1-1 · vert 2-1-1 · effort 6-7 (B+ : 7)"
        },
        {
          "geste": "rdl",
          "libelle": "Soulevé de terre roumain",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "rowing",
          "libelle": "Rowing haltère",
          "reprise": "3 × 10-12 / bras",
          "basesplus": "3 × 8-12 / bras",
          "repos": "60 s",
          "consigne": "idem"
        },
        {
          "geste": "developpe",
          "libelle": "Développé haltères",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": null,
          "libelle": "Complément : marche du fermier",
          "reprise": "3 allers-retours",
          "basesplus": "3 allers-retours",
          "repos": "60 s",
          "consigne": "effort 6-7"
        }
      ],
      "B": [
        {
          "geste": "fente",
          "libelle": "Fente arrière",
          "reprise": "3 × 10 / jambe",
          "basesplus": "3 × 8-12 / jambe",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "hipthrust",
          "libelle": "Hip thrust",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "tirage",
          "libelle": "Tirage poulie",
          "reprise": "3 × 10-12",
          "basesplus": "3 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "gainage",
          "libelle": "Gainage planche",
          "reprise": "3 × 30 s",
          "basesplus": "3 × 40 s",
          "repos": "45 s",
          "consigne": "respiration calme"
        },
        {
          "geste": null,
          "libelle": "Complément : pompes inclinées",
          "reprise": "2 × 10",
          "basesplus": "3 × 10-12",
          "repos": "60 s",
          "consigne": "effort 6-7"
        }
      ],
      "bonus": {
        "titre": "Séance bonus (facultative, 45 min)",
        "blocs": [
          {
            "bloc": "Échauffement standard",
            "reprise": "8 min",
            "basesplus": "8 min"
          },
          {
            "bloc": "Circuit : squat gobelet → rowing haltère → hip thrust → gainage (charges habituelles, 10 répétitions ou 30 s, 60 s de pause entre deux exercices)",
            "reprise": "2 tours",
            "basesplus": "3 tours"
          },
          {
            "bloc": "Cardio au choix (vélo, rameur, marche inclinée), effort 5-6",
            "reprise": "12 min",
            "basesplus": "10 min"
          },
          {
            "bloc": "Retour au calme",
            "reprise": "5 min",
            "basesplus": "5 min"
          }
        ]
      }
    },
    {
      "numero": 5,
      "titre": "Consolidation",
      "dates": "15-21 févr.",
      "mission": "Mission 4 : heure pleine",
      "objectif": "les gestes encore orange ont la priorité des corrections. Sur les gestes verts, la dernière série peut aller jusqu'à effort 8 (jamais au-delà). Séance bonus n° 2 possible.",
      "A": [
        {
          "geste": "squat",
          "libelle": "Squat gobelet",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "rouge/orange 3-1-1 effort 6-7 · vert 2-1-1 effort 7 (dernière série 8)"
        },
        {
          "geste": "rdl",
          "libelle": "Soulevé de terre roumain",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "rowing",
          "libelle": "Rowing haltère",
          "reprise": "3 × 10-12 / bras",
          "basesplus": "4 × 8-12 / bras",
          "repos": "60 s",
          "consigne": "idem"
        },
        {
          "geste": "developpe",
          "libelle": "Développé haltères",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": null,
          "libelle": "Complément : marche du fermier",
          "reprise": "3 allers-retours",
          "basesplus": "4 allers-retours",
          "repos": "60 s",
          "consigne": "effort 7"
        }
      ],
      "B": [
        {
          "geste": "fente",
          "libelle": "Fente arrière",
          "reprise": "3 × 10 / jambe",
          "basesplus": "3 × 8-12 / jambe",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "hipthrust",
          "libelle": "Hip thrust",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "tirage",
          "libelle": "Tirage poulie",
          "reprise": "3 × 10-12",
          "basesplus": "4 × 8-12",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "gainage",
          "libelle": "Gainage planche",
          "reprise": "3 × 30 s",
          "basesplus": "3 × 45 s",
          "repos": "45 s",
          "consigne": "respiration calme"
        },
        {
          "geste": null,
          "libelle": "Complément : pompes inclinées",
          "reprise": "3 × 10",
          "basesplus": "3 × 10-12",
          "repos": "60 s",
          "consigne": "effort 7"
        }
      ],
      "bonus": {
        "titre": "Séance bonus (facultative, 45 min)",
        "blocs": [
          {
            "bloc": "Échauffement standard",
            "reprise": "8 min",
            "basesplus": "8 min"
          },
          {
            "bloc": "Circuit : soulevé de terre roumain → développé haltères → fente arrière → tirage poulie (charges habituelles, 10 répétitions, 60 s de pause entre deux exercices)",
            "reprise": "2 tours",
            "basesplus": "3 tours"
          },
          {
            "bloc": "Cardio au choix, effort 5-6",
            "reprise": "12 min",
            "basesplus": "10 min"
          },
          {
            "bloc": "Retour au calme",
            "reprise": "5 min",
            "basesplus": "5 min"
          }
        ]
      }
    },
    {
      "numero": 6,
      "titre": "Bilan",
      "dates": "22-28 févr.",
      "mission": "Rattrapage des missions non validées",
      "objectif": "volume réduit, technique propre, vidéo de fin sur les 2 gestes de ton choix (tes 2 corrections de la semaine). Pas de nouvelle augmentation de charge cette semaine.",
      "A": [
        {
          "geste": "squat",
          "libelle": "Squat gobelet",
          "reprise": "3 × 10",
          "basesplus": "3 × 8-10",
          "repos": "90 s",
          "consigne": "tempo selon statut · effort 6 (B+ : 6-7)"
        },
        {
          "geste": "rdl",
          "libelle": "Soulevé de terre roumain",
          "reprise": "3 × 10",
          "basesplus": "3 × 8-10",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "rowing",
          "libelle": "Rowing haltère",
          "reprise": "3 × 10 / bras",
          "basesplus": "3 × 8-10 / bras",
          "repos": "60 s",
          "consigne": "idem"
        },
        {
          "geste": "developpe",
          "libelle": "Développé haltères",
          "reprise": "3 × 10",
          "basesplus": "3 × 8-10",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": null,
          "libelle": "Complément : marche du fermier",
          "reprise": "2 allers-retours",
          "basesplus": "3 allers-retours",
          "repos": "60 s",
          "consigne": "effort 6"
        }
      ],
      "B": [
        {
          "geste": "fente",
          "libelle": "Fente arrière",
          "reprise": "3 × 8 / jambe",
          "basesplus": "3 × 8-10 / jambe",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "hipthrust",
          "libelle": "Hip thrust",
          "reprise": "3 × 10",
          "basesplus": "3 × 8-10",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "tirage",
          "libelle": "Tirage poulie",
          "reprise": "3 × 10",
          "basesplus": "3 × 8-10",
          "repos": "90 s",
          "consigne": "idem"
        },
        {
          "geste": "gainage",
          "libelle": "Gainage planche",
          "reprise": "3 × 25 s",
          "basesplus": "3 × 40 s",
          "repos": "45 s",
          "consigne": "respiration calme"
        },
        {
          "geste": null,
          "libelle": "Complément : pompes inclinées",
          "reprise": "2 × 10",
          "basesplus": "3 × 10",
          "repos": "60 s",
          "consigne": "effort 6"
        }
      ],
      "bonus": {
        "titre": "Séance bonus (facultative, 45 min) — Séance libre Feu Vert",
        "texte": "Tu construis ta séance toi-même, comme tu le feras après le cycle : échauffement standard, 4 gestes (2 de A + 2 de B, tes gestes verts en priorité), 3 séries chacun à effort 6-7, 10 min de cardio, retour au calme. Tu la postes dans ton check-in du lundi 1er mars : Marien te dit si l'équilibre est bon (au live de bilan ou en réponse au check-in)."
      }
    }
  ],
  "alternatives": [
    {
      "geste": "Squat gobelet (banc pour version facilitée)",
      "alt1": "Squat gobelet avec un kettlebell",
      "alt2": "Squat sur box/step au poids du corps, tempo 4-1-1"
    },
    {
      "geste": "Soulevé de terre roumain",
      "alt1": "Avec un kettlebell tenu à deux mains",
      "alt2": "Avec une barre légère prémontée (râtelier des barres fixes)"
    },
    {
      "geste": "Rowing haltère (banc occupé)",
      "alt1": "Rowing poitrine appuyée sur banc incliné",
      "alt2": "Rowing à la poulie basse assis (ou machine de rowing guidée)"
    },
    {
      "geste": "Développé haltères (banc occupé)",
      "alt1": "Développé au sol (floor press) sur un tapis",
      "alt2": "Pompes inclinées mains sur une barre de Smith machine ou un banc"
    },
    {
      "geste": "Fente arrière",
      "alt1": "Fente arrière au poids du corps, tempo 3-1-1",
      "alt2": "Montée sur banc/step (step-up), 1 jambe à la fois"
    },
    {
      "geste": "Gainage planche",
      "alt1": "Planche mains sur un banc",
      "alt2": "« Dead bug » (sur le dos, bras et jambe opposés qui s'allongent)"
    },
    {
      "geste": "Tirage poulie",
      "alt1": "Machine de tirage vertical guidée (convergente)",
      "alt2": "Tirage élastique fixé en hauteur, à genoux"
    },
    {
      "geste": "Hip thrust (banc ou barre occupés)",
      "alt1": "Machine hip thrust / fessiers (si présente dans ta salle)",
      "alt2": "Pont fessier au sol avec un haltère sur les hanches"
    },
    {
      "geste": "Marche du fermier",
      "alt1": "Tenue statique de 2 haltères, 30 s",
      "alt2": "Kettlebell d'un seul côté, aller-retour, puis changer de main"
    }
  ],
  "missions": [
    {
      "numero": 1,
      "titre": "Heure creuse",
      "semaines": "S1, rattrapage S2",
      "but": "faire une séance complète dans une salle calme pour apprendre les lieux sans pression.",
      "etapes": [
        "Avant la séance, regarde l'affluence de ta salle (appli Fitness Park ou équivalent, ou demande à l'accueil quelles heures sont calmes). En général : début d'après-midi, ou après 21 h.",
        "Repère sur place, avant de commencer : où sont les haltères, les bancs plats, la poulie de tirage, les tapis.",
        "Fais ta séance A ou B en entier, dans l'ordre, sans sauter d'exercice.",
        "Note dans l'application les charges utilisées."
      ],
      "critere": "1 séance complète (tous les exercices) réalisée en heure creuse cette semaine.",
      "planB": "si tu ne peux vraiment pas venir en heure creuse (horaires de travail), choisis le créneau le moins rempli que tu as, et fais au moins les 4 gestes principaux. Signale-le dans ton check-in : la mission compte comme validée."
    },
    {
      "numero": 2,
      "titre": "Zone principale",
      "semaines": "S3",
      "but": "t'installer dans l'espace haltères et bancs, là où s'entraînent les habitués, au lieu de rester en périphérie.",
      "etapes": [
        "Avant la séance, fais le module 3 (film mental) une fois chez toi.",
        "Choisis ton emplacement en arrivant : un banc ou un coin de tapis dans l'espace haltères.",
        "Fais au moins 3 des 4 gestes principaux de ta séance à cet emplacement, sans changer de zone.",
        "Range tes haltères sur le râtelier à la fin (ça fait partie de la mission : tu agis comme n'importe quel habitué)."
      ],
      "critere": "au moins 3 gestes principaux réalisés dans la zone haltères, au cours d'une même séance.",
      "planB": "si la zone est bondée à ton arrivée, commence par l'échauffement ailleurs, puis entre dans la zone pour ton 2e exercice. Si c'est encore trop, valide une version réduite : 1 geste complet dans la zone. Tu reprends la version complète la semaine suivante."
    },
    {
      "numero": 3,
      "titre": "Demander un poste",
      "semaines": "S4",
      "but": "oser adresser la parole à un autre adhérent pour partager ou récupérer un équipement.",
      "etapes": [
        "Prépare ta phrase (module 4), par exemple : « Excuse-moi, tu en as pour longtemps ? » ou « On peut alterner entre nos séries ? »",
        "En séance, repère un poste dont tu as besoin (banc, poulie, paire d'haltères) occupé par quelqu'un.",
        "Attends qu'il ou elle soit en récupération (pas au milieu d'une série, et sans écouteurs si possible).",
        "Pose ta question. Quelle que soit la réponse, remercie et applique : tu alternes, tu attends, ou tu passes à l'alternative du programme."
      ],
      "critere": "tu as posé la question une fois. La réponse de l'autre personne ne compte pas.",
      "planB": "si personne n'occupe un poste dont tu as besoin, pose une autre question utile à un adhérent ou à un membre du staff : « Où se range ce poids ? », « Ce banc est libre ? ». Elle valide la mission."
    },
    {
      "numero": 4,
      "titre": "Heure pleine",
      "semaines": "S5",
      "but": "faire une séance complète quand la salle est fréquentée (souvent 18 h-20 h en semaine).",
      "etapes": [
        "Choisis ton créneau à l'avance et note-le (module 1 : « Mardi à 18 h 30, je fais ma séance A »).",
        "Prépare tes alternatives avant de partir (tableau « machine occupée » du programme).",
        "Sur place, fais ta routine avant chaque série (module 5).",
        "Fais la séance complète. Si un poste est pris, applique la mission 3 ou l'alternative."
      ],
      "critere": "1 séance complète (tous les exercices, alternatives acceptées) réalisée à une heure fréquentée.",
      "planB": "si la séance complète est trop, fais-en la moitié (2 gestes + complément) en heure pleine, puis termine en heure creuse un autre jour. La mission reste à refaire en S6 pour être validée en entier."
    }
  ],
  "modules": [
    {
      "numero": 1,
      "titre": "Ton plan « si… alors… »",
      "semaine": 1,
      "pourquoi": "décider à l'avance quand, où et quoi faire augmente les chances de passer à l'action. On appelle ça des « intentions de mise en œuvre ».",
      "exercice": "Exercice (à écrire dans l'application)",
      "etapes": [
        "Écris tes 2 séances de la semaine sous cette forme : « Si c'est [jour] à [heure], alors je vais à [salle] faire ma séance [A/B]. »",
        "Écris ton obstacle le plus probable et ta réponse : « Si [je rentre fatiguée du travail], alors [je mets mes affaires dans la voiture le matin et je pars directement]. »",
        "Ajoute la mission : « Si c'est [jour] à [heure creuse], alors je fais ma séance complète en heure creuse. »"
      ],
      "complement": [],
      "lien": "Lien avec la mission 1 : ton créneau d'heure creuse est écrit, avec une heure précise."
    },
    {
      "numero": 2,
      "titre": "La respiration qui calme",
      "semaine": 2,
      "pourquoi": "une expiration plus longue que l'inspiration est un moyen simple de faire redescendre la tension avant ou entre deux séries.",
      "exercice": "Exercice",
      "etapes": [
        "Assise ou debout, une main sur le ventre.",
        "Inspire par le nez en comptant jusqu'à 4, le ventre se gonfle.",
        "Expire par la bouche, lèvres un peu serrées, en comptant jusqu'à 6.",
        "6 cycles (environ 1 minute).",
        "Entraîne-toi chez toi 1 fois par jour cette semaine, puis utilise-la en salle : en arrivant dans le vestiaire, et à la fin de chaque séance (retour au calme)."
      ],
      "complement": [],
      "lien": "Lien avec la mission 1 : si tu refais la mission 1, tu fais la respiration en entrant dans la salle avant ton échauffement."
    },
    {
      "numero": 3,
      "titre": "Le film mental",
      "semaine": 3,
      "pourquoi": "se représenter mentalement une situation, avec les détails réels, prépare à la vivre. Les sportifs l'utilisent avant les compétitions.",
      "exercice": "Exercice (yeux fermés, 3 min)",
      "etapes": [
        "Imagine-toi en tenue, à l'entrée de ta salle, à l'heure où tu iras. Vois l'éclairage, entends la musique.",
        "Tu marches jusqu'à l'espace haltères. Tu choisis ton banc. Tu poses ta bouteille et ton téléphone.",
        "Tu prends tes haltères sur le râtelier, tu fais ta série d'approche, puis ta première série de squat gobelet. Ressens les appuis, la respiration, le ventre bloqué.",
        "Quelqu'un passe à côté. Tu continues ta série, regard fixé à 2-3 m au sol.",
        "Tu reposes les haltères. Tu fais ta respiration (module 2)."
      ],
      "complement": [
        "Fais-le 2 fois cette semaine, dont 1 fois le jour de la mission."
      ],
      "lien": "Lien avec la mission 2 : tu as déjà « vécu » la zone principale une fois avant d'y entrer."
    },
    {
      "numero": 4,
      "titre": "Répondre à la petite voix",
      "semaine": 4,
      "pourquoi": "les pensées automatiques (« tout le monde va me regarder ») ne sont pas des faits. Les examiner et les remplacer par une phrase plus juste aide à agir malgré l'inconfort.",
      "exercice": "Exercice (à écrire)",
      "etapes": [
        "La pensée : écris la phrase exacte qui te vient quand tu imagines demander un poste. Exemple : « Il va me trouver ridicule. »",
        "Les faits : qu'est-ce qui la confirme ? Qu'est-ce qui la contredit ? Exemple : « En salle, les gens se demandent des postes tout le temps. Moi-même, je ne juge pas quelqu'un qui me le demande. »",
        "La phrase de remplacement, réaliste (pas forcément positive) : « C'est une question banale. Au pire il dit non et je fais l'alternative. »",
        "Ton script : écris la phrase exacte que tu diras en salle. Répète-la 3 fois à voix haute."
      ],
      "complement": [],
      "lien": "Lien avec la mission 3 : tu arrives avec ta phrase prête et ta réponse à la petite voix."
    },
    {
      "numero": 5,
      "titre": "Ta routine avant chaque série",
      "semaine": 5,
      "pourquoi": "porter ton attention sur ce que tu fais (le geste) plutôt que sur ce qui se passe autour réduit les distractions. Une routine courte et identique avant chaque série t'y aide.",
      "exercice": "Exercice : construis ta routine en 3 temps (10 secondes)",
      "etapes": [
        "Respire : 1 expiration longue (module 2).",
        "Place-toi : 1 point clé de ta fiche technique, toujours le même pour un geste (ex. squat : « pieds ancrés »).",
        "Mot-clé : 1 mot que tu te dis avant de démarrer (ex. « Go », « Solide », « Calme »)."
      ],
      "complement": [
        "Teste-la cette semaine à chaque série de tes 2 séances. Écris dans ton check-in si elle t'a aidée."
      ],
      "lien": "Lien avec la mission 4 : en heure pleine, ta routine te sert de bulle avant chaque série."
    },
    {
      "numero": 6,
      "titre": "Ton carnet de preuves et ta suite",
      "semaine": 6,
      "pourquoi": "se rappeler ce qu'on a réellement réussi aide à garder confiance quand la motivation baisse.",
      "exercice": "Exercice (à écrire)",
      "etapes": [
        "Tes preuves : liste 5 choses que tu fais maintenant et que tu ne faisais pas le 18 janvier (gestes au vert, missions validées, une phrase dite à un inconnu en salle…).",
        "Ce qui t'a aidée : entoure les 2 outils que tu gardes (si… alors…, respiration, film mental, réponse à la petite voix, routine).",
        "Ton plan pour les 4 semaines après le cycle : 2 phrases « si… alors… » : tes créneaux, et ta réponse à l'obstacle le plus probable (vacances, fatigue, salle bondée)."
      ],
      "complement": [],
      "lien": "Lien avec les missions : si une mission reste à faire, tu la places dans tes « si… alors… » de la semaine."
    }
  ],
  "avertissementMental": "Les modules sont des exercices d'entraînement mental appliqués au sport. Ils ne remplacent pas un accompagnement psychologique : si l'anxiété t'empêche de vivre normalement en dehors de la salle, parles-en à ton médecin."
};
