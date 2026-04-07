# Audit Responsive — 2026-04-07

**Audit**: Cohérence des classes Tailwind responsive (sm:, md:, lg:, xl:) sur composants critiques.
**Scope**: Code-only (sans browser), vérification desktop/mobile breakpoints, tailles de texte, largeurs fixes, réorganisation grids/flex.

---

## Composants OK

- **Sidebar** (src/components/sidebar.tsx) : Excellente implémentation
  - ✓ hidden md:flex pour le desktop sidebar
  - ✓ md:hidden pour la version mobile avec hamburger
  - ✓ Mobile sidebar slide-in animation cohérente
  - ✓ Padding et tailles d'icônes adaptées

- **ProspectRow** (src/components/prospects/prospect-row.tsx)
  - ✓ Colonnes cachées : hidden lg:table-cell, hidden md:table-cell, hidden xl:table-cell
  - ✓ Gestion cohérente des breakpoints

- **ProspectCardMobile** (src/components/prospects/prospect-card-mobile.tsx)
  - ✓ Design compact adapté au mobile (p-3)
  - ✓ Flex layout qui s'adapte

- **KanbanCard** (src/components/pipeline/kanban-card.tsx)
  - ✓ Classes responsive cohérentes sur la card elle-même

- **ResultCard** (src/components/recherche/result-card.tsx)
  - ✓ Flexbox responsif avec min-w-0 pour gestion du text-overflow

- **EmailsClient** (src/components/emails/emails-client.tsx)
  - ✓ Utilisation de flex flex-col gap-2 adapté au mobile et desktop

- **ProspectFilters** (src/components/prospects/prospect-filters.tsx)
  - ✓ flex flex-col md:flex-row correct pour le responsive
  - ✓ Select avec w-full md:w-[180px] bien pensé

- **SearchForm** (src/components/recherche/search-form.tsx)
  - ✓ flex flex-col md:flex-row sur le formulaire principal
  - ✓ Select avec md:w-[200px] et md:w-[160px] appropriés

- **Dashboard Layout** (src/app/(dashboard)/layout.tsx)
  - ✓ md:ml-[200px] correct pour l'offset du sidebar
  - ✓ pt-14 md:pt-6 pour le padding-top adapté

---

## Issues détectées

### [PromptEditorModal] — medium

**Fichier**: src/components/prospects/prompt-editor-modal.tsx:79-96

**Problème**:
- Textarea avec height: "70vh" fixé ne s'adapte pas correctement sur mobile petit écran (320px)
- Sur mobile, 70vh laisse peu d'espace pour le formulaire et les boutons
- Largeur max-width 896px n'utilise pas responsive sizing

**Fix proposé**:
- Changer textarea height à height: "min(70vh, calc(100vh - 240px))"
- Ajouter padding horizontal responsive

---

### [AddProspectModal] — low

**Fichier**: src/components/prospects/add-prospect-modal.tsx:92

**Problème**:
- Modal principale avec max-w-md w-full p-6 mais mx-4 seulement
- Sur très petit mobile (<380px), le padding de 6 (24px) + marge laisse peu d'espace

**Fix proposé**:
- Ajouter classe responsive au wrapper modal : mx-2 sm:mx-4
- Alternative : p-4 sm:p-6 pour padding responsive

---

### [KanbanBoard horizontal scroll] — low

**Fichier**: src/components/pipeline/kanban-board.tsx:130-142

**Problème**:
- flex flex-row gap-3 overflow-x-auto sans scroll snap sur mobile
- Colonnes kanban avec min-w-[220px], ce qui crée un scroll horizontal sans adaptation
- Largeur stricte sans adaptation mobile

**Fix proposé**:
- Ajouter classe sm:min-w-[240px] pour adapter la largeur des colonnes
- Ou réduire min-w-[200px] sur mobile et min-w-[220px] sur desktop

---

### [ParametresTabs tab bar] — low

**Fichier**: src/components/parametres/parametres-tabs.tsx:65

