# Fonctionnement de la connexion entre NewApp et Prestashop via api
    React (NewApp)
        ↓ axiosInstance (auth + headers XML)
    Vite Proxy (évite CORS)
        ↓
    PrestaShop API (répond en XML)
        ↓
    xmlParser (transforme XML → objet JS)
        ↓
    Composants React (affichent les données)

    les services creent les methodes de recuperation qui appellent axiosInstance etceux recuperees sont parsees
    puis on cree la page .jsx qui prend les donnees recuperees et les affichent

# Architecture de l'import 
    Evaluateur donne un fichier CSV
            ↓
    Tu ouvres NewApp → page Import
            ↓
    Tu choisis le fichier CSV depuis ton PC
            ↓
    NewApp lit le fichier et parse chaque ligne
            ↓
    Pour chaque ligne → on construit un XML
    compatible PrestaShop
            ↓
    On envoie ce XML à PrestaShop via POST /api/products
            ↓
    PrestaShop crée le produit dans sa base de données



        CSV volumineux
            ↓
        1. Validation du fichier (format, colonnes)
            ↓
        2. Parsing CSV → tableau d'objets JS
            ↓
        3. Conversion objet JS → XML (format PrestaShop)
            ↓
        4. Envoi par batch (ex: 10 items à la fois)
        pour éviter de surcharger le serveur
            ↓
        5. Suivi en temps réel (barre de progression)
            ↓
        6. Rapport final (succès / erreurs)



    ImportPage
    ├── Étape 1 : Choisir le module (Produits, Clients...)
    ├── Étape 2 : Uploader le CSV
    ├── Étape 3 : Prévisualisation des données parsées
    │             (tableau avec les 5 premières lignes)
    ├── Étape 4 : Confirmation → envoi par batch de 10
    └── Étape 5 : Rapport (X succès / X erreurs)