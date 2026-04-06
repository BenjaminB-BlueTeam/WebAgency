# Backlog — Features futures

## CMS Client (priorité : après premiers clients signés)
Intégrer un CMS headless (Decap CMS ou Tina CMS) optionnel sur les sites clients.
- Le client accède à monsite.fr/admin
- Interface simple pour modifier : textes par page, photos par galerie, horaires, tarifs
- Config par fichier YAML (quels champs sont éditables)
- Modifications commitées sur GitHub → redéploiement automatique
- Zéro backend, zéro base de données
- ~30 min d'intégration par site
- Proposé en option payante sur l'offre Visibilité

## Infrastructure hébergement client (priorité : après premier client signé)
- Choisir la solution d'hébergement pour les sites clients (Offre Vitrine)
- Options : Netlify Pro, VPS Hetzner/OVH, o2switch, Cloudflare Pages
- Installer Plausible (auto-hébergé ou Plausible Cloud) pour les rapports mensuels
- Virer Coolify et OpenClaw du VPS Hostinger actuel

## Page Paramètres complète (priorité : Session 17)
Tous les paramètres sont stockés en base (modèle Parametre) et modifiables à chaud via l'UI.
Les features lisent les valeurs depuis la base, jamais en dur dans le code.
Chaque modification prend effet immédiatement sans redéploiement.

### Profil agence
- Nom de l'agence, nom du contact, email, téléphone, adresse, logo
- Injecté dans : emails de prospection (signature), sites générés (footer), devis
- Clé en base : "agence.nom", "agence.email", "agence.telephone", etc.

### Templates email
- System prompt Claude pour emails de prospection (ton, longueur, style)
- System prompt Claude pour emails de relance
- Modifiables via textarea, prise en compte immédiate
- Clés : "email.prospection.systemPrompt", "email.relance.systemPrompt"

### Coefficients de scoring
- Les 5 poids : présence web, SEO, design, financier, potentiel
- Modifiables via sliders ou inputs numériques
- Recalcul du scoreGlobal uniquement au prochain scoring (pas de recalcul rétroactif)
- Clés : "scoring.poids.presenceWeb", "scoring.poids.seo", etc.

### Règles de relance
- Délais modifiables : email (défaut 7j), maquette (5j), RDV (3j), devis (10j)
- Prise en compte immédiate sur les prochains calculs de prochaineRelance
- Clés : "relance.delai.email", "relance.delai.maquette", etc.

### Zone de prospection
- Liste des villes cibles (ajout/suppression)
- Rayon de recherche par défaut (en km)
- Utilisé comme filtre dans la recherche Google Places
- Clés : "prospection.villes", "prospection.rayonKm"

### Offres commerciales
- Vitrine : prix création, description
- Visibilité : prix création, prix maintenance mensuel, description
- Utilisé dans les futurs devis et dans les emails si mentionné
- Clés : "offre.vitrine.prix", "offre.visibilite.prix", "offre.visibilite.maintenance"

### Principe technique
- Table Parametre : { id, cle (unique), valeur (JSON string), updatedAt }
- Fonction utilitaire getParam(cle, defaultValue) utilisée partout
- API route PATCH /api/parametres pour modifier
- Les valeurs par défaut sont codées dans le code comme fallback
- Si la clé n'existe pas en base, le fallback s'applique → rien ne casse jamais

## Fix mineurs post-sessions
- Dashboard tauxConversion : calculer sur prospects email envoyé+, pas total
- computeProchainRelance : description.includes("NEGOCIATION") fragile → filtre robuste
- Page emails : modale au lieu du split view prévu dans le design
