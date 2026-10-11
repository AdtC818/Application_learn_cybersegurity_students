import { PrismaClient } from '../../../../generated/prisma-client';

/**
 * Single shared PrismaClient instance for the whole process.
 * Creating more than one per process is a common source of connection-pool
 * exhaustion, so every Prisma-based adapter imports this instead of
 * instantiating its own client.
 */
export const prisma = new PrismaClient();
