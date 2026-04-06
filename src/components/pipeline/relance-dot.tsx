interface RelanceDotProps {
  prochaineRelance: string | null
}

export function RelanceDot({ prochaineRelance }: RelanceDotProps) {
  if (prochaineRelance === null) return null
  if (new Date(prochaineRelance) >= new Date()) return null

  return (
    <span
      style={{ display: "inline-block", width: 6, height: 6, borderRadius: 9999, backgroundColor: "#f87171", flexShrink: 0 }}
    />
  )
}
