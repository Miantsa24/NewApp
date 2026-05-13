### Résumé complet du projet NewApp

Contexte général
Le projet consiste à créer NewApp, une application React connectée à PrestaShop 8.2.6 via son API REST. L'échange de données se fait exclusivement en XML. PrestaShop tourne en local et NewApp communique avec lui via un proxy Vite pour éviter les problèmes CORS.

Stack technique
Frontend  : React + Vite
Routing   : React Router DOM
HTTP      : Axios
XML       : fast-xml-parser
CSV       : PapaParse
Auth      : JWT maison (localStorage)
Icons     : Tabler Icons (webfont)
Style     : CSS pur (pas de framework UI)

Architecture générale
NewApp (React : 5173)
    ↓ Axios (auth Basic + headers XML)
Vite Proxy (évite CORS)
    ↓
PrestaShop API (localhost/prestashop_edition_classic_version_8.2.6)
    ↓ répond en XML
fast-xml-parser (XML → objet JS)
    ↓
Hooks enrichis (jointure JS des données)
    ↓
Composants React (affichage)

### BACKOFFICE
Structure des fichiers
src/
├── api/
│   ├── axiosInstance.js          ← config Axios (baseURL, auth, headers XML)
│   ├── xmlParser.js              ← parsing XML → objet JS
│   ├── services/
│   │   ├── productService.js     ← GET, DELETE produits
│   │   ├── customersService.js   ← GET, DELETE clients
│   │   ├── ordersService.js      ← GET, DELETE, PUT état commande
│   │   ├── categoriesService.js  ← GET, DELETE catégories
│   │   ├── combinationsService.js← GET, DELETE déclinaisons
│   │   └── stockService.js       ← GET stock
│   │   └── authService.js        ← GET employees : login, logout, JWT, getCurrentUser
│   └── utils/
│       ├── modulesConfig.js      ← config centralisée tous les modules
│       └── csvToXml.js           ← conversion CSV row → XML PrestaShop
│
├── hooks/
│   ├── useAuth.js          ← hook générique display=full
│   ├── usePrestaShop.js          ← hook générique display=full
│   ├── useEnrichedProducts.js    ← produits enrichis
│   ├── useEnrichedCustomers.js   ← clients enrichis
│   ├── useEnrichedOrders.js      ← commandes enrichies
│   ├── useEnrichedCategories.js  ← catégories enrichies
│   ├── useEnrichedStock.js       ← stock enrichi
│   └── useEnrichedCombinations.js← déclinaisons enrichies
│
├── components/
│   ├── Layout.jsx + .css         ← sidebar + topbar + content
│   ├── ProtectedRoute.jsx        ← garde les routes privées
│   ├── ProductList.jsx           ← tableau produits enrichis
│   ├── CustomersList.jsx         ← tableau clients enrichis
│   ├── OrdersList.jsx            ← tableau commandes + dropdown état
│   ├── CategoriesList.jsx        ← tableau catégories arborescentes
│   ├── CombinationsList.jsx      ← tableau déclinaisons enrichies
│   ├── StockList.jsx             ← tableau stock enrichi
│   └── List.css                  ← styles partagés tous les tableaux
│
└── pages/
    ├── Dashboard.jsx + .css      ← stats + dernières commandes + alertes
    ├── LoginPage.jsx + .css      ← formulaire login prérempli
    ├── ImportPage.jsx + .css     ← import CSV multi-étapes
    └── ResetPage.jsx + .css      ← réinitialisation par module

Ce qu'on a implémenté
1. Connexion PrestaShop ↔ NewApp : A voir

Proxy Vite configuré pour éviter les CORS
Instance Axios centralisée avec authentification Basic Auth via clé API PrestaShop
Parser XML fast-xml-parser configuré pour gérer les attributs et le texte
Helper getVal() pour extraire les valeurs des champs PrestaShop (simples ou xlink)
Helper toArray() pour normaliser les réponses en tableau

2. Affichage des données — 6 modules
Chaque module suit le même pattern :

useEnriched[Module] charge toutes les données en parallèle via Promise.all
Jointure côté JS via des Maps pour enrichir les données
Composant List affiche un tableau avec données enrichies
Message Aucun [module] détecté si liste vide

