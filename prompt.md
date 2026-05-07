
Dans import rajouter un option de detection des modules comme la 2eme version de l'import qu'on a fait
Car il est tout de meme possible que le fichier csv qu'on va nous donner contiendra 2 ou 3 modules en meme temps grace au colonne type dans le csv
Dans ce cas la, on traite comme ceci:
On choisit les separateurs
On upload directement un fichier csv, apres l'upload le systeme doit analyser et voir les modules decris dans le csv et combien pour chaque module et affiches chaque champs obligatoire et optionnel de cahque module detecte, si tout est compatible, on passe a l'apercu puis l'import, sinon retourner un erreur avec message clair 


On doit rajouter les boutons modifier et supprimer sur chaque ligne de chaque module

Il faut enrichir chaque tableau de chaque module

Corriger erreur : import declinaisons


FAIT:
On doit rajouter tous les modules necessaires : stock, categories,....


FAIT:
On doit aussi rajouter un message " Aucun *module* detecte" ex : aucun client detecte car la quand il y a rien dans client par exemple c'est ceci qui s;affiche dans le menu client : Cannot read properties of undefined (reading '@_id')

FAIT:
dans importer, on doit rajouter deux champs  : champ separateur de valeur et separetur multiplr + champs recquises pour chaque module
Mais il faut afficher le message clair lors de l'erreur si separateur pas compatible avec le fichier importe, on doit afficher un message clair pas l'erreur brute : ex : "Le separateur de champs choisi dans la config n'est pas compatible avec celui dans le fichier importe, veuillez voir la compatibilite, le separateur dans le fichier est ;"

Login

Apprendre api : documentation 

Revoir la conception de reset de data et de sauvegarde de data