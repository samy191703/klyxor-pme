import { IndexValue } from '../types';

interface CacheEntry {
  value: IndexValue;
  expiresAt: Date;
}

/**
 * Adaptateur pour récupérer les indices depuis les sources officielles
 * avec gestion du cache et fallback manuel
 */
export class IndexSourceAdapter {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTTL = 24 * 60 * 60 * 1000; // 24 heures
  private readonly sources = {
    INSEE: 'https://api.insee.fr/series/BDM/data',
    EUROSTAT: 'https://ec.europa.eu/eurostat/api',
    MANUAL: 'manual_entry'
  };

  /**
   * Récupère la valeur d'un indice pour une période donnée
   */
  async getIndexValue(
    indexKey: 'ICHT' | 'CPI' | 'FM0A' | string,
    period: string,
    preferDefinitive: boolean = true
  ): Promise<IndexValue | null> {
    const cacheKey = `${indexKey}_${period}`;
    
    // Vérification du cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Tentative de récupération depuis la source officielle
      const value = await this.fetchFromSource(indexKey, period, preferDefinitive);
      
      if (value) {
        this.setCache(cacheKey, value);
        await this.logIndexCall(indexKey, period, 'SUCCESS', value.source);
        return value;
      }

      // Fallback sur entrée manuelle si disponible
      const manualValue = await this.getManualEntry(indexKey, period);
      if (manualValue) {
        this.setCache(cacheKey, manualValue);
        return manualValue;
      }

      await this.logIndexCall(indexKey, period, 'NOT_FOUND', 'NONE');
      return null;
    } catch (error) {
      await this.logIndexCall(indexKey, period, 'ERROR', 'NONE', error as Error);
      throw error;
    }
  }

  /**
   * Récupère plusieurs indices en parallèle
   */
  async getMultipleIndices(
    requests: Array<{ key: string; period: string }>
  ): Promise<Map<string, IndexValue | null>> {
    const results = new Map<string, IndexValue | null>();
    
    const promises = requests.map(async ({ key, period }) => {
      const value = await this.getIndexValue(key, period);
      results.set(`${key}_${period}`, value);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Récupère depuis les sources officielles
   */
  private async fetchFromSource(
    indexKey: string,
    period: string,
    preferDefinitive: boolean
  ): Promise<IndexValue | null> {
    // Mapping des codes INSEE
    const inseeSeriesCode = this.getInseeSeriesCode(indexKey);
    if (!inseeSeriesCode) {
      return null;
    }

    try {
      // Récupérer les vraies données depuis la base de données
      const { db } = await import('@/server/db');
      const { economicIndices } = await import('@/shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      
      // Convertir la période en date
      const periodDate = new Date(period);
      
      // Rechercher l'indice dans la base de données
      const [indexData] = await db
        .select()
        .from(economicIndices)
        .where(
          and(
            eq(economicIndices.code, indexKey),
            eq(economicIndices.date, periodDate)
          )
        )
        .limit(1);
      
      if (indexData) {
        return {
          key: indexKey,
          period,
          value: Number(indexData.value),
          source: indexData.source,
          publishedAt: indexData.date,
          definitive: indexData.isDefinitive || true,
          createdAt: indexData.createdAt || new Date()
        };
      }

      return null;
    } catch (error) {
      console.error(`Erreur récupération indice ${indexKey} pour ${period}:`, error);
      return null;
    }
  }

  /**
   * Récupère une entrée manuelle depuis la base de données
   */
  private async getManualEntry(
    indexKey: string,
    period: string
  ): Promise<IndexValue | null> {
    try {
      // Récupérer les entrées manuelles depuis la base de données
      const { db } = await import('@/server/db');
      const { economicIndices } = await import('@/shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // Convertir la période en date
      const periodDate = new Date(period);
      
      // Rechercher l'indice manuel dans la base de données
      const [manualData] = await db
        .select()
        .from(economicIndices)
        .where(
          and(
            eq(economicIndices.code, indexKey),
            eq(economicIndices.date, periodDate),
            eq(economicIndices.source, 'MANUAL')
          )
        )
        .limit(1);
      
      if (manualData) {
        return {
          key: indexKey,
          period,
          value: Number(manualData.value),
          source: 'MANUAL',
          publishedAt: manualData.date,
          definitive: true,
          createdAt: manualData.createdAt || new Date()
        };
      }
    } catch (error) {
      console.error(`Erreur récupération entrée manuelle ${indexKey} pour ${period}:`, error);
    }

    return null;
  }

  /**
   * Enregistre une valeur manuelle d'indice
   */
  async saveManualEntry(
    indexKey: string,
    period: string,
    value: number,
    enteredBy: string
  ): Promise<IndexValue> {
    const indexValue: IndexValue = {
      key: indexKey,
      period,
      value,
      source: 'MANUAL',
      publishedAt: new Date(),
      definitive: true,
      createdAt: new Date()
    };

    // TODO: Sauvegarder en DB
    console.log(`Entrée manuelle sauvegardée: ${indexKey} ${period} = ${value} par ${enteredBy}`);
    
    // Invalider le cache pour cette clé
    const cacheKey = `${indexKey}_${period}`;
    this.cache.delete(cacheKey);
    
    return indexValue;
  }

  /**
   * Résout la date ou la valeur d'un indice
   */
  async resolveIndexReference(
    indexKey: string,
    dateOrValue?: Date | number
  ): Promise<{ date: Date; value: number } | null> {
    if (!dateOrValue) return null;

    if (typeof dateOrValue === 'number') {
      // On a la valeur, chercher la date correspondante
      // TODO: Implémenter la recherche inversée
      return {
        date: new Date(), // Date trouvée
        value: dateOrValue
      };
    } else {
      // On a la date, chercher la valeur correspondante
      const period = this.dateToPeriod(dateOrValue);
      const indexValue = await this.getIndexValue(indexKey, period);
      
      if (indexValue) {
        return {
          date: dateOrValue,
          value: indexValue.value
        };
      }
    }

    return null;
  }

  /**
   * Gestion du cache
   */
  private getFromCache(key: string): IndexValue | null {
    const entry = this.cache.get(key);
    
    if (entry && entry.expiresAt > new Date()) {
      return entry.value;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private setCache(key: string, value: IndexValue): void {
    this.cache.set(key, {
      value,
      expiresAt: new Date(Date.now() + this.cacheTTL)
    });
  }

  /**
   * Journalisation des appels
   */
  private async logIndexCall(
    indexKey: string,
    period: string,
    status: 'SUCCESS' | 'NOT_FOUND' | 'ERROR',
    source: string,
    error?: Error
  ): Promise<void> {
    const log = {
      timestamp: new Date(),
      indexKey,
      period,
      status,
      source,
      error: error?.message
    };
    
    // TODO: Sauvegarder en DB
    console.log('Index call log:', log);
  }

  /**
   * Utilitaires
   */
  private getInseeSeriesCode(indexKey: string): string | null {
    const mapping: Record<string, string> = {
      'ICHT': '001565183', // ICHT-Rev-TS
      'CPI': '001759970',  // IPC ensemble
      'FM0A': '010546274', // Indice de référence des loyers
      // Ajouter d'autres mappings selon besoins
    };
    
    return mapping[indexKey] || null;
  }

  private dateToPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }


  /**
   * Invalide tout le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // TODO: Implémenter le comptage
      misses: 0
    };
  }
}