export function ScorePastille({
  score,
  size = 24,
}: {
  score: number | null | undefined
  size?: number
}) {
  const displayScore = score ?? null

  let bgColor = "#737373"
  if (displayScore !== null) {
    if (displayScore >= 7) bgColor = "#4ade80"
    else if (displayScore >= 4) bgColor = "#fbbf24"
    else bgColor = "#f87171"
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: displayScore !== null && displayScore >= 4 ? "#000" : "#fff",
        fontSize: size * 0.45,
      }}
    >
      {displayScore !== null ? displayScore : "\u2014"}
    </span>
  )
}
