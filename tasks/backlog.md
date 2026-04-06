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

## Fix mineurs post-sessions
- Dashboard tauxConversion : calculer sur prospects email envoyé+, pas total
- computeProchainRelance : description.includes("NEGOCIATION") fragile → filtre robuste
- Page emails : modale au lieu du split view prévu dans le design
