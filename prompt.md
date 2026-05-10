1. Import
Plus d'import (detection)
Ameliorer l'import : module mifangaro module hafa 
ex : ao am produit misy categorie, mamorona objet vaovao par module ao anaty modulesConfig.js dia atao ao daoly le table etrangere anle module
Dia refa mi importer donnee dia mila tafiditra any amle table etrangere ko ze tokony ho any

2. Il faut enrichir chaque tableau de chaque module : avec les tables etrangeres (.display=full) : FAIT

Okey on peut passer a ceci:

Plus d'import par detection, j'ai deja retire toute partie d'import avec detection c'est a dire la possibilite de 1 fichier csv = 2 modules
J'ai garde juste la partie simple 1 fichier csv = 1 module donc on garde la 1ere version mais on va l'ameliorer un peu plus tard:
Ameliorer l'import : comme on sait un produit est lie avec plusieurs autres tables, donc quand on fait un import on doit pas prendre en compte seulement que la table produit
Avant d'implementer quoi que ce soit concernant l'import, on doit d'abord mettre a jour aussi la recuperation des produits depuis l'api (toutes les modules si concerne pas seulement produit): on doit enrichir les tableaux 
ex : un produit a un ou plusieurs categories, on devrait etre capable d'afficher cela aussi dans la liste des produits: id, image, nom, categorie parent, categorie enfant, referance,montant ht,montant ttc(unite de prix selon le devise dans prestashop), quantite, etat. Et de meme pour les autres modules
Tu vois on va passer a un etape tres crucial de notre projet car ca ne sera plus de facon simple mais on va tout prendre en compte

Donc avant de passer a l'amelioration de l'import simple 1 fichier = 1 csv, on va se concentrer sur la mise a jour en question, et avant de passer au codage, propose moi le plan de comment on  va faire cela 

### FAIT:

Clients ne s'affiche pas, il y a une erreur 404

Dans categories, il y a un probleme au niveau des nbrs de produits dans les categories
On doit pouvoir voir qui sont les categories parents (couleur differentes ou autre) c'est quoi la categorie racine? il y a pas cela dans prestashop, et c'est quoi aussi le niveau?
Un categorie parent possede un ou plusieurs categories enfants et un produit appartient a un categorie parent et/ou un categorie enfant
Affichage categorie dans tableau : et sur chaque colone categorie parent si categorie parent alors vide
Categorie parent 1 (autre couleur)
    categorie enfant
Categorie parent 2 (autre couleur)
    categorie enfant


## Paiement du client : cycle de vie : commande du client -> commande confirme -> paiement

3. Mettre dans le choix de separateur un choix pour accepter les doublons ou pas (radio ou comme ca) donc on rajoute une logique pour ca

<!-- On doit rajouter les boutons modifier et supprimer sur chaque ligne de chaque module -->

4. Corriger erreur : import declinaisons

<!-- Login -->

5. Apprendre api + tables et workflow : documentation : WORKFLOW_SCENARIOS.md

# Revoir la conception de reset de data et de sauvegarde de data:
Les principales tables contenant les données de test sont :

Table	Contenu
ps_product	Produits
ps_product_lang	Noms/descriptions produits
ps_category	Categories
ps_category_lang	Noms categories
ps_customer	Clients
ps_orders	Commandes
ps_order_detail	Details commandes
ps_image	Images produits
ps_stock_available	Stock
ps_manufacturer	Marques
ps_supplier	Fournisseurs
ps_feature	Caracteristiques
ps_feature_value	Valeurs caracteristiques
ps_product_feature	Liaison produit/caracteristique
ps_attribute	Attributs (taille, couleur)
ps_attribute_group	Groupes attributs
ps_product_attribute	Combinaisons produits
ps_cart	Paniers
ps_employee	Admins/employes
ps_configuration	Configuration Prestashop 


ireto ilay liste anah table misy anle donne mila reinitalisena



