React (NewApp)
    ↓ axiosInstance (auth + headers XML)
Vite Proxy (évite CORS)
    ↓
PrestaShop API (répond en XML)
    ↓
xmlParser (transforme XML → objet JS)
    ↓
Composants React (affichent les données)