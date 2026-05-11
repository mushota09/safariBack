tu es un developpeur backend et front-end professionnel,
avant tout commencer d'abord par analyser profondement le backend tout comprendre, puis
tu vas implemneter le front-end (tu vas le creer dans le workspace que tu vas creer) et ajuster le backend(avec react)
je t'explique les scenarios lorsque un client ouvre le site web je veux qu'il tombe sur l'ecran du programme des bateaux (qui lui affiche les programmes) par defaut ca va lui filtrer le programme du port le plus proche (par rapport a ses coordonnees, longitude ,latitude) puis sur le meme ecran mettre la possibilte de rechercher (une recherche qui inclu les ports et les city) une fois cliquer sur un programme du bateau qu'il veut il va etre rediriger sur la page de detail du bateau les restes je te laisse gerer tu es un grand developpeur professionnel, tu vas integrer aussi l'authentification par google: <!-- AUTHENTIFICATION PAR GOOGLE -->
CLIENT_ID=422318066430-vc31gve0aunm2kkv50cc50v4k0lo2nq6.apps.googleusercontent.com

JAVASCRIPT_AUTORISER=http://localhost:3000
URI_DE_REDIRECTION=http://localhost:8000/api/callback

l'authentification intervient juste quand il veux faire une reservation (tu peux modifier le backend pour l'adapter a la situation)

et voici d'autre informations necessaires:
<!-- REDIS -->

HOST= 127.0.0.1 / "redis://:Rapha@1996...@31.97.217.126:6379/0"
PORT = 6379
PASSWORD = Rapha@1996...

pour redis je prefere utiliser "redis://:Rapha@1996...@31.97.217.126:6379/0" pour le test

<!-- EMAIL -->
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mushota09@gmail.com
SMTP_PASSWORD=gipm bgxg xdql pioy
SMTP_FROM=mushota09@gmail.com
SMTP_TLS=True

<!-- DB -->

DATABASE_URL=postgresql+asyncpg://neondb_owner:npg_gZ4eYlSdwr3o@ep-tiny-sound-agslibpd-pooler.c-2.eu-central-1.aws.neon.tech/safari_db?sslmode=require&channel_binding=require


pour le payement tu va simule d'abord

ce que j'attends de toi ce que tu ajuste le backend et que tu code une application front end tout complet baser sur le backend et tu dois agir comment un backend professionnel (faire un beau design pas juste te contenter de code, couleur primaire de l'application :hex 010312 ) , et agit comme un developpeur autonome (tu as tout en ta disposition pas besoin de mon interaction mais ne pas changer la logique du backend)

varifier les erreur de syntax
pas de doublons des code , ni des codes casser
verifier que tout a ete implementer
n'ecris pas des tests



et aussi pour la connection normal l'utilisateur se connecte avec :
l'imail et le mot de passe (metre la possibilite d'afficher ou masquer sous  forme de l'oeil ) et non Nom d'utilisateur .

 pour l'inscription normal metre juste Nom complet,email , Téléphone(placeholder doit ressembler a un numero de la rdc), mot de passe (metre la possibilite d'afficher ou masquer sous  forme de l'oeil ) date de maissance je ne veux pas voir Nom d'utilisateursur l'interface le Nom d'utilisateur va etre completer automatiquement dans le backend (le nom de l'imail ex: mushota09@gmail.com , tu prends juste mushota09) et aussi  pour afficher la photo d'utilisateur s'il en a sinon utiliser la premiere lettre comme tu le fait deja partout ou

 tu est un developpeur professionnel ce que je veux c sur cette page : http://localhost:3000/compagnies je veux que son titre soit Programme (ca va afficher les programmes du port le plus proche de l'utilisateur (donc recuper automatiquement la longitude et latitude de l'utilisateur) par defaut ) mettre la possibilite de filtrer par city/port (si le city a plusieur port par exemple)

mentenant fait un script pour inserer les donnees dans la base de donne tu vas me creer une 5 company  , PORT (tu vas creer des 3 port 1 Kalemie, 2 moba, 3 uvira avec longitude latitude) BATEAU des bateaux avec des niveaux , des chambres , lits et autres bateaux sans niveaux bef avec des programmes different


pour l'interface http://localhost:3000/ la ou il ya le nom de company il faut mettre le nom du bateau, pas besoin de metre le nom du company  et la ou il ya vehicule tu mets place vendu (places_vendues_passagers) et la ou il ya places tu mets  place taotal (places_disponibles_passagers) donc en dessous du calendrier du depart (date du depart) tu vas juste mettre les 2 card ,et le card du calendrier du depart (date du depart) tu vas mettre la couleur du header

pour le filtre de recherche : Départ doit etre a selectionner aussi mais par defaut il sera le port le plus proche de l'utilisateur , tu vas enlever Passagers et Avec véhicule et enlever aussi le bouton de la recherche vu que la recherche sera progressive (a chaque fois qu'il clique sur Départ
Arrivée
Date)

je veux maintenant que tu optimises la requete de Port le plus proche de l'utilisateur et tu utilise streamingResponse


tu vas mettre Programme des bateaux (tu vas le centrer et augmanter la taille )la ou il ya Port le plus proche: Uvira (25.5 km)



sur l'interface http://localhost:3000/voyage/7  je veux que tu affiche les information dont l'utilisateur aura vraiment besoin et il faut aussi ameliorer le design comme un professionnel en design tu dois etre coherent bien analyser le projet pour comprendre


et je veux aussi que Programme (qui est dans le header soit aussi rediriger sur sur http://localhost:3000/ ) et que si l'utilisateur connecter a des reservations qui vois le dans le header Mes reservations

tu es un developpeur backend et frontend professionnel analyse profondement le projet
sur l'interface de reservations
1 . si moi meme est selectionner par defaut Nombre de passagers=1(et doit etre desactiver) et s'il selectionne chambre sur Sélectionnez un niveau lui afficher les chambres qui ne sont pas prisent (sous forme des petits cards ou bouton avec le numero de la chambre et s'il selectionne un toutes les autres disparaissent il doit aussi selectionner le lit) sur la section chambre tu commence par enlever ce qui existe pour mettre ce que je viens de te dire

2 . si le choix est moi et les autres (je veux un peux changer la logique qui existe) par  defaut Nombre de passagers =2 et verrouiller la possibilite de descendre a 0 et ne doit pas depasser 200 mais cette fois la section Sélectionnez un niveau disparait ce que je dois voir cette section :Informations des autres passagers (1) mais tu vas juste mettre Informations des passagers() par defaut la personne qui est connecter mais avec l'autocompletion de ses informations et les autres seront les information des autres passagers a completer mais aussi chaque aura la possibiliter de choisir une chambre (...) ou pour tous ou tous les passagers choisir pour tous

3 . je te laisse imaginer la suite pour le cas 3 (Les autres)


commence par analyser le projet en profondeur
et pour la reservation: si Type de réservation est vehicule :
la section: Pour disparait , tu vas mettre "nombre des vehicules"
 par defaut = 1 et tu vas mettre la section Information des vehicules (dans cette section tu vas mettre information du vehicule comme on l'a fait sur passager ) donc par defaut un seul card et ou l'utilisateur doit saisir les informations essentiel du vehicule,le "nombre des vehicules" a reserver ne doivent pas depasser les nombres de vehicules "places_disponibles_vehicules" de meme pour le cas des passager
fait des choses en pro pas comme un debutant ,





<!-- https://lobehub.com/skills/africandigitalassetframework-africa-stack-skills-airtel-money -->

https://lucide.dev/icons/user

https://app.moneroo.io/auth/register

https://fonts.google.com/specimen/Archivo+Black?preview.script=Latn

SARARI=pvk_sandbox_2x8rgl|01KRBGJ8S1VAP7EVJZFR665XER