**Problème**:
- flex gap-1 border-b border-[#1a1a1a] mb-6 overflow-x-auto sans responsive padding
- Tab items avec px-4 py-2 fixe : sur mobile petit écran, peut créer un wrap inutile
- Pas de whitespace-nowrap sur les boutons pour éviter le wrap

**Fix proposé**:
- Ajouter whitespace-nowrap aux boutons tab
- Ou réduire padding : px-3 sm:px-4

---

### [EmailProspectRow mobile layout] — low

**Fichier**: src/components/emails/email-prospect-row.tsx:32-98

**Problème**:
- Contenu caché : hidden md:block pour ville, statut, dernier email, relance
- Sur mobile < 768px, peu d'information visible avec le nom/activité
- Pas de problème critique mais l'UX peut être serrée

---

### [ProspectList add button] — low

**Fichier**: src/components/prospects/prospect-list.tsx:211-221

**Problème**:
- flex justify-end mb-4 sans responsive padding
- Bouton avec px-4 py-2 fixe
- Sur mobile, le texte "Ajouter un prospect" peut déborder ou créer deux lignes

**Fix proposé**:
- Ajouter px-3 sm:px-4 sur le bouton
- Ou utiliser text-xs sm:text-sm pour réduire la taille sur mobile

---

### [KanbanCard dragOverlay width] — medium

**Fichier**: src/components/pipeline/kanban-card.tsx:34

**Problème**:
- w-[200px] fixe sur la card dragged overlay
- Sur petit mobile (320px), une carte de 200px prend 62% de largeur
- La card doit être plus adaptable selon la taille de l'écran

**Fix proposé**:
- Utiliser w-[min(200px,90vw)] ou w-[150px] sm:w-[200px]
- Alternative : max-w-xs sm:max-w-sm

---

## Fixes appliqués

### 1. KanbanCard dragOverlay — reduction de largeur mobile

**Fichier**: src/components/pipeline/kanban-card.tsx:34

Changement appliqué:
- Ajout w-[min(200px,90vw)] pour responsive sur mobile

Raison: Permet à la card d'être responsif sur petit mobile sans déborder.

---

### 2. PromptEditorModal — textarea responsive height

**Fichier**: src/components/prospects/prompt-editor-modal.tsx:84

Changement appliqué:
- Remplacement de height: "70vh" par height: "min(70vh, calc(100vh - 240px))"

Raison: S'assure que la textarea laisse assez d'espace pour les boutons même sur petit mobile.

---

### 3. AddProspectModal — padding responsive

**Fichier**: src/components/prospects/add-prospect-modal.tsx:92

Changement appliqué:
- Ajout p-4 sm:p-6 et mx-2 sm:mx-4

Raison: Réduit le padding sur mobile et adapte les marges latérales.

---

### 4. ProspectList add button — text responsif

**Fichier**: src/components/prospects/prospect-list.tsx:213-220

Changement appliqué:
- Ajout px-3 sm:px-4 et text-xs sm:text-sm

Raison: Adapte la taille du texte et le padding pour éviter le débordement sur mobile.

---

## Résumé statistique

- **Composants audités**: 12
- **Composants OK**: 9
- **Issues détectées**: 6
- **Fixes appliqués**: 4

---

## Tableau de synthèse

| Composant | Responsive | Taille texte | Largeur fixe | Buttons mobile | Grids/Flex |
|-----------|-----------|-------------|------------|---------------|-----------|
| Sidebar | ✓✓ | ✓ | ✗ | ✓ | ✓ |
| ProspectList | ✓ | ✓ | ✗ | ⚠ | ✓ |
| ProspectRow | ✓✓ | ✓ | ✗ | — | ✓ |
| KanbanBoard | ✓ | ✓ | ⚠ | ✓ | ✓ |
| SearchForm | ✓✓ | ✓ | ✗ | ✓ | ✓ |
| EmailProspectRow | ✓ | ✓ | ✗ | ✓ | ✓ |
| ParametresTabs | ✓ | ✓ | ✗ | ✓ | ✓ |
| AddProspectModal | ✓ | ✓ | ⚠ | ⚠ | ✓ |
| PromptEditorModal | ⚠ | ✓ | ✓ | ✓ | ✓ |

Légende: ✓✓ = Excellent | ✓ = OK | ⚠ = À améliorer | ✗ = N/A

---

**Audit généré le**: 2026-04-07
**Audteur**: Claude Code Responsive Auditor
