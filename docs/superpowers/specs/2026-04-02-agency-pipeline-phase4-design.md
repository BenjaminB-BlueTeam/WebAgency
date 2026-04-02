# Spec — Agency Pipeline Phase 4 : Email Workflow

**Date :** 2026-04-02
**Statut :** Approuvé (décisions autonomes)
**Dépend de :** Phase 3 (maquette générée + validée)

---

## Objectif

Générer des emails ultra-ciblés, les valider avant envoi, les envoyer via Himalaya (SMTP), enregistrer les réponses du prospect, et adapter le prompt maquette en conséquence pour une éventuelle régénération.

---

## 1. Génération de l'email

**Point d'entrée :** bouton `✉ Générer email ciblé` dans l'expand prospect (colonne gauche).

Route existante : `GET /api/prospects/[id]/email` — **étendue** pour inclure dans le contexte :
- Rapport d'analyse concurrentielle (`notes.analyse`)
- Statut des maquettes (lien demoUrl v1 si disponible)
- Historique des activités (`Activite`) du prospect

**Ton :** professionnel, direct, humain, légère pointe d'humour. Pas de formules génériques. Chaque email mentionne un élément spécifique au prospect (secteur, ville, concurrent identifié, faiblesse web concrète).

**Format de réponse :**
```json
{
  "sujet": "...",
  "corps": "...",
  "variante_sms": "..."   // version courte pour SMS/WhatsApp (< 300 chars)
}
```

---

## 2. Validation avant envoi

Après génération, **l'email ne s'envoie jamais automatiquement.**

Le composant `EmailPreviewPanel` s'affiche dans l'expand (colonne droite, remplace temporairement le rapport analyse) :

```
┌─────────────────────────────────┐
│ Sujet : [champ éditable]        │
├─────────────────────────────────┤
│ Corps :                         │
│ [textarea éditable, 8 lignes]   │
│                                 │
├─────────────────────────────────┤
│ [Regénérer] [Modifier]          │
│                    [Envoyer ✉]  │
└─────────────────────────────────┘
```

- **Regénérer** : nouvel appel à `/api/prospects/[id]/email`, remplace le contenu
- **Modifier** : textarea devient éditable directement
- **Envoyer** : ouvre une confirmation `"Envoyer à contact@dupont.fr ?"` → puis `POST /api/prospects/[id]/email/send`

La variante SMS est affichée en dessous avec un bouton copier.

---

## 3. Envoi via Himalaya

Route : `POST /api/prospects/[id]/email/send`

Payload :
```json
{
  "sujet": "...",
  "corps": "..."
}
```

Himalaya lit `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` depuis `.env.local`.
L'email est envoyé depuis `profil_email` (table `Parametre`).

Après envoi réussi :
- Création d'une `Activite` : `{ type: 'EMAIL_ENVOYE', description: sujet, date: now }`
- PATCH `prospect.statutPipeline = 'CONTACTE'` si statut était `PROSPECT`
- Toast : `"✅ Email envoyé à {email}"`

---

## 4. Enregistrement des réponses prospect

Benjamin reçoit une réponse par email (hors app). Il la colle manuellement dans l'app.

**UI :** dans l'expand prospect, section `Échanges`, bouton `+ Ajouter réponse reçue`.
Ouvre un textarea : Benjamin colle le texte de la réponse → Enregistrer.

`POST /api/prospects/[id]/activites` avec `{ type: 'EMAIL_RECU', description: texte_collé }`.

---

## 5. Adaptation du prompt maquette depuis les réponses

Quand une `Activite` de type `EMAIL_RECU` existe pour un prospect, la route `GET /api/prospects/[id]/prompt` injecte automatiquement un bloc supplémentaire :

```
--- RETOURS DU PROSPECT ---
Le prospect a répondu : "{description de la dernière activité EMAIL_RECU}"
Adapte la maquette en tenant compte de ces retours spécifiques.
Si le prospect mentionne un style, une couleur, un service précis : l'intégrer en priorité.
```

Ainsi, quand Benjamin génère une maquette v2 ou v3, le prompt est déjà enrichi des retours sans action manuelle.

---

## 6. Résumé des échanges (composant existant étendu)

Le composant `ResumeEchangesSection` (déjà dans le codebase) est mis à jour pour :
- Lire toutes les `Activite` du prospect (EMAIL_ENVOYE, EMAIL_RECU, NOTE, APPEL, RDV)
- Appeler `GET /api/prospects/[id]/resume` qui demande à Claude un résumé en 3-5 lignes
- Format : `"Contacté le {date} par email. Réponse reçue : {résumé retour}. Maquette v1 envoyée. En attente de validation."`
- Affiché en haut de l'expand, toujours visible

---

## Fichiers touchés

| Fichier | Modification |
|---|---|
| `crm/src/app/api/prospects/[id]/email/route.ts` | Enrichissement contexte (analyse + maquettes + activités) |
| `crm/src/app/api/prospects/[id]/email/send/route.ts` | Nouvelle route envoi Himalaya |
| `crm/src/app/api/prospects/[id]/activites/route.ts` | Support EMAIL_RECU |
| `crm/src/app/api/prospects/[id]/resume/route.ts` | Nouvelle route résumé échanges Claude |
| `crm/src/components/prospects/prospect-row-expand.tsx` | EmailPreviewPanel + section réponse reçue |
| `crm/src/components/prospects/email-preview-panel.tsx` | Nouveau composant prévisualisation email |
| `crm/src/components/prospects/resume-echanges-section.tsx` | Appel API résumé + refresh auto |
| `crm/src/lib/email.ts` | Helper Himalaya send |
