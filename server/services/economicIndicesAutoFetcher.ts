import { db } from "../db";
import { economicIndices } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import * as cron from 'node-cron';
import fetch from 'node-fetch';

interface IndexSource {
  name: string;
  url: string;
  apiKey?: string;
  parser: (data: any) => IndexValue[];
}

interface IndexValue {
  code: string;
  name: string;
  value: number;
  date: Date;
  source: string;
  baseYear?: number;
}

/**
 * Service de récupération automatique journalière des indices économiques
 * Sources: INSEE, Eurostat, Banque de France
 */
export class EconomicIndicesAutoFetcher {
  private static sources: Record<string, IndexSource> = {
    INSEE: {
      name: "INSEE",
      url: "https://api.insee.fr/series/BDM/V1/data",
      parser: (data) => this.parseINSEEData(data)
    },
    EUROSTAT: {
      name: "Eurostat", 
      url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data",
      parser: (data) => this.parseEurostatData(data)
    },
    BANQUE_DE_FRANCE: {
      name: "Banque de France",
      url: "https://api.webstat.banque-france.fr/webstat-fr/v1/data",
      parser: (data) => this.parseBanqueDeFranceData(data)
    }
  };

  private static indicesMapping = {
    // INSEE indices
    ICC: { source: "INSEE", code: "001763852", name: "Indice du coût de la construction" },
    ILC: { source: "INSEE", code: "001764289", name: "Indice des loyers commerciaux" },
    IRL: { source: "INSEE", code: "001515333", name: "Indice de référence des loyers" },
    IPC: { source: "INSEE", code: "001763779", name: "Indice des prix à la consommation" },
    IPPAP: { source: "INSEE", code: "010534766", name: "Indice des prix de production de l'industrie" },
    BT01: { source: "INSEE", code: "000008630", name: "Index bâtiment - Tous corps d'état" },
    
    // Eurostat indices
    HICP: { source: "EUROSTAT", code: "prc_hicp_midx", name: "Harmonised Index of Consumer Prices" },
    PPI: { source: "EUROSTAT", code: "sts_inpp_m", name: "Producer Price Index" },
    
    // Banque de France indices
    FM0A: { source: "BANQUE_DE_FRANCE", code: "FM.M.FR.EUR.FR2.MM.EURIBOR3MD_.HSTA", name: "Euribor 3 mois" },
    OAT10: { source: "BANQUE_DE_FRANCE", code: "IR.M.FR.EUR.FR2.BB.FR10YT_RR.HSTA", name: "OAT 10 ans" }
  };

  /**
   * Initialise le cron job pour la récupération journalière
   */
  static initializeScheduler(): void {
    // Exécution tous les jours à 6h du matin
    cron.schedule('0 6 * * *', async () => {
      console.log('Démarrage de la récupération automatique des indices économiques');
      await this.fetchAllIndices();
    });

    // Exécution immédiate au démarrage
    this.fetchAllIndices().catch(console.error);
  }

