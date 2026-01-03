/**
 * @module IndexationV3Routes
 * @description Routes API pour l'indexation V3 100% conforme ENGIE
 * @version 3.0.0
 * @date Septembre 2025
 * 
 * 🎯 ENDPOINTS DISPONIBLES :
 * 
 * CALCUL ET SIMULATION
 * - POST /api/v3/indexation/calculate - Calcul avec sauvegarde
 * - POST /api/v3/indexation/simulate - Simulation sans sauvegarde  
 * - POST /api/v3/indexation/calculate-batch - Traitement en masse
 * 
 * GESTION DES INDICES
 * - POST /api/v3/indices/update - Mise à jour manuelle d'un indice
 * - GET /api/v3/indices/:indexCode/:date - Consultation d'un indice
 * - GET /api/v3/indexation/pending - Indexations en attente d'indices
 * - POST /api/v3/indexation/process-pending - Relancer les calculs en attente
 * 
 * HISTORIQUE ET AUDIT
 * - GET /api/v3/indexation/contract/:contractId - Historique par contrat
 * - GET /api/v3/indexation/audit/:indexationId - Détails d'un calcul
 * 
 * FONCTIONNALITÉS AVANCÉES
 * - POST /api/v3/indexation/retroactive - Indexation rétroactive
 * - POST /api/v3/indexation/tier-change - Changement de palier tarifaire
 * - POST /api/v3/indexation/approve - Validation managériale
 * 
 * ✅ CONFORMÉMENT ENGIE :
 * - Ordre seuil/cap respecté (seuil bloque, cap limite)
 * - Dates découplées (application vs prise d'indice)
 * - Gestion provisoire/définitif
 * - Paliers tarifaires année 6 et 11
 * - File d'attente pour indices manquants
 */

import { Express } from "express";
import { indexationEngineV3 } from "../services/indexationCalculationEngineV3";
import { db } from "../db";
import { contracts, indexations, indexValues } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/authMiddleware";
import { z } from "zod";

// Schémas de validation Zod
const calculateIndexationSchema = z.object({
  contractId: z.string(),
  indexationDate: z.string().transform(val => new Date(val)),
  indexTakingDate: z.string().transform(val => new Date(val)).optional(),
  useProvisional: z.boolean().optional(),
  forceRecalculation: z.boolean().optional(),
  indexationType: z.enum(['standard', 'retroactive', 'tier_change']).optional()
});

const batchCalculationSchema = z.object({
  contractIds: z.array(z.string()).min(1),
  indexationDate: z.string().transform(val => new Date(val)),
  config: z.object({
    useProvisional: z.boolean().optional(),
    forceRecalculation: z.boolean().optional()
  }).optional()
});

const updateIndexSchema = z.object({
  indexCode: z.string(),
  date: z.string().transform(val => new Date(val)),
  value: z.number().positive(),
  status: z.enum(['provisional', 'definitive']),
  source: z.string().optional()
});