Produits : image, nom, catégorie parente, catégorie enfant, référence, prix HT, prix TTC, quantité, état
Clients : civilité (mapping statique), nom, email, groupe, nb commandes, nb adresses, date inscription, état
Commandes : référence, client, transporteur, total HT, total TTC, devise, nb produits, état modifiable, date
Catégories : arborescence visuelle (parent en bleu, enfant indenté), catégorie parente, nb produits, état
Stock : produit lié, référence, déclinaison liée, quantité, statut (disponible / stock faible / rupture)
Déclinaisons : produit parent, attributs (Taille: M / Couleur: Bleu), impact prix, prix final, stock

3. Dashboard

4 stats dynamiques : total produits, clients, commandes, ruptures de stock
Detail commande date du systeme
Liste des commandes par jour : nb de commande + montant
Total general
Champ de recherche de commande par date

4. Import CSV : A voir
Fonctionnement en 5 étapes :

Choix du module (6 modules disponibles)
Configuration séparateurs (champ + valeurs multiples, modifiables)
Affichage des champs requis et optionnels du module choisi
Upload fichier avec validation : extension, taille max 10MB, colonnes obligatoires, compatibilité séparateur
Prévisualisation 5 premières lignes avec colonnes requises marquées
Import par batch de 10 avec pause 300ms entre batches
Rapport final : nb succès + erreurs avec numéro de ligne

Modules supportés : products, customers, orders, categories, combinations, stock

5. Réinitialisation

Suppression par module individuel avec confirmation
Bouton "Tout supprimer" avec double confirmation
Feedback visuel : spinner, badge succès / erreur par module
Protection catégories système PrestaShop (id 1 et 2 non supprimables)

6. Modification état commande : A VOIR ENCORE

Dropdown inline dans le tableau commandes
3 états disponibles : Paiement effectué (2), Dans le panier (localStates), Annulé (6)
Mise à jour locale immédiate (optimistic update) sans recharger la liste
PUT vers PrestaShop avec objet commande complet (PrestaShop exige le PUT complet)
Feedback : spinner pendant la mise à jour, erreur sur la ligne si échec

7. Authentification

Récupération employé PrestaShop via GET /api/employees pour préremplir le formulaire
Formulaire login avec email et mot de passe préremplis
Vérification email + mot de passe (mot de passe stocké dans .env)
Génération token JWT maison stocké dans localStorage (durée 8h)
ProtectedRoute protège toutes les routes sauf /login
Bouton logout dans la topbar qui supprime le token et redirige

### FRONTOFFICE:
Structure des fichiers
src/
├── front/
│   ├── FrontLayout.jsx          ← navbar
│   ├── FrontLayout.css          
│   ├── services/
│   │   ├── frontAuthService.js     ← getVal, generateToken, verifyToken, frontLogin,frontLogout,frontIsAuthenticated,frontGetCurrentUser : bcrypt
│   └── hooks/
│       ├── useProductDetail.js    ← fiche produit
│   └── pages/
│       ├── CartPage.css    ← panier css
│       ├── CartPage.jsx    ← page panier
│       ├── FrontLoginPage.css    ← login css
│       ├── FrontLoginPage.jsx   ← page login
│       ├── FrontHomePage.css    ← Home page css
│       ├── FrontHomePage.jsx   ← page kliste utilisateur
│       ├── ProductPage.css   ← fiche produit css
│       ├── ProductPage.jsx     ← page fiche produit
│       ├── ShopPage.css   ← liste produit css
│       ├── ShopPage.jsx   ← page liste produit

# AVANCEMENT PROJET — J1 & J2

## Consignes générales
- Utiliser **France** comme pays
- Utiliser **Euro (€)** comme devise
- Créer uniquement les pages demandées
- Ne pas ajouter de menu ou d’affichage non demandé

---

# JOUR 1

# NewAPP

## Backoffice

