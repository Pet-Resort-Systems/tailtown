/**
 * Schema Alignment Utilities
 *
 * This module provides utility functions for implementing our schema alignment strategy.
 * It includes helpers for safely executing Prisma queries with proper error handling
 * and fallback values to ensure API stability even when schemas differ between environments.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

/**
 * Safely execute a Prisma query with error handling and fallback value
 */
export async function safeExecutePrismaQuery<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T | null = null,
  errorMessage = "Error executing database query",
  throwError = false
): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error: any) {
    const prismaError =
      error?.code?.startsWith?.("P") ? error.code : null;

    const errorDetails = {
      prismaError,
      meta: error?.meta || {},
      message: error instanceof Error ? error.message : String(error),
    };

    logger.error(`[SCHEMA] ${errorMessage}: ${errorDetails.message}`);
    logger.debug("[SCHEMA] This error might be due to schema mismatches between environments");

    if (throwError) {
      throw error;
    }

    return fallbackValue;
  }
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(
  prisma: PrismaClient,
  tableName: string
): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    logger.error(`[SCHEMA] Error checking if table ${tableName} exists: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Check if a column exists in a table
 */
export async function columnExists(
  prisma: PrismaClient,
  tableName: string,
  columnName: string
): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    logger.error(`[SCHEMA] Error checking if column ${columnName} in table ${tableName} exists: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