  /**
   * Récupère tous les indices depuis toutes les sources
   */
  static async fetchAllIndices(): Promise<void> {
    const results: IndexValue[] = [];
    const errors: string[] = [];

    for (const [indexCode, config] of Object.entries(this.indicesMapping)) {
      try {
        console.log(`Récupération de l'indice ${indexCode} depuis ${config.source}`);
        const value = await this.fetchIndex(indexCode, config);
        if (value) {
          results.push(value);
          await this.saveIndexValue(value);
        }
      } catch (error) {
        const errorMsg = `Erreur lors de la récupération de ${indexCode}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Enregistrer le résultat de la synchronisation
    await this.logSyncResult(results.length, errors);
    
    console.log(`Synchronisation terminée: ${results.length} indices mis à jour, ${errors.length} erreurs`);
  }

  /**
   * Récupère un indice spécifique
   */
  static async fetchIndex(indexCode: string, config: any): Promise<IndexValue | null> {
    const source = this.sources[config.source];
    if (!source) {
      throw new Error(`Source inconnue: ${config.source}`);
    }

    let url = source.url;
    
    // Construire l'URL selon la source
    switch (config.source) {
      case "INSEE":
        url = `${url}/SERIES_BDM/${config.code}?lastNObservations=1`;
        break;
      case "EUROSTAT":
        url = `${url}/${config.code}?format=JSON&lang=FR&lastTimePeriod=1`;
        break;
      case "BANQUE_DE_FRANCE":
        url = `${url}/${config.code}?client_id=public&format=json&lastNObservations=1`;
        break;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(source.apiKey && { 'Authorization': `Bearer ${source.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const values = source.parser(data);
      
      if (values.length > 0) {
        return {
          ...values[0],
          code: indexCode,
          name: config.name
        };
      }
      
      return null;
    } catch (error) {
      throw new Error(`Erreur API pour ${config.source}: ${error.message}`);
    }
  }

  /**
   * Parse les données INSEE
   */
  private static parseINSEEData(data: any): IndexValue[] {
    const values: IndexValue[] = [];
    
    try {
      if (data?.series?.[0]?.observations) {
        const obs = data.series[0].observations;
        const lastObs = obs[obs.length - 1];
        
        values.push({
          code: data.series[0].idBank,
          name: data.series[0].nameEn || data.series[0].nameFr,
          value: parseFloat(lastObs.value),
          date: new Date(lastObs.periode),
          source: "INSEE",
          baseYear: data.series[0].baseYear
        });
      }
    } catch (error) {
      console.error('Erreur parsing INSEE:', error);
    }
    
    return values;
  }

  /**
   * Parse les données Eurostat
   */
  private static parseEurostatData(data: any): IndexValue[] {
    const values: IndexValue[] = [];
    
    try {
      if (data?.value) {
        const lastKey = Object.keys(data.value).pop();
        if (lastKey) {
          const dimension = data.dimension;
          const timePeriod = dimension?.time?.category?.index;
          const lastTime = Object.keys(timePeriod || {}).pop();
          
          values.push({
            code: data.extension?.datasetId,
            name: data.label || data.extension?.datasetName,
            value: data.value[lastKey],
            date: lastTime ? new Date(lastTime) : new Date(),
            source: "EUROSTAT"
          });
        }
      }
    } catch (error) {
      console.error('Erreur parsing Eurostat:', error);
    }
    
    return values;
  }

  /**
   * Parse les données Banque de France
   */
  private static parseBanqueDeFranceData(data: any): IndexValue[] {
    const values: IndexValue[] = [];
    
    try {
      if (data?.series?.[0]?.observations) {
        const series = data.series[0];
        const lastObs = series.observations[series.observations.length - 1];
        
        values.push({
          code: series.seriesKey,
          name: series.seriesName,
          value: parseFloat(lastObs.observationValue),
          date: new Date(lastObs.periodDate),
          source: "BANQUE_DE_FRANCE"
        });
      }
    } catch (error) {
      console.error('Erreur parsing Banque de France:', error);
    }
    
    return values;
  }

  /**
   * Sauvegarde une valeur d'indice en base
   */
  private static async saveIndexValue(value: IndexValue): Promise<void> {
    try {
      // Vérifier si une valeur existe déjà pour cette date
      const existing = await db
        .select()
        .from(economicIndices)
        .where(
          and(
            eq(economicIndices.code, value.code),
            eq(economicIndices.date, value.date)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // Insérer la nouvelle valeur
        await db.insert(economicIndices).values({
          code: value.code,
          name: value.name,
          value: value.value,
          date: value.date,
          source: value.source,
          baseYear: value.baseYear,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`Indice ${value.code} sauvegardé: ${value.value} au ${value.date.toISOString()}`);
      } else {
        // Mettre à jour si la valeur a changé
        if (existing[0].value !== value.value) {
          await db
            .update(economicIndices)
            .set({
              value: value.value,
              updatedAt: new Date()
            })
            .where(eq(economicIndices.id, existing[0].id));
            
          console.log(`Indice ${value.code} mis à jour: ${value.value}`);
        }
      }
    } catch (error) {
      console.error(`Erreur sauvegarde indice ${value.code}:`, error);
      throw error;
    }
  }

  /**
   * Enregistre le résultat de la synchronisation
   */
  private static async logSyncResult(successCount: number, errors: string[]): Promise<void> {
    // TODO: Implémenter l'enregistrement dans une table de logs
    const logEntry = {
      date: new Date(),
      successCount,
      errorCount: errors.length,
      errors: errors.join('\n'),
      source: 'AUTO_FETCH'
    };
    
    console.log('Résultat synchronisation:', logEntry);
  }

  /**
   * Récupère la dernière valeur d'un indice
   */
  static async getLatestIndexValue(indexCode: string): Promise<IndexValue | null> {
    try {
      const [latest] = await db
        .select()
        .from(economicIndices)
        .where(eq(economicIndices.code, indexCode))
        .orderBy(desc(economicIndices.date))
        .limit(1);
        
      if (latest) {
        return {
          code: latest.code,
          name: latest.name,
          value: latest.value,
          date: latest.date,
          source: latest.source,
          baseYear: latest.baseYear
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur récupération indice ${indexCode}:`, error);
      return null;
    }
  }

  /**
   * Force la mise à jour d'un indice spécifique
   */
  static async forceUpdateIndex(indexCode: string): Promise<IndexValue | null> {
    const config = this.indicesMapping[indexCode];
    if (!config) {
      throw new Error(`Indice inconnu: ${indexCode}`);
    }

    const value = await this.fetchIndex(indexCode, config);
    if (value) {
      await this.saveIndexValue(value);
    }
    
    return value;
  }

  /**
   * Récupère l'historique d'un indice
   */
  static async getIndexHistory(
    indexCode: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IndexValue[]> {
    let query = db
      .select()
      .from(economicIndices)
      .where(eq(economicIndices.code, indexCode))
      .orderBy(desc(economicIndices.date));

    const results = await query;
    
    return results.map(r => ({
      code: r.code,
      name: r.name,
      value: r.value,
      date: r.date,
      source: r.source,
      baseYear: r.baseYear
    }));
  }

  /**
   * Vérifie la santé du service
   */
  static async healthCheck(): Promise<{
    status: string;
    lastSync?: Date;
    indicesCount: number;
    sources: string[];
  }> {
    try {
      // Récupérer la dernière mise à jour
      const [lastUpdate] = await db
        .select({ updatedAt: economicIndices.updatedAt })
        .from(economicIndices)
        .orderBy(desc(economicIndices.updatedAt))
        .limit(1);

      // Compter les indices uniques
      const indices = await db
        .select({ code: economicIndices.code })
        .from(economicIndices)
        .groupBy(economicIndices.code);

      return {
        status: 'healthy',
        lastSync: lastUpdate?.updatedAt,
        indicesCount: indices.length,
        sources: Object.keys(this.sources)
      };
    } catch (error) {
      return {
        status: 'error',
        indicesCount: 0,
        sources: []
      };
    }
  }
}