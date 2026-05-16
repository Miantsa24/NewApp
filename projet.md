NewApp — État actuel du projet
Architecture générale
Application React 19 + Vite connectée à PrestaShop 8 via son webservice XML. Deux interfaces distinctes dans la même app :

Backoffice (gestion interne)
Page	Rôle
Login	Authentification employé (JWT 8h), profil pré-rempli depuis PS
Dashboard	Badges stats (produits, clients, commandes, ruptures), commandes du jour et par date
Commandes	Liste commandes + paniers, dropdown d'état contextuel, transitions vers paiement/annulé
Import CSV	Pipeline 5 étapes : upload → détection module → mapping → aperçu → import
Reset	Suppression ordonnée par module avec confirmation, compteurs et rapport
Pages désactivées (routes commentées) : Produits, Catégories, Déclinaisons, Stock, Clients

Frontoffice (interface client)
Page	Rôle
Accueil	Grille des clients PS, clic pour pré-remplir le login
Login client	Auth bcrypt + JWT, email pré-rempli via URL
Boutique	Grille produits avec filtres (nom, catégorie, prix min/max)
Produit	Détail, déclinaisons, packs, ajout au panier
Panier	Gestion articles, modal de commande (adresse + paiement), sync cart PS en live
Confirmation	Récapitulatif commande (référence, total, état)
Hooks et services principaux
Hooks : useEnrichedOrders, useEnrichedProducts, useEnrichedCustomers, useEnrichedStock, useEnrichedCombinations, useAuth, useProductDetail

Services backoffice : authService, ordersService, importService, resetService, productService, categoriesService, stockService

Services frontoffice : frontAuthService, orderService (cart PS + commandes)

Modules d'import gérés
10 modules configurés : produits, clients, commandes, catégories, déclinaisons, stock, taxes, fournisseurs, fabricants, entrepôts — avec détection automatique depuis les en-têtes CSV, résolution des dépendances inter-modules, et ordre d'import topologique.

Points techniques notables
Auth : JWT maison (pas de lib serveur), bcrypt côté client pour les clients PS
Panier : localStorage isolé par client (front_cart_{id}), cart PS créé dès visite CartPage et synchronisé en temps réel
Commandes : création en 4 étapes (cart → lignes → ordre → état 2), PS_OS_WS_PAYMENT=13 pour contourner l'erreur OrderPayment
Import : scores de confiance par colonne CSV, mapping configurable, registre inter-modules pour résoudre les IDs PS
Reset : suppression ordonnée avec protection des IDs système PS (catégories racine, etc.)

### Ny natao farany :

Partie 1 — Frontoffice : validation de commande
Problème : Cliquer sur "Valider la commande" retournait Fatal error: Can't save Order Payment in PaymentModule.php:391.

Diagnostic :

Order::addWs() ignore le champ <current_state> dans le XML et crée toujours la commande avec l'état PS_OS_WS_PAYMENT
Cet état (11) était "logable" → PrestaShop appelait addOrderPayment() → crash car le panier était vide côté PS
Le panier était vide parce que les cart_rows étaient placées directement sous <cart> au lieu d'être dans <associations>
Fixes :

PS_OS_WS_PAYMENT changé de 11 → 13 (non-logable) → plus d'appel à addOrderPayment()
Format XML cart_rows corrigé : <associations><cart_rows nodeType="cart_row" api="cart_rows">
Flux createOrder revu en 4 étapes :
POST /carts → créer le panier
PUT /carts/{id} → peupler avec les lignes
POST /orders → créer la commande (PrestaShop calcule les vrais totaux depuis le panier)
GET + PUT /orders/{id} → passer à l'état 2 "Paiement accepté"
Partie 2 — Backoffice : liste des commandes
Problème : Le dropdown d'état montrait "Dans le panier" comme option sélectionnable, et les paniers PS n'apparaissaient pas dans la liste.

Ce qui a été fait :

ordersService.js (backoffice) :

getVal extrait au niveau module (était local à buildOrderXml, causait des erreurs)
Ajout deleteCart(cartId) → DELETE /carts/{id}
Ajout createOrderFromCart(cartItem) → crée une commande depuis un panier existant, puis la passe à l'état 2
useEnrichedOrders.js :

Réécriture complète : fetch de 8 endpoints en parallèle (orders, carts, customers, order_states, currencies, carriers, order_details, products)
Paniers filtrés : exclut ceux déjà convertis en commande + ceux sans lignes
Totaux HT/TTC des paniers calculés depuis les cart_rows × prix produit (taux fixe 20%)
Fusion commandes + paniers triés par date décroissante
refresh() exposé pour forcer le rechargement après une action
OrdersList.jsx :

Dropdown dynamique selon l'état de l'item :
"Dans le panier" → Paiement effectué | Annulé
"Paiement effectué" → Annulé uniquement
"Annulé" → Paiement effectué uniquement
Transition "Dans le panier" → Paiement effectué : createOrderFromCart() + refresh()
Transition "Dans le panier" → Annulé : deleteCart() + refresh()
stateId tracké dans localStates pour que le dropdown se recalcule après changement
Partie 3 — Cycle de vie du cart PS (frontoffice)
Problème : Les carts PS étaient créés uniquement à la validation → carts orphelins si la validation échouait à mi-chemin. Supprimer un article du panier n'avait aucun effet côté PS.

orderService.js (front) :

Helpers localStorage : getStoredPsCart, clearPsCart (clé ps_cart_{customerId})
createEmptyPsCart → POST /carts avec adresse=0
syncPsCartRows → PUT /carts/{id} avec les lignes courantes
deletePsCart → DELETE + efface localStorage
createOrder accepte existingCartId/existingCartSecureKey → saute la création si le cart existe déjà
CartPage.jsx :

Cart initialisé depuis localStorage via useState(() => ...) (plus d'effet pour ça)
Effet d'init au montage : crée le cart PS si inexistant, synchronise les lignes
removeItem / updateQty : synchronisent le cart PS en fire-and-forget (ou le suppriment si panier vide)
handleConfirmOrder : réutilise psCartInfo, passe le cart existant à createOrder, efface localStorage après succès

### Ny mbola atao :
## J1:
créer la page pour importer les 4 fichiers 
3 fichiers csv pour le contenu import-data-mai-26	 
csv modifié ce 11/05 à 13:15 , voir couleur rouge
1 fichier zip pour les images :  images.zip 
## J2 :
Ny import 1 ihany ny déclinaison, fa tsisy combinaison : si specifite = taille dia taille ihany fa tsisy heo sady taille no couleur et vice versa
rajouter une option “utilisateur anonyme” : peut tout faire
## J3:
Backoffice
Vérifier les erreurs suivants dans l’import
Nom de colonne non conforme
format de date différente de DD/MM/YYYY
montant positif
rajouter un tableau sur l’évolution du stock journalier d’un produit
mahazo micréer endpoint 1 (1 ihany ) ianareo ao am prestashop hiantsoana an’ilay code
StockAvailable::updateQuantity($idProduct, 0, $delta)