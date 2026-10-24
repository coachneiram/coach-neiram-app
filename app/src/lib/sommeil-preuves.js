/**
 * Sommeil et stress : conseils fondés sur les meilleures preuves disponibles
 * (recommandations, méta-analyses, revues parapluie, grands essais), relevés
 * le 24/10/2026. Chaque conseil donne sa source, son niveau de preuve et
 * l'effet mesuré. Rien n'est inventé : quand un chiffre n'a pas pu être
 * vérifié, il n'est pas donné.
 *
 * Volontairement absents :
 *  - la restriction de sommeil en autonomie (composante de la TCC-I qui
 *    doit être encadrée par un professionnel) ;
 *  - les questionnaires ISI et PSS-10 (licence commerciale nécessaire).
 */

export const PREUVES_SOMMEIL_STRESS = [
  {
    id: "S01",
    theme: "sommeil",
    conseil: "Vise au moins 7 h de sommeil par nuit, de façon régulière (8 à 10 h si tu as 16 ou 17 ans).",
    pourquoi: "Dormir moins de 7 h de façon chronique est associé à prise de poids, diabète, HTA, maladies cardiovasculaires, dépression et mortalité accrue.",
    niveau: "modéré (consensus d'experts fondé sur données observationnelles)",
    effet: "NSF : 14-17 ans 8-10 h ; 18-64 ans 7-9 h ; ≥65 ans 7-8 h. AASM/SRS : ≥7 h, pas de limite haute (>9 h possible chez jeunes adultes, dette de sommeil, maladie).",
    sources: ["Watson NF et al. 2015, Sleep 38(6):843-844, doi:10.5665/sleep.4716 (AASM/SRS)", "Hirshkowitz M et al. 2015, Sleep Health 1(1):40-43, doi:10.1016/j.sleh.2014.12.010 (NSF)", "Paruthi S et al. 2016, J Clin Sleep Med 12(6):785-786, doi:10.5664/jcsm.5866 (13-18 ans)"]
  },
  {
    id: "S02",
    theme: "sport",
    conseil: "Protège ta nuit avant les séances et compétitions importantes : une nuit écourtée fait baisser la performance.",
    pourquoi: "La privation aiguë de sommeil dégrade toutes les catégories de performance physique ; les athlètes sont souvent en dessous de 7 h.",
    niveau: "modéré (méta-analyse, forte hétérogénéité I²=98 %, 89 % d'hommes)",
    effet: "-7,56 % de performance en moyenne (IC95 -11,9 à -3,1 %) après perte de sommeil aiguë ; effet plus marqué pour la restriction en fin de nuit.",
    sources: ["Craven J et al. 2022, Sports Med 52(11):2669-2690, doi:10.1007/s40279-022-01706-y (méta-analyse, 69 publications)", "Walsh NP et al. 2021, Br J Sports Med 55(7):356-368, doi:10.1136/bjsports-2020-102025 (consensus d'experts 2021)"]
  },
  {
    id: "S03",
    theme: "sport",
    conseil: "Sportif ? Essaie d'allonger ton temps au lit pendant quelques semaines et observe tes sensations.",
    pourquoi: "Allonger le sommeil a amélioré sprint, adresse, temps de réaction et humeur chez des basketteurs universitaires ; le consensus 2021 recommande d'individualiser le besoin.",
    niveau: "faible (n=11, sans groupe contrôle)",
    effet: "+111 ± 80 min de sommeil/nuit ; sprint 16,2 → 15,5 s ; lancers francs 7,9 → 8,8/10 ; meilleure vigilance (PVT) et humeur (POMS).",
    sources: ["Mah CD et al. 2011, Sleep 34(7):943-950, doi:10.5665/SLEEP.1132", "Walsh NP et al. 2021, Br J Sports Med 55(7):356-368, doi:10.1136/bjsports-2020-102025"]
  },
  {
    id: "S04",
    theme: "sport",
    conseil: "Une sieste en début d'après-midi aide à récupérer, surtout après une nuit courte, sans remplacer la nuit.",
    pourquoi: "Chez des sujets actifs/athlètes, la sieste améliore performance cognitive et physique et réduit la fatigue perçue.",
    niveau: "modéré (ECR, échantillons masculins uniquement)",
    effet: "SMD : performance cognitive +0,69 ; physique +0,99 ; fatigue perçue -0,76. Siestes étudiées entre ~12h30 et 16h50. Durée optimale : non tranchée dans les sources vérifiées.",
    sources: ["Mesas AE et al. 2023, Br J Sports Med 57(7):417-426, doi:10.1136/bjsports-2022-106355 (méta-analyse de 22 ECR, 291 hommes)"]
  },
  {
    id: "S05",
    theme: "insomnie",
    conseil: "Si l'insomnie dure, le traitement de première intention est la thérapie cognitivo-comportementale de l'insomnie (TCC-I), avant les somnifères.",
    pourquoi: "Les trois grandes recommandations (ACP, AASM, Europe) placent la TCC-I en premier, y compris en cas de comorbidités.",
    niveau: "fort",
    effet: "TCC-I = seule intervention « forte » de l'AASM 2021 ; médicament seulement si TCC-I insuffisante.",
    sources: ["Qaseem A et al. 2016, Ann Intern Med 165(2):125-133, doi:10.7326/M15-2175 (recommandation forte, preuves modérées)", "Edinger JD et al. 2021, J Clin Sleep Med 17(2):255-262, doi:10.5664/jcsm.8986 (seule recommandation forte de la guideline)", "Riemann D et al. 2023, J Sleep Res 32(6):e14035, doi:10.1111/jsr.14035 (grade A)"]
  },
  {
    id: "S06",
    theme: "insomnie",
    conseil: "Le lit sert à dormir : va au lit quand tu as sommeil, lève-toi si tu ne dors pas, et garde une heure de lever fixe.",
    pourquoi: "Contrôle du stimulus et restriction du temps au lit sont des composantes actives de la TCC-I ; la restructuration cognitive est la composante la plus efficace.",
    niveau: "modéré à fort",
    effet: "OR incrémental de rémission : restructuration cognitive 1,68 (1,28-2,20) ; restriction ~1,5 (1,04-2,13) ; contrôle du stimulus ~1,4 (1,00-2,05). Hygiène du sommeil non essentielle ; relaxation possiblement contre-productive comme composante. La restriction du sommeil doit être encadrée par un professionnel.",
    sources: ["Furukawa Y et al. 2024, JAMA Psychiatry, doi:10.1001/jamapsychiatry.2023.5060 (méta-analyse en réseau par composantes, 241 essais, 31 452 participants)", "Edinger JD et al. 2021, J Clin Sleep Med 17(2):255-262, doi:10.5664/jcsm.8986 (contrôle du stimulus et restriction : recommandations conditionnelles)"]
  },
  {
    id: "S07",
    theme: "insomnie",
    conseil: "Une TCC-I numérique validée (programme en ligne ou appli) est une option efficace si un thérapeute n'est pas accessible.",
    pourquoi: "La guideline européenne 2023 recommande la TCC-I en présentiel ou en numérique ; les méta-analyses montrent des effets comparables au présentiel.",
    niveau: "fort",
    effet: "Sévérité de l'insomnie vs liste d'attente (version corrigée) : téléconsultation -1,35 ; individuel présentiel -1,30 ; smartphone -1,04 ; internet non guidé -1,01 (grands effets). Zachariae : g 0,21 à 1,09 selon les critères.",
    sources: ["Riemann D et al. 2023, J Sleep Res 32(6):e14035, doi:10.1111/jsr.14035", "Simon L et al. 2023, Sci Rep 13:1929, doi:10.1038/s41598-023-28853-0 (méta-analyse en réseau, 52 ECR ; correctif 2025)", "Zachariae R et al. 2016, Sleep Med Rev 30:1-10, doi:10.1016/j.smrv.2015.10.004 (11 ECR, n=1460)"]
  },
  {
    id: "S08",
    theme: "insomnie",
    conseil: "Les règles d'« hygiène du sommeil » aident en complément, mais seules elles ne suffisent pas à traiter une vraie insomnie.",
    pourquoi: "L'AASM déconseille l'hygiène du sommeil comme traitement unique ; elle est moins efficace que la TCC-I.",
    niveau: "modéré",
    effet: "Petit à moyen effet avant/après, significativement inférieur à la TCC-I, uniquement sur mesures subjectives.",
    sources: ["Edinger JD et al. 2021, J Clin Sleep Med 17(2):255-262, doi:10.5664/jcsm.8986", "Chung KF et al. 2018, Fam Pract 35(4):365-375, doi:10.1093/fampra/cmx122", "Revue systématique 2025, Sleep Med Rev 82:102109, doi:10.1016/j.smrv.2025.102109 (42 ECR)"]
  },
  {
    id: "S09",
    theme: "sommeil",
    conseil: "Garde des heures de coucher, et surtout de lever, régulières, week-end compris.",
    pourquoi: "La régularité du sommeil prédit la mortalité mieux que la durée ; l'irrégularité est associée à une horloge biologique retardée et de moins bons résultats académiques.",
    niveau: "modéré (observationnel)",
    effet: "Quintiles les plus réguliers vs moins réguliers : mortalité toutes causes -20 à -48 %, cancer -16 à -39 %, cardiométabolique -22 à -57 %.",
    sources: ["Windred DP et al. 2024, Sleep 47(1):zsad253, doi:10.1093/sleep/zsad253 (UK Biobank, ~61 000 personnes, actimétrie)", "Phillips AJK et al. 2017, Sci Rep 7:3216, doi:10.1038/s41598-017-03171-4"]
  },
  {
    id: "S10",
    theme: "sommeil",
    conseil: "Beaucoup de lumière le jour (dehors le matin, idéalement), lumières tamisées dans les 3 heures avant le coucher, chambre noire.",
    pourquoi: "La lumière reçue par l'œil règle l'horloge circadienne ; la lumière du soir retarde la mélatonine et l'endormissement.",
    niveau: "modéré",
    effet: "Cibles : jour >250 lux mélanopiques (EDI) ; 3 h avant le coucher <10 lux ; pendant le sommeil <1 lux. Liseuse rétroéclairée 4 h le soir : endormissement ~10 min plus long, mélatonine retardée, moins de REM, moins vigilant le matin.",
    sources: ["Brown TM et al. 2022, PLoS Biol 20(3):e3001571, doi:10.1371/journal.pbio.3001571 (consensus d'experts)", "Chang AM et al. 2015, PNAS 112(4):1232-1237, doi:10.1073/pnas.1418490112 (ECR croisé, n=12)"]
  },
  {
    id: "S11",
    theme: "sommeil",
    conseil: "Arrête la caféine au moins 8 à 9 h avant le coucher (environ 13 h pour un pré-workout très dosé).",
    pourquoi: "La caféine réduit la durée et l'efficacité du sommeil, souvent sans qu'on s'en rende compte.",
    niveau: "modéré",
    effet: "Sommeil total -45 min, efficacité -7 %, endormissement +9 min, éveils +12 min, sommeil profond -11 min. Café 107 mg : ≥8,8 h avant ; pré-workout 217,5 mg : ≥13,2 h. Drake : 400 mg même 6 h avant perturbe le sommeil objectif.",
    sources: ["Gardiner C et al. 2023, Sleep Med Rev 69:101764, doi:10.1016/j.smrv.2023.101764 (méta-analyse, 24 études)", "Drake C et al. 2013, J Clin Sleep Med 9(11):1195-1200, doi:10.5664/jcsm.3170 (n=12)"]
  },
  {
    id: "S12",
    theme: "sommeil",
    conseil: "Évite l'alcool le soir : il aide à s'endormir mais dégrade la suite de la nuit, même à faible dose.",
    pourquoi: "L'alcool retarde et réduit le sommeil paradoxal de façon dose-dépendante ; les personnes ne perçoivent pas cette dégradation.",
    niveau: "modéré",
    effet: "REM perturbé dès ≤0,5 g/kg (~2 verres standard), aggravé avec la dose ; effets sur endormissement/N3 surtout à forte dose (≥0,85 g/kg, ~5 verres).",
    sources: ["Gardiner C et al. 2025, Sleep Med Rev 80:102030, doi:10.1016/j.smrv.2024.102030 (méta-analyse, 27 études)"]
  },
  {
    id: "S13",
    theme: "sommeil",
    conseil: "Évite un repas copieux juste avant de te coucher ; laisse un intervalle entre le dernier repas et le coucher.",
    pourquoi: "Des données suggèrent que manger dans l'heure avant le coucher dégrade la qualité du sommeil, mais il n'existe pas de méta-analyse solide chez l'adulte.",
    niveau: "faible",
    effet: "Pas d'effet chiffré robuste disponible.",
    sources: ["Saidi O et al. 2024, Sleep Med Rev 76:101953 (revue de portée chrononutrition et sommeil)"]
  },
  {
    id: "S14",
    theme: "sommeil",
    conseil: "Bouge régulièrement : l'activité physique régulière améliore la qualité du sommeil.",
    pourquoi: "L'exercice régulier améliore modérément la qualité subjective du sommeil ; l'exercice est un complément recommandé à la TCC-I.",
    niveau: "modéré",
    effet: "Exercice régulier : effet modéré sur la qualité du sommeil, petit à moyen sur la latence, petit sur durée et efficacité. Exercice aigu : petits effets.",
    sources: ["Kredlow MA et al. 2015, J Behav Med 38(3):427-449, doi:10.1007/s10865-015-9617-6 (méta-analyse, 66 études)", "Riemann D et al. 2023, J Sleep Res 32(6):e14035, doi:10.1111/jsr.14035 (exercice en complément, grade B)"]
  },
  {
    id: "S15",
    theme: "sommeil",
    conseil: "Le sport le soir ne gêne pas le sommeil en général ; si la séance est très intense, finis-la au moins 4 h avant le coucher.",
    pourquoi: "Les méta-analyses ne montrent pas d'effet néfaste moyen du sport du soir ; de grosses données de capteurs portés associent les séances intenses tardives à un coucher plus tardif et une FC nocturne plus élevée.",
    niveau: "modéré (Stutz) / faible à modéré (Leota, observationnel, lien d'intérêt avec le fabricant)",
    effet: "Stutz : sommeil lent profond +1,3 point de %, stade 1 -0,9 point. Leota : aucune association si l'exercice se termine ≥4 h avant l'endormissement, quelle que soit l'intensité.",
    sources: ["Stutz J et al. 2019, Sports Med 49(2):269-287, doi:10.1007/s40279-018-1015-0 (méta-analyse)", "Leota J et al. 2025, Nat Commun, doi:10.1038/s41467-025-58271-x (14 689 personnes, 4 millions de nuits, bracelet WHOOP)"]
  },
  {
    id: "S16",
    theme: "sommeil",
    conseil: "Garde une chambre fraîche, et prends si tu veux une douche ou un bain chaud (40 à 42,5 °C) 1 à 2 h avant le coucher.",
    pourquoi: "La baisse de température corporelle centrale favorise l'endormissement ; le réchauffement passif en soirée l'accélère.",
    niveau: "faible à modéré",
    effet: "Bain/douche 40-42,5 °C, 1-2 h avant, même 10 min : endormissement raccourci (~10 min en moyenne). Chez les seniors : efficacité optimale ~20-25 °C (pic 21-23 °C), -5 à -10 % d'efficacité de 25 à 30 °C. Pas de valeur validée pour les jeunes adultes.",
    sources: ["Haghayegh S et al. 2019, Sleep Med Rev 46:124-135, doi:10.1016/j.smrv.2019.04.008 (méta-analyse, 13 études)", "Baniassadi A et al. 2023, Sci Total Environ 899:165623 (50 personnes âgées, ~11 000 nuits)"]
  },
  {
    id: "S17",
    theme: "complements",
    conseil: "Ne prends pas de mélatonine de toi-même pour une insomnie : demande un avis médical.",
    pourquoi: "Les recommandations ne soutiennent pas la mélatonine à libération immédiate pour l'insomnie ; l'ANSES conseille un encadrement médical et l'évitement chez certaines populations.",
    niveau: "fort (contre l'usage en autotraitement)",
    effet: "ANSES : à éviter ou seulement sur avis médical chez femmes enceintes/allaitantes, enfants, maladies inflammatoires/auto-immunes, épilepsie, asthme, troubles de l'humeur ; prise ponctuelle seulement.",
    sources: ["Sateia MJ et al. 2017, J Clin Sleep Med 13(2):307-349, doi:10.5664/jcsm.6470 (recommandation faible contre)", "Riemann D et al. 2023, J Sleep Res 32(6):e14035, doi:10.1111/jsr.14035 (mélatonine LI non recommandée, grade A ; LP possible ≤3 mois si ≥55 ans, grade B)", "ANSES 2018, avis saisine n° 2016-SA-0209 (compléments contenant de la mélatonine)"]
  },
  {
    id: "S18",
    theme: "complements",
    conseil: "Ne compte pas sur le magnésium, la valériane ou les tisanes pour régler un trouble du sommeil : les preuves sont faibles.",
    pourquoi: "Les essais sont peu nombreux et à risque de biais ; les guidelines ne recommandent pas la phytothérapie.",
    niveau: "faible",
    effet: "Magnésium : endormissement -17 min (IC95 -27 à -7), durée de sommeil +16 min non significatif ; preuves de qualité faible à très faible.",
    sources: ["Mah J & Pitre T 2021, BMC Complement Med Ther 21:125, doi:10.1186/s12906-021-03297-z (3 ECR, 151 seniors)", "Sateia MJ et al. 2017, J Clin Sleep Med 13(2):307-349, doi:10.5664/jcsm.6470 (valériane, tryptophane : faible contre)", "Riemann D et al. 2023, J Sleep Res 32(6):e14035 (phytothérapie non recommandée, grade A)"]
  },
  {
    id: "S19",
    theme: "sommeil",
    conseil: "Ta montre ou ton appli de sommeil indique une tendance : ce n'est pas un score à optimiser.",
    pourquoi: "La recherche obsessionnelle d'un « sommeil parfait » d'après un capteur (orthosomnie) peut aggraver l'insomnie, notamment en augmentant le temps passé au lit.",
    niveau: "faible (série de cas)",
    effet: "Pas d'effet chiffré.",
    sources: ["Baron KG et al. 2017, J Clin Sleep Med 13(2):351-354, doi:10.5664/jcsm.6472 (série de cas)"]
  },
  {
    id: "T01",
    theme: "stress",
    conseil: "Bouge au moins 150 min par semaine : marche, vélo, renforcement ou yoga réduisent l'anxiété et la détresse.",
    pourquoi: "L'activité physique a des effets moyens sur dépression, anxiété et détresse, avec les bénéfices les plus importants chez les personnes en bonne santé et pour les intensités plus élevées.",
    niveau: "fort (mais 77 revues de qualité AMSTAR critiquement faible)",
    effet: "Effets médians vs soins habituels : dépression -0,43 ; anxiété -0,42 ; détresse psychologique -0,60. Séances plus intenses = plus d'effet.",
    sources: ["Singh B et al. 2023, Br J Sports Med 57(18):1203-1209, doi:10.1136/bjsports-2022-106195 (umbrella review : 97 revues, 1039 essais, 128 119 participants)"]
  },
  {
    id: "T02",
    theme: "stress",
    conseil: "Essaie un programme de pleine conscience (type MBSR, 8 semaines) ou une pratique guidée chaque jour.",
    pourquoi: "Chez les adultes non malades, la pleine conscience réduit en moyenne détresse, anxiété et dépression, mais pas toujours mieux que d'autres pratiques actives.",
    niveau: "fort à modéré",
    effet: "Détresse psychologique 1-6 mois après vs contrôle passif : SMD -0,32 (IC95 -0,41 à -0,24). Khoury : effet modéré du MBSR sur stress, anxiété, dépression chez sujets sains.",
    sources: ["Galante J et al. 2021, PLoS Med 18(1):e1003481, doi:10.1371/journal.pmed.1003481 (136 ECR, 11 605 participants)", "Khoury B et al. 2015, J Psychosom Res 78(6):519-528, doi:10.1016/j.jpsychores.2015.03.009"]
  },
  {
    id: "T03",
    theme: "stress",
    conseil: "Pratique 5 min par jour de respiration lente à expiration longue, par exemple le soupir cyclique.",
    pourquoi: "Les techniques de respiration réduisent le stress perçu ; le soupir cyclique a augmenté l'affect positif davantage que la méditation dans un ECR.",
    niveau: "modéré (méta-analyse) / faible (ECR unique, non répliqué sur l'humeur)",
    effet: "Fincham : stress g -0,35 ; anxiété g -0,32 ; dépression g -0,40. Balban : plus d'affect positif et fréquence respiratoire plus basse vs méditation ; pas de changement d'anxiété-trait, VFC ou sommeil.",
    sources: ["Fincham GW et al. 2023, Sci Rep 13:432, doi:10.1038/s41598-022-27247-y (méta-analyse, 12 ECR, 785 adultes)", "Balban MY et al. 2023, Cell Rep Med 4(1):100895, doi:10.1016/j.xcrm.2022.100895 (ECR à distance, 1 mois)"]
  },
  {
    id: "T04",
    theme: "stress",
    conseil: "Passe environ 2 h par semaine dans la nature (parc, forêt, bord de mer), en une ou plusieurs fois.",
    pourquoi: "L'exposition aux espaces verts est associée à une meilleure santé perçue et à un cortisol plus bas.",
    niveau: "faible à modéré (surtout observationnel)",
    effet: "≥120 min/sem : OR 1,59 bonne santé et 1,23 bien-être élevé (plateau 200-300 min). Cortisol salivaire : petite baisse significative.",
    sources: ["White MP et al. 2019, Sci Rep 9:7730, doi:10.1038/s41598-019-44097-3 (n=19 806, transversal)", "Twohig-Bennett C & Jones A 2018, Environ Res 166:628-637, doi:10.1016/j.envres.2018.06.030 (méta-analyse, 143 études)"]
  },
  {
    id: "T05",
    theme: "stress",
    conseil: "Entretiens tes liens : vois ou appelle régulièrement tes proches et parle de ce qui te pèse.",
    pourquoi: "La force des relations sociales est associée à une survie nettement meilleure, comparable aux grands facteurs de risque.",
    niveau: "modéré (observationnel)",
    effet: "OR de survie 1,50 (IC95 1,42-1,59) ; 1,91 pour les mesures complexes d'intégration sociale.",
    sources: ["Holt-Lunstad J et al. 2010, PLoS Med 7(7):e1000316, doi:10.1371/journal.pmed.1000316 (148 études, 308 849 participants)"]
  },
  {
    id: "T06",
    theme: "stress",
    conseil: "Si ça t'aide, écris 15 à 20 min sur ce qui te préoccupe (écriture expressive), sans en attendre un grand effet.",
    pourquoi: "L'écriture expressive a un effet faible mais significatif sur dépression, anxiété et stress chez les personnes saines ou subcliniques.",
    niveau: "faible",
    effet: "g = -0,12 (IC95 -0,21 à -0,04) ; Frattaroli r = 0,075.",
    sources: ["Guo L 2023, Br J Clin Psychol, doi:10.1111/bjc.12408 (31 études, n=4012)", "Frattaroli J 2006, Psychol Bull 132(6):823-865 (146 études)"]
  },
  {
    id: "T07",
    theme: "stress",
    conseil: "Le yoga combine mouvement, respiration et relâchement : une bonne option contre le stress.",
    pourquoi: "Le yoga avec postures est associé à une baisse de marqueurs physiologiques du stress (cortisol, fréquence cardiaque) vs contrôles actifs.",
    niveau: "modéré (interventions hétérogènes)",
    effet: "Baisse du cortisol du soir et du réveil vs contrôle actif (valeurs agrégées non vérifiées ici).",
    sources: ["Pascoe MC, Thompson DR, Ski CF 2017, Psychoneuroendocrinology 86:152-168 (méta-analyse, 42 études)", "Pascoe MC & Bauer IE 2015, J Psychiatr Res 68:270-282"]
  },
  {
    id: "T08",
    theme: "stress",
    conseil: "Un programme structuré de gestion du stress basé sur la TCC, en ligne, marche mieux avec un accompagnement.",
    pourquoi: "Les programmes en ligne de gestion du stress réduisent le stress perçu ; ceux avec accompagnement sont environ deux fois plus efficaces.",
    niveau: "modéré",
    effet: "Stress d = 0,43 (0,31-0,54) ; guidé 0,64 vs non guidé 0,33 ; dépression 0,34 ; anxiété 0,32.",
    sources: ["Heber E et al. 2017, J Med Internet Res 19(2):e32, doi:10.2196/jmir.5774 (26 comparaisons, n=4226)"]
  },
  {
    id: "T09",
    theme: "stress",
    conseil: "Fais des pauses des réseaux sociaux (une semaine par exemple) et évite le défilement sans fin, surtout le soir.",
    pourquoi: "Une pause d'une semaine a amélioré bien-être, dépression et anxiété dans un ECR ; la lumière des écrans le soir retarde aussi l'endormissement.",
    niveau: "faible à modéré (ECR unique, suivi 1 semaine)",
    effet: "Amélioration significative du bien-être, de la dépression et de l'anxiété à 1 semaine (ajustée).",
    sources: ["Lambert J et al. 2022, Cyberpsychol Behav Soc Netw 25(5):287-293 (ECR, n=154)", "Chang AM et al. 2015, PNAS 112(4):1232-1237, doi:10.1073/pnas.1418490112"]
  },
  {
    id: "T10",
    theme: "stress",
    conseil: "Mieux dormir est aussi un levier direct contre le stress et l'anxiété.",
    pourquoi: "Les essais qui améliorent le sommeil améliorent la santé mentale, avec une relation dose-réponse.",
    niveau: "fort",
    effet: "Santé mentale globale g -0,53 ; dépression -0,63 ; anxiété -0,51 ; rumination -0,49 ; stress -0,42.",
    sources: ["Scott AJ et al. 2021, Sleep Med Rev 60:101556, doi:10.1016/j.smrv.2021.101556 (65 ECR, n=8608)"]
  },
  {
    id: "T11",
    theme: "stress",
    conseil: "La relaxation musculaire progressive (contracter puis relâcher chaque groupe de muscles) peut faire baisser la tension.",
    pourquoi: "Une revue systématique conclut à une efficacité sur stress, anxiété et dépression, mais sans estimation poolée robuste ; comme composante de la TCC-I elle n'apporte pas de bénéfice démontré.",
    niveau: "faible à modéré",
    effet: "Pas d'effet poolé vérifié.",
    sources: ["Muhammad Khir S et al. 2024, Psychol Res Behav Manag (revue systématique, 46 études, >3402 adultes)", "Furukawa Y et al. 2024, JAMA Psychiatry, doi:10.1001/jamapsychiatry.2023.5060"]
  },
  {
    id: "R01",
    theme: "alerte",
    conseil: "Consulte un médecin si tu dors mal au moins 3 nuits par semaine depuis plus de 3 mois, avec une gêne dans la journée.",
    pourquoi: "C'est la définition de l'insomnie chronique, qui relève d'une évaluation et d'une TCC-I.",
    niveau: "fort (critères diagnostiques)",
    effet: "",
    sources: ["Riemann D et al. 2023, J Sleep Res 32(6):e14035, doi:10.1111/jsr.14035"]
  },
  {
    id: "R02",
    theme: "alerte",
    conseil: "Ronflements forts, pauses respiratoires observées, somnolence au volant : fais le test STOP-Bang et consulte si le score est de 3 ou plus.",
    pourquoi: "L'apnée du sommeil est fréquente, sous-diagnostiquée et ne se traite pas avec des conseils d'hygiène du sommeil.",
    niveau: "fort (outil de dépistage validé)",
    effet: "Score ≥3 : sensibilité 93 % (SAOS modéré-sévère), VPN 90 % ; 0-2 faible risque ; 5-8 haut risque.",
    sources: ["Chung F, Abdullah HR, Liao P 2016, Chest 149(3):631-638, doi:10.1378/chest.15-0903"]
  },
  {
    id: "R03",
    theme: "alerte",
    conseil: "Si la tristesse, la perte d'intérêt ou l'anxiété durent plus de 2 semaines et gênent ta vie, parles-en à ton médecin.",
    pourquoi: "Ces signes peuvent relever d'une dépression ou d'un trouble anxieux nécessitant une prise en charge, au-delà des conseils de bien-être.",
    niveau: "fort (critères cliniques)",
    effet: "",
    sources: ["Critères DSM-5 (épisode dépressif : ≥2 semaines)"]
  },
  {
    id: "R04",
    theme: "alerte",
    conseil: "En cas d'idées suicidaires, pour toi ou un proche, appelle le 3114 (gratuit, 24 h/24, 7 j/7) ; en cas de danger immédiat, le 15 ou le 112.",
    pourquoi: "Le 3114 est le numéro national de prévention du suicide, avec des professionnels de santé formés.",
    niveau: "obligatoire (sécurité)",
    effet: "",
    sources: ["sante.fr — Le numéro national de prévention du suicide : https://www.sante.fr/le-numero-national-de-prevention-du-suicide-0"]
  }
];

