import type { Variants, Transition } from "motion/react"

// --- Transitions reutilisables ---
const easeOut: Transition = { duration: 0.3, ease: "easeOut" }

// --- Variants ---

/** Cartes, panneaux, sections au montage */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeOut },
}

/** Container pour les listes en cascade (50ms entre chaque) */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
}

/** Item dans un staggerContainer */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: easeOut },
}

/** Props pour hover sur les cartes (translateY -1px) */
export const hoverLift = {
  whileHover: { y: -1, borderColor: "#333" },
  transition: { duration: 0.15 },
}

/** Expand/collapse pour panneaux inline */
export const expandCollapse: Variants = {
  initial: { height: 0, opacity: 0, overflow: "hidden" },
  animate: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { height: { duration: 0.3, ease: "easeOut" }, opacity: { duration: 0.2, ease: "easeOut" } },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: { height: { duration: 0.2, ease: "easeIn" }, opacity: { duration: 0.15, ease: "easeIn" } },
  },
}

/** Props pour drag sur les cartes kanban */
export const scaleOnDrag = {
  whileDrag: { scale: 1.02, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" },
}

/** Barres de scoring — remplissage anime au montage */
export const progressBar = (value: number): Variants => ({
  initial: { width: "0%" },
  animate: {
    width: `${value}%`,
    transition: { duration: 0.6, ease: "easeOut" },
  },
})

/** Transitions entre onglets avec AnimatePresence */
export const slideIn: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: easeOut },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

/**
 * Hook-style countUp — a utiliser avec useMotionValue + useTransform
 * Exemple :
 *   const count = useMotionValue(0)
 *   const rounded = useTransform(count, Math.round)
 *   useEffect(() => { animate(count, target, { duration: 0.4 }) }, [target])
 *   <motion.span>{rounded}</motion.span>
 */
export const countUpTransition: Transition = { duration: 0.4, ease: "easeOut" }