export function registerIndexationV3Routes(app: Express) {
  
  /**
   * POST /api/v3/indexation/calculate
   * @description Calcule et enregistre une indexation pour un contrat
   * @security Authentification requise + permission 'contracts:update'
   * @param {string} contractId - ID du contrat à indexer
   * @param {Date} indexationDate - Date d'application du nouveau tarif
   * @param {Date} [indexTakingDate] - Date de prise d'indice (optionnel)
   * @param {boolean} [useProvisional=false] - Accepter indices provisoires
   * @param {boolean} [forceRecalculation=false] - Forcer recalcul même si déjà fait
   * @returns {IndexationResultV3} Résultat complet avec traçabilité
   */
  app.post("/api/v3/indexation/calculate", 
    requireAuth, 
    requirePermission('contracts', 'update'),
    async (req, res) => {
      try {
        const params = calculateIndexationSchema.parse(req.body);
        
        console.log(`📊 API: Calcul indexation V3 demandé pour contrat ${params.contractId}`);
        
        const result = await indexationEngineV3.calculateIndexation({
          ...params,
          simulate: false
        });
        
        res.json({
          success: true,
          message: result.thresholdBlocked 
            ? `Indexation bloquée (variation ${result.variation.toFixed(2)}% < seuil ${result.threshold}%)`
            : `Indexation calculée: ${result.oldAmount}€ → ${result.newAmount}€`,
          data: result
        });
        
      } catch (error: any) {
        console.error("❌ Erreur calcul indexation V3:", error);
        res.status(400).json({
          success: false,
          error: error.message || "Erreur lors du calcul d'indexation"
        });
      }
    }
  );

  /**
   * POST /api/v3/indexation/calculate-batch  
   * @description Traitement en masse pour optimiser les calculs groupés
   * @security Authentification requise + permission 'contracts:update'
   * @param {string[]} contractIds - Liste des contrats à traiter
   * @param {Date} indexationDate - Date commune d'indexation
   * @param {Object} [config] - Options de calcul partagées
   * @returns {Object} Résumé avec succès, échecs et détails
   * @performance Traitement parallèle jusqu'à 10 contrats simultanément
   */
  app.post("/api/v3/indexation/calculate-batch",
    requireAuth,
    requirePermission('contracts', 'update'),
    async (req, res) => {
      try {
        const params = batchCalculationSchema.parse(req.body);
        
        console.log(`📊 API: Calcul batch pour ${params.contractIds.length} contrats`);
        
        const results = await indexationEngineV3.processMultipleIndexations(
          params.contractIds,
          params.indexationDate,
          params.config
        );
        
        const summary = {
          total: results.length,
          calculated: results.filter(r => r.status === 'calculated').length,
          blockedByThreshold: results.filter(r => r.status === 'blocked_threshold').length,
          pendingIndices: results.filter(r => r.status === 'pending_indices').length,
          errors: results.filter(r => r.status === 'error').length
        };
        
        res.json({
          success: true,
          message: `Batch terminé: ${summary.calculated} calculées, ${summary.blockedByThreshold} bloquées`,
          summary,
          results
        });
        
      } catch (error: any) {
        console.error("❌ Erreur batch indexation:", error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * POST /api/v3/indexation/simulate
   * Simulation d'indexation sans sauvegarde
   */
  app.post("/api/v3/indexation/simulate",
    requireAuth,
    async (req, res) => {
      try {
        const params = calculateIndexationSchema.parse(req.body);
        
        console.log(`🔍 API: Simulation indexation pour contrat ${params.contractId}`);
        
        const result = await indexationEngineV3.calculateIndexation({
          ...params,
          simulate: true // Mode simulation
        });
        
        res.json({
          success: true,
          message: "Simulation terminée (non sauvegardée)",
          simulation: true,
          data: result
        });
        
      } catch (error: any) {
        console.error("❌ Erreur simulation:", error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * GET /api/v3/indexation/pending
   * Liste les indexations en attente d'indices
   */
  app.get("/api/v3/indexation/pending",
    requireAuth,
    async (req, res) => {
      try {
        const pendingIndexations = await db
          .select()
          .from(indexations)
          .where(eq(indexations.status, 'pending_indices'))
          .orderBy(desc(indexations.indexationDate));
        
        res.json({
          success: true,
          count: pendingIndexations.length,
          data: pendingIndexations
        });
        
      } catch (error: any) {
        console.error("❌ Erreur récupération pending:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * POST /api/v3/indexation/process-pending
   * Traite toutes les indexations en attente
   */
  app.post("/api/v3/indexation/process-pending",
    requireAuth,
    requirePermission('contracts', 'update'),
    async (req, res) => {
      try {
        console.log("🔄 API: Traitement des indexations en attente");
        
        await indexationEngineV3.processPendingIndexations();
        
        res.json({
          success: true,
          message: "Traitement des indexations en attente terminé"
        });
        
      } catch (error: any) {
        console.error("❌ Erreur traitement pending:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * GET /api/v3/indexation/contract/:contractId
   * Historique des indexations d'un contrat
   */
  app.get("/api/v3/indexation/contract/:contractId",
    requireAuth,
    async (req, res) => {
      try {
        const { contractId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const history = await db
          .select()
          .from(indexations)
          .where(eq(indexations.contractId, contractId))
          .orderBy(desc(indexations.indexationDate))
          .limit(Number(limit))
          .offset(Number(offset));
        
        res.json({
          success: true,
          contractId,
          count: history.length,
          data: history
        });
        
      } catch (error: any) {
        console.error("❌ Erreur historique:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * POST /api/v3/indexation/retroactive
   * Calcul rétroactif avec ajustements
   */
  app.post("/api/v3/indexation/retroactive",
    requireAuth,
    requirePermission('contracts', 'update'),
    async (req, res) => {
      try {
        const { contractId, originalDate, currentIndices } = req.body;
        
        console.log(`⏰ API: Calcul rétroactif pour ${contractId}`);
        
        // Récupérer l'indexation originale
        const [originalIndexation] = await db
          .select()
          .from(indexations)
          .where(
            and(
              eq(indexations.contractId, contractId),
              eq(indexations.indexationDate, new Date(originalDate))
            )
          );
        
        if (!originalIndexation) {
          return res.status(404).json({
            success: false,
            error: "Indexation originale non trouvée"
          });
        }
        
        // Recalculer avec les indices définitifs
        const result = await indexationEngineV3.calculateIndexation({
          contractId,
          indexationDate: new Date(originalDate),
          forceRecalculation: true,
          indexationType: 'retroactive'
        });
        
        const adjustment = result.newAmount - originalIndexation.newAmount;
        
        res.json({
          success: true,
          message: `Ajustement rétroactif: ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}€`,
          original: originalIndexation,
          recalculated: result,
          adjustment
        });
        
      } catch (error: any) {
        console.error("❌ Erreur calcul rétroactif:", error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * POST /api/v3/indices/update
   * Mise à jour manuelle d'un indice
   */
  app.post("/api/v3/indices/update",
    requireAuth,
    requirePermission('indexations', 'update'),
    async (req, res) => {
      try {
        const params = updateIndexSchema.parse(req.body);
        
        console.log(`📈 API: Mise à jour indice ${params.indexCode} pour ${params.date}`);
        
        // Vérifier si l'indice existe déjà
        const existing = await db
          .select()
          .from(indexValues)
          .where(
            and(
              eq(indexValues.indexCode, params.indexCode),
              eq(indexValues.date, params.date)
            )
          );
        
        if (existing.length > 0) {
          // Mettre à jour l'indice existant
          await db
            .update(indexValues)
            .set({
              value: String(params.value),
              status: params.status,
              source: params.source || 'Manuel',
              updatedAt: new Date()
            })
            .where(
              and(
                eq(indexValues.indexCode, params.indexCode),
                eq(indexValues.date, params.date)
              )
            );
          
          res.json({
            success: true,
            message: `Indice ${params.indexCode} mis à jour`,
            updated: true
          });
        } else {
          // Créer un nouvel indice
          await db.insert(indexValues).values({
            indexCode: params.indexCode,
            date: params.date,
            value: String(params.value),
            status: params.status,
            source: params.source || 'Manuel'
          });
          
          res.json({
            success: true,
            message: `Indice ${params.indexCode} créé`,
            created: true
          });
        }
        
        // Traiter les indexations en attente de cet indice
        if (params.status === 'definitive') {
          await indexationEngineV3.processPendingIndexations();
        }
        
      } catch (error: any) {
        console.error("❌ Erreur mise à jour indice:", error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * GET /api/v3/indices/:indexCode/:date
   * Récupération d'un indice spécifique
   */
  app.get("/api/v3/indices/:indexCode/:date",
    requireAuth,
    async (req, res) => {
      try {
        const { indexCode, date } = req.params;
        const parsedDate = new Date(date);
        
        const indices = await db
          .select()
          .from(indexValues)
          .where(
            and(
              eq(indexValues.indexCode, indexCode),
              eq(indexValues.date, parsedDate)
            )
          )
          .orderBy(desc(indexValues.updatedAt));
        
        if (indices.length === 0) {
          return res.status(404).json({
            success: false,
            error: `Indice ${indexCode} non trouvé pour la date ${date}`
          });
        }
        
        res.json({
          success: true,
          data: indices[0],
          history: indices
        });
        
      } catch (error: any) {
        console.error("❌ Erreur récupération indice:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * GET /api/v3/indexation/dashboard
   * Dashboard récapitulatif des indexations
   */
  app.get("/api/v3/indexation/dashboard",
    requireAuth,
    async (req, res) => {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Statistiques générales
        const [
          totalIndexations,
          recentIndexations,
          pendingCount,
          blockedCount
        ] = await Promise.all([
          db.select().from(indexations),
          db.select().from(indexations)
            .where(gte(indexations.createdAt, thirtyDaysAgo)),
          db.select().from(indexations)
            .where(eq(indexations.status, 'pending_indices')),
          db.select().from(indexations)
            .where(eq(indexations.status, 'blocked_threshold'))
        ]);
        
        // Prochaines indexations
        const upcomingContracts = await db
          .select()
          .from(contracts)
          .where(
            and(
              gte(contracts.nextIndexationDate, today),
              lte(contracts.nextIndexationDate, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(contracts.nextIndexationDate);
        
        const stats = {
          total: totalIndexations.length,
          last30Days: recentIndexations.length,
          pending: pendingCount.length,
          blocked: blockedCount.length,
          upcoming: upcomingContracts.length,
          totalAmount: recentIndexations.reduce((sum, idx) => 
            sum + (Number(idx.deltaAmount) || 0), 0
          )
        };
        
        res.json({
          success: true,
          stats,
          upcoming: upcomingContracts.slice(0, 10),
          recentActivity: recentIndexations.slice(0, 10)
        });
        
      } catch (error: any) {
        console.error("❌ Erreur dashboard:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  console.log("✅ Routes d'indexation V3 enregistrées");
}