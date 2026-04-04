"use client"

import Link from "next/link"
import { Users } from "lucide-react"
import { motion } from "motion/react"
import { fadeInUp } from "@/lib/animations"
import { Button } from "@/components/ui/button"

export function EmptyState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <Users size={48} className="text-[#555555] mb-4" />
      <h2 className="text-lg font-semibold text-[#fafafa] mb-2">
        Commencez par rechercher des prospects
      </h2>
      <p className="text-sm text-[#737373] max-w-md mb-6">
        Utilisez la recherche pour trouver des entreprises dans votre zone,
        {" "}évaluez leur potentiel et démarrez votre prospection.
      </p>
      <Button asChild>
        <Link href="/recherche">Lancer une recherche</Link>
      </Button>
    </motion.div>
  )
}
