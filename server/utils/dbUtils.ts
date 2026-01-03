/**
 * Utilitaires pour gérer l'accès à la base de données
 * avec une meilleure compatibilité pour les tests
 */

import { db } from "../db";

/**
 * Vérification sûre de l'accès à la base de données
 */
export function isDbAvailable() {
  return db && 
         typeof db.select === 'function' && 
         db.select() && 
         typeof db.select().from === 'function';
}

/**
 * Récupération sécurisée des données avec fallback
 */
export async function safeDbQuery<T>(
  queryBuilder: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    if (isDbAvailable()) {
      return await queryBuilder();
    }
    return fallback;
  } catch (error) {
    console.error('Erreur lors de la requête DB:', error);
    return fallback;
  }
}

/**
 * Exécution sécurisée d'une requête select
 */
export async function safeSelect<T>(
  table: any,
  conditions?: any,
  fallback: T[] = []
): Promise<T[]> {
  try {
    if (!isDbAvailable()) {
      return fallback;
    }
    
    const query = db.select().from(table);
    if (conditions) {
      return await query.where(conditions);
    }
    return await query;
  } catch (error) {
    console.error('Erreur lors de select:', error);
    return fallback;
  }
}

/**
 * Exécution sécurisée d'une requête insert
 */
export async function safeInsert<T>(
  table: any,
  values: any,
  returning: boolean = true
): Promise<T | null> {
  try {
    if (!isDbAvailable()) {
      return null;
    }
    
    const query = db.insert(table).values(values);
    if (returning) {
      const result = await query.returning();
      return result[0];
    }
    await query;
    return null;
  } catch (error) {
    console.error('Erreur lors de insert:', error);
    return null;
  }
}

/**
 * Exécution sécurisée d'une requête update
 */
export async function safeUpdate<T>(
  table: any,
  values: any,
  conditions: any,
  returning: boolean = false
): Promise<T | null> {
  try {
    if (!isDbAvailable()) {
      return null;
    }
    
    const query = db.update(table).set(values).where(conditions);
    if (returning) {
      const result = await query.returning();
      return result[0];
    }
    await query;
    return null;
  } catch (error) {
    console.error('Erreur lors de update:', error);
    return null;
  }
}

/**
 * Exécution sécurisée d'une requête delete
 */
export async function safeDelete(
  table: any,
  conditions: any
): Promise<boolean> {
  try {
    if (!isDbAvailable()) {
      return false;
    }
    
    await db.delete(table).where(conditions);
    return true;
  } catch (error) {
    console.error('Erreur lors de delete:', error);
    return false;
  }
}

export const dbUtils = {
  isAvailable: isDbAvailable,
  query: safeDbQuery,
  select: safeSelect,
  insert: safeInsert,
  update: safeUpdate,
  delete: safeDelete
};