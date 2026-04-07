import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import type { Concurrent } from "@/lib/analyse"

export interface AuditPdfProspect {
  nom: string
  activite: string
  ville: string
  adresse: string | null
  telephone: string | null
  noteGoogle: number | null
}

export interface AuditPdfAnalyse {
  concurrents: Concurrent[]
  synthese: string
  recommandations: string[]
}

Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    lineHeight: 1.5,
  },
  header: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 32,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  coverWrap: {
    flex: 1,
    justifyContent: "center",
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
  },
  coverProspect: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 8,
  },
  coverDate: {
    fontSize: 11,
    color: "#555555",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  label: {
    fontSize: 9,
    color: "#555555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    color: "#000000",
    marginBottom: 10,
  },
  competitorBlock: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 12,
    marginBottom: 12,
  },
  competitorName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  competitorUrl: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
  },
  bulletItem: {
    fontSize: 10,
    marginBottom: 2,
    paddingLeft: 8,
  },
  positionnement: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#333333",
    marginTop: 6,
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 12,
  },
  signature: {
    marginTop: 32,
    fontSize: 9,
    color: "#555555",
    textAlign: "center",
  },
})

function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

interface Props {
  prospect: AuditPdfProspect
  analyse: AuditPdfAnalyse
}

export function AuditPdfDocument({ prospect, analyse }: Props) {
  const today = formatDateFr(new Date())

  return (
    <Document>
      {/* Page de garde */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Flandre Web Agency</Text>
        <View style={styles.coverWrap}>
          <Text style={styles.coverTitle}>Audit concurrentiel</Text>
          <View style={styles.divider} />
          <Text style={styles.coverProspect}>{prospect.nom}</Text>
          <Text style={styles.coverDate}>{today}</Text>
        </View>
      </Page>

      {/* Page 2 - Infos prospect */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Flandre Web Agency — Audit concurrentiel</Text>
        <Text style={styles.sectionTitle}>Entreprise analysée</Text>
        <View style={styles.divider} />

        <Text style={styles.label}>Nom</Text>
        <Text style={styles.value}>{prospect.nom}</Text>

        <Text style={styles.label}>Activité</Text>
        <Text style={styles.value}>{prospect.activite}</Text>

        <Text style={styles.label}>Ville</Text>
        <Text style={styles.value}>{prospect.ville}</Text>

        {prospect.adresse && (
          <>
            <Text style={styles.label}>Adresse</Text>
            <Text style={styles.value}>{prospect.adresse}</Text>
          </>
        )}

        {prospect.telephone && (
          <>
            <Text style={styles.label}>Téléphone</Text>
            <Text style={styles.value}>{prospect.telephone}</Text>
          </>
        )}

        {prospect.noteGoogle !== null && (
          <>
            <Text style={styles.label}>Note Google</Text>
            <Text style={styles.value}>{prospect.noteGoogle.toFixed(1)} / 5</Text>
          </>
        )}
      </Page>

      {/* Pages concurrents */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Flandre Web Agency — Audit concurrentiel</Text>
        <Text style={styles.sectionTitle}>Analyse des concurrents</Text>
        <View style={styles.divider} />

        {analyse.concurrents.length === 0 && (
          <Text style={styles.paragraph}>Aucun concurrent identifié dans la zone.</Text>
        )}

        {analyse.concurrents.map((c, i) => (
          <View key={i} style={styles.competitorBlock} wrap={false}>
            <Text style={styles.competitorName}>{c.nom}</Text>
            {c.siteUrl && <Text style={styles.competitorUrl}>{c.siteUrl}</Text>}

            {c.forces.length > 0 && (
              <>
                <Text style={styles.subLabel}>Forces</Text>
                {c.forces.map((f, j) => (
                  <Text key={j} style={styles.bulletItem}>
                    • {f}
                  </Text>
                ))}
              </>
            )}

            {c.faiblesses.length > 0 && (
              <>
                <Text style={styles.subLabel}>Faiblesses</Text>
                {c.faiblesses.map((f, j) => (
                  <Text key={j} style={styles.bulletItem}>
                    • {f}
                  </Text>
                ))}
              </>
            )}

            {c.positionnement && (
              <Text style={styles.positionnement}>{c.positionnement}</Text>
            )}
          </View>
        ))}
      </Page>

      {/* Synthèse */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Flandre Web Agency — Audit concurrentiel</Text>
        <Text style={styles.sectionTitle}>Synthèse &amp; recommandations</Text>
        <View style={styles.divider} />

        <Text style={styles.subLabel}>Synthèse</Text>
        <Text style={styles.paragraph}>{analyse.synthese}</Text>

        {analyse.recommandations.length > 0 && (
          <>
            <Text style={styles.subLabel}>Recommandations stratégiques</Text>
            {analyse.recommandations.map((r, i) => (
              <Text key={i} style={styles.bulletItem}>
                {i + 1}. {r}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.signature}>Réalisé par Flandre Web Agency</Text>
      </Page>
    </Document>
  )
}
