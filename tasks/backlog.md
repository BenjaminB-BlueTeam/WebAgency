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

## Veille nouveaux prospects (priorité : haute)
Widget sur le Dashboard : "Nouvelles entreprises dans la région"
- Vercel Cron quotidien (chaque matin à 8h) qui interroge Pappers
  sur les entreprises créées dans les dernières 24h dans le département 59
- Filtre optionnel par code NAF (pour cibler les métiers pertinents)
- Affichage sur le dashboard : nom, activité (libellé NAF), ville, date de création
- Bouton "Ajouter comme prospect" sur chaque ligne → crée le prospect en base
  et lance le scoring automatiquement
- Badge compteur sur le widget : "3 nouvelles entreprises aujourd'hui"
- Coût Pappers : ~2 crédits/jour (recherche 0.1/résultat) → ~60 crédits/mois
- Les entreprises déjà ajoutées comme prospect ne réapparaissent pas

## Scoring automatique à la recherche (priorité : haute)
Quand des prospects sont trouvés via Google Places, le scoring se lance automatiquement.
- Phase 1 : recherche Google Places → affichage des résultats → message "Recherche terminée. Scoring en cours..."
- Phase 2 : scoring en arrière-plan sur tous les résultats → quand terminé, les scores apparaissent et la liste se trie par score décroissant
- Pas d'affichage progressif : les résultats s'affichent une fois la recherche finie, les scores apparaissent tous ensemble une fois le scoring fini

## Recherche par lot / région (priorité : haute)
- Champ activité OPTIONNEL : si vide, recherche toutes les entreprises locales de la zone (Google Places "business" ou catégories larges)
- Sélection zone : ville unique, département, ou région entière
- Si département ou région : le CRM cherche dans toutes les villes principales
- Dédoublonnage automatique entre les résultats
- Scoring automatique sur tous les résultats
- Filtres sur les résultats : par ville, par score, par activité, par note Google, par présence de site web
- Résultats triés par score décroissant par défaut
- Cas d'usage : "Je veux voir tous les prospects potentiels à Hazebrouck peu importe leur activité"

## Ajout manuel de prospect (priorité : haute)
Bouton "Ajouter un prospect" sur la page Prospects.
- Ouvre une modale avec un formulaire : nom, activité, ville, téléphone, email, site web (tous optionnels sauf nom)
- Crée le prospect en base via POST /api/prospects existant
- Permet de se tester soi-même comme prospect pour valider le workflow complet
- Utile aussi quand un prospect vient par recommandation ou par contact direct (pas via Google Places)

## Ajustement maquette post-génération (priorité : haute)
Après génération d'une maquette, pouvoir donner des instructions de correction sans tout régénérer depuis zéro.
- Bouton "Ajuster" à côté de "Régénérer" dans l'onglet maquette
- Ouvre un textarea : "Qu'est-ce que tu veux modifier ?"
  Exemples : "Change la couleur principale en bleu", "Ajoute une page Tarifs",
  "Remplace le texte d'accroche par...", "Mets le CTA en rouge"
- Claude reçoit le code du site actuel + les instructions de modification
- Il retourne le code modifié (pas une régénération complète)
- Redéploiement Netlify avec le code ajusté
- L'historique des ajustements est stocké (prompt initial + corrections successives)
- Ne compte pas dans la limite des 3 versions (c'est un ajustement, pas une régénération)

## Fix mineurs post-sessions
- Dashboard tauxConversion : calculer sur prospects email envoyé+, pas total
- computeProchainRelance : description.includes("NEGOCIATION") fragile → filtre robuste
- Page emails : modale au lieu du split view prévu dans le design