| Fonctionnalité | État | Remarques |
|---|---|---|
| Login / mot de passe administrateur | ⚠️ À revoir | Fonctionnel mais amélioration nécessaire |
| Protection des pages du backoffice | ❌ À faire | Empêcher l’accès sans authentification |
| Page de réinitialisation des données | ✅ Fait |  |
| Page d’import des fichiers | ❌ À refaire complètement | Structure et logique à revoir |
| Affichage des commandes | ⚠️ À confirmer | Vérifier la logique métier |
| Modification de l’état des commandes | ⚠️ À confirmer | États utilisés : paiement effectué / annulé |

### Fichiers d’import : A tester quand import est fait

| Fichier | État / Remarque |
|---|---|
| `import-data-mai-26` | 3 fichiers CSV pour les données |
| CSV modifié le 11/05 à 13:15 | Vérifier les modifications (couleur rouge) |
| `images.zip` | Fichier ZIP contenant les images |

---

## FrontOffice

| Fonctionnalité | État | Remarques |
|---|---|---|
| Page d’accueil produits | ✅ Fait |  |
| Fiche produit | ✅ Fait |  |
| Workflow d’achat complet | ❌ À faire | Login obligatoire |
| Gestion du panier | ❌ À faire |  |
| Validation de commande | ❌ À faire |  |
| Paiement à la livraison uniquement | ❌ À faire | Aucun autre mode de paiement |
| Frais de livraison | ❌ À faire | Aucun frais |
| Page “Mes commandes” | ❌ À faire |  |

---

# ExistingApp (PrestaShop)

| Vérification | État | Remarques |
|---|---|---|
| Les données importées sont visibles dans le backoffice PrestaShop | ❌ À vérifier |  |
| Les modifications des données impactent la NewAPP | ❌ À vérifier | Synchronisation à confirmer |

---

# JOUR 2

# NewAPP

## Backoffice

| Fonctionnalité | État | Remarques |
|---|---|---|
| États des commandes importés | ⚠️ À confirmer | Logique métier à valider |
| Tableau de bord | ✅ Fait |  |
| Statistiques par jour | ✅ Fait | Nombre de commandes + montant |
| Total général | ✅ Fait |  |

### États utilisés

| État | Remarque |
|---|---|
| Dans le panier | Cart uniquement, pas encore commande |
| Paiement effectué |  |
| Annulé |  |

### Point à clarifier

| Sujet | Remarque |
|---|---|
| “Ny import 1 ihany ny déclinaison, fa tsisy combinaison” | À clarifier complètement |

---

## FrontOffice

| Fonctionnalité | État | Remarques |
|---|---|---|
| Nouvelle page d’accueil : liste des utilisateurs existants | ✅ Fait |  |
| Choix de l’utilisateur pour connexion | ✅ Fait | |
| Option “utilisateur anonyme” | ❌ À faire |  |
| Affichage des marques HOT / NEW | ❌ À faire | Basé sur `date_availability_produit` |
| Recherche multicritère produits | ✅ Fait |  |

### Règles des badges produits

| Badge | Condition |
|---|---|
| HOT | Produit sorti il y a 1 jour |
| NEW | Produit sorti il y a moins d’1 semaine |

### Recherche multicritère

- Nom
- Catégorie
- Intervalle de prix

---

# RÉCAPITULATIF GLOBAL

## ✅ Fonctionnalités terminées

- Page accueil produits
- Fiche produit
- Tableau de bord statistiques
- Recherche multicritère
- Page réinitialisation données
- Liste des utilisateurs existants
- Login utilisateur frontoffice
- Gestion panier : un panier = un client, panier garder pour le compte meme deconnexion
- Workflow d’achat complet : login, choix produit, ajout panier, modal validation commande : adresse
- Validation commande
- Paiement à la livraison + sans frais de livraison 

---

## ⚠️ Fonctionnalités à revoir / confirmer

- Login backoffice : Protection backoffice
- Import fichiers + import images 
- Logique des états de commande
- Synchronisation ExistingApp ↔ NewAPP
- Gestion des déclinaisons / combinaisons


---

## ❌ Fonctionnalités restantes à faire
- Apres avoir cliquer sur valider commande : etat commande ? sans erreur ? appercu dans prestashop et nexapp backoffice?
- Page “Mes commandes”
- Utilisateur anonyme
- Badges HOT / NEW
- Vérification des imports dans PrestaShop


