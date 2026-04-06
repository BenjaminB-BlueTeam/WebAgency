import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

// The LibSQL driver adapter wraps DB constraint errors as raw DriverAdapterError
// instead of PrismaClientKnownRequestError, so we check both ways.
export function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return true
  if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) return true
  return false
}

export function isNotFoundError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return true
  return false
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db"
  const authToken = process.env.DATABASE_AUTH_TOKEN
  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