export const preuveParId = (id) => PREUVES_SOMMEIL_STRESS.find((p) => p.id === id) || null;

export const THEMES_PREUVES = [
  { id: "sommeil", label: "Mieux dormir" },
  { id: "sport", label: "Sommeil et performance" },
  { id: "insomnie", label: "Insomnie" },
  { id: "complements", label: "Mélatonine et compléments" },
  { id: "stress", label: "Réduire le stress" },
  { id: "alerte", label: "Quand consulter" }
];

/**
 * Textes des cartes « Sommeil et stress » (ui/SommeilStressPreuves.jsx),
 * repris de l'app Neiram le 24/10/2026. Dans l'app coach, tout est inclus :
 * pas de verrou Premium.
 */
export const TEXTES_SOMMEIL_STRESS = {
  respirationTitre: "🌬️ 5 minutes pour souffler",
  respirationIntro:
    "Soupir cyclique : deux inspirations par le nez, une longue expiration par la bouche. 5 minutes par jour réduisent le stress perçu (effet modéré, méta-analyse de 12 essais).",
  respirationBravo: "Bravo, 5 minutes faites. Comment te sens-tu ?",
  arreter: "Arrêter",
  recommencer: "Recommencer",
  commencer: "Commencer (5 min)",
  phases: [
    { texte: "Inspire par le nez", secondes: 2 },
    { texte: "Encore une petite inspiration", secondes: 1 },
    { texte: "Expire lentement par la bouche", secondes: 6 }
  ],
  alertesTitre: "Quand en parler à un médecin",
  alerteNuits:
    "Tes nuits sont difficiles plus de 3 fois par semaine depuis 4 semaines : si ça continue, la thérapie cognitivo-comportementale de l'insomnie (TCC-I) est le traitement recommandé en premier, avant les somnifères.",
  alerteStress: "Ton stress est très élevé depuis 2 semaines.",
  alerteCoach: "Ton coach est prévenu : il pourra adapter ton programme.",
  alertesSans:
    "Mauvaises nuits 3 fois par semaine depuis des mois, ronflements forts ou somnolence au volant, tristesse ou anxiété plus de 2 semaines : parles-en à ton médecin.",
  numero3114: "Idées suicidaires, pour toi ou un proche :",
  numero3114Suite: ", gratuit, 24 h/24. Danger immédiat : 15 ou 112.",
  regulariteTitre: "Régularité de ton sommeil",
  regulariteVide: "Note ton heure de lever au moins 5 fois en 2 semaines (Journal) pour voir ta régularité.",
  regularite: (ecartMin, nuits) => [`Ton heure de lever varie de `, `± ${ecartMin} min`, ` (${nuits} levers notés sur 14 jours).`],
  regulariteIrreguliere:
    "C'est irrégulier : vise un lever à heure fixe, à 30 min près, même le week-end. Les dormeurs les plus réguliers ont une mortalité de 20 à 48 % plus basse que les moins réguliers (étude d'observation, Windred 2024).",
  regulariteBonne: "Bonne régularité : c'est l'un des meilleurs leviers pour un sommeil réparateur. Continue.",
  bibliothequeTitre: "📚 Ce que disent les études",
  effet: "Effet mesuré : ",
  niveau: "Niveau de preuve : ",
  sources: "Sources : "
};

/** Respiration guidee : 5 minutes. */
export const DUREE_RESPIRATION_S = 5 * 60;
