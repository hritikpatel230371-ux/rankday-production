import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "@/lib/env";

const { DATABASE_URL } = getServerEnv();
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; currentDbUrl?: string };

export const prisma =
  globalForPrisma.prisma && globalForPrisma.currentDbUrl === DATABASE_URL
    ? globalForPrisma.prisma
    : new PrismaClient({
        datasourceUrl: DATABASE_URL,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.currentDbUrl = DATABASE_URL;
}
