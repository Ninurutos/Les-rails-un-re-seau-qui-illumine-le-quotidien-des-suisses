# Les rails, un réseau qui illumine le quotidien des suisses

## Description et présentation des données pour la réalisation de la visualisation :

Je me suis procuré l'intégralité de mes données ferroviaires sur https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020. 
C'est un portail officiel suisse Open Data concernant les transports publics. Il s'agit de la plateforme nationale de référence pour la mobilité en Suisse.
Je me suis servi principalement de 5 de ces fichiers mais je les ai tous ajouté à ce dossier car je n'étais pas sûr du quel j'allais avoir besoin ou non au cours de la réalisation de cette visualisation. 
Ces données sont sous forme de fichiers .txt et mettent en évidence séparément une variété de données GTFS relatives aux transports ferroviaires.
La General Transit Feed Specification, également connue sous le nom de GTFS, est un format de données standardisé qui fournit une structure pour que les agences de transport en commun décrivent les informations de leurs services tels que les horaires, les arrêts, les tarifs, etc...

Pour ce qui est de l'alignement des données des rails avec l'image de la frontière suisse, j'ai utilisé un lien en provenance d'un github qui charge directement une carte Switzerland GeoJSON des frontières et lacs suisses. 
Il est disponible et mis en open access ici : https://raw.githubusercontent.com/ZHB/switzerland-geojson/master/country/switzerland.geojson 

## Explication des étapes de pré-traitement : 

Ces données étaient très bien organisées et nettoyées (puisqu'elles sont officielles), mais si riches et si denses qu'il m'a fallu les trier.
J'ai donc réduit un maximum le nombre d'informations a séléctionner pour obtenir un JSON suffisamment précis pour ce que je souhaitais mais pas non plus trop volumineux.
J'ai annoté les différentes étapes réalisées au fur et à mesure lors de la fusion de ces différents fichiers en un seul fichier "rails_suisse.json" dans fusion.py.

## Explication de la visualisation produite : 

Cette visualisation représente le quotidien actif des suisses et la fréquence de passage des différents rails du réseau ferroviaire.
Cette fréquence se caractèrise dans mes données par le nombre de passages de ce train au courant de l'année 2026 (prévue). J'ai décidé de mettre la Suisse au premier plan à l'aide d'une carte geoJSON délimitant ses frontières pour plusieurs raisons.
La première raison est que cela permet de remarquer que les grandes villes sont effectivement souvent liées à une augmentation du nombre de trains passant, et la deuxième est purement visuelle car le contraste de la carte GeoJSON et les couleurs vives met en évidence certains éléments comme le fait qu'il y ait peu de rails dans certaines zones.
Ces zones d'ombres seraient potentiellement une piste à explorer pour optimiser la mobilité Suisse ou encore exprime les difficultés géographiques du terrain suisse plutôt montagnieux.
Le choix des couleurs s'est fait par une volonté de vouloir clairement distinguer les rails avec le fond sombre de la carte. Il était nécessaire de procéder à des choix d'interface tels que celui de griser les rails lors de l'utilisation de l'algorithme de recherche.
Le choix du jaune, vert et rouge pour l'affiche des différents segments de trajet de l'algorithme provient du fait qu'elles se distinguaient efficacement entre elles. De plus ma visualisation est une carte interactive, ce qui me semblait le plus technique et intéressant à réaliser en vue de ma demande à 4 crédits pour ce cours.
J'ai énormément appris en terme de code et de traitement de données. Je souhaitais initalement permettre de scroller à l'aide d'un slider entre les différentes années pour voir les différences, cependant la taille déjà conséquente des fichiers pour seulement l'année 2026 m'a fait comprendre que ce n'était pas optimal.
J'ai alors choisi de favoriser l'interactivité au travers de deux aspects, celui tout d'abord d'un algorithme de recherche qui permet de mêler le beau à l'utile. La pratique des transports en commun nous touche tous plus ou moins de loin et me semblait pertinente (surtout dans un cadre universitaire).
Puis j'ai voulu également mettre un accent sur la possibilité de glisser la souris sur les différentes lignes et qu'elles affichent leur nom, le type de train utilisé et par quelles destinations elles passent. La création de l'algorithme de recherche combiné à l'interactivité de la carte ont été particulièrement compliqués à mettre en place. 
En ce qui concerne les échelles, il a fallu faire un choix pour n'afficher que les lignes suisses et quelques lignes qui dépassent la frontière mais sans surcharger la carte d'informations. 
C'est pourquoi j'ai opté pour un plus petit modèle que celui initial quitte à perdre un peu en précision. J'ai également dû ajuster la largeur des segments de correspondance de l'algorithme de recherche ainsi que diminuer l'épaisseur des lignes d'intensité pour permettre un meilleur équilibre visuel.

[capture d'écran de l'interactivité des lignes avec le tooltip](réseau_ferroviaire3.png)

[capture d'écran se focalisant sur la fréquence de passage du réseau ferroviaire suisse](réseau_ferroviaire1.png)

[capture d'écran lorsque l'algorithme de recherche est actif](réseau_ferroviaire2.png)

## Déclaration d'utilisation d'IA génératives : 

Pour la réalisation de ce travail je me suis inspiré de Perplexity AI. (2026). Perplexity 2.89.0 [Grand modèle de langage Anthropic]. https://www.perplexity.ai.
J'ai utilisé ce dernier pour le perfectionnement et l'amélioration de mon code initial en rapport avec l'algorithme de recherche.
Effectivement mon code initial n'était pas très précis et révélait quelques défaults das l'affichage de trajets qui demandaient plus d'une correspondance. De plus parfois le calcul du temps de parcours de certains segments n'était pas correct ou certains segments étaient trop simplifiés et imprécis.
Il m'a permis notamment de réaliser pourquoi l'algorithme ne distinguait pas (par exemple) entre Brig et Hebrig, ce qui m'a redirigé sur une amélioration et modification de la fusion des fichiers (rails_suisse.json). 
De plus l'intellignence artificielle m'a grandement aidé pour l'optimisation de la vitesse de recherche de l'algorithme qui était relativement lente (c'est toujours le cas mais moins en fonction du trajet recherché). 



