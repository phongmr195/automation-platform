import { PrismaClient } from '@prisma/client'

// Create a singleton PrismaClient to avoid creating multiple instances during
// hot-reloads or when both backend and worker import this file.
const globalForPrisma = (globalThis as any) as { prisma?: PrismaClient }

const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
