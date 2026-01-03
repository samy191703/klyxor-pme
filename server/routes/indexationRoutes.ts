/**
 * @module IndexationRoutes
 * @description Routes API pour le calcul et la gestion des indexations
 * 
 * Endpoints disponibles :
 * - POST /calculate/:contractId - Calcul d'indexation pour un contrat
 * - POST /calculate-test-contracts - Calcul pour les 4 contrats de test
 * - GET /indices/:code/:date - Récupération d'un indice INSEE
 * - POST /indices/update - Mise à jour des indices depuis INSEE
 * - DELETE /test-contracts/reset - Réinitialisation des indexations de test
 * 
 * @author KLYXOR Team
 * @version 1.0.0
 * @since 2024-09-03
 */

import { Router } from "express";
import { indexationEngineV2 } from "../services/indexationCalculationEngineV2";
import { inseeService } from "../services/inseeService";
import { db } from "../db";
import { contracts, indexations } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

/**
 * @route POST /calculate/:contractId
 * @description Calcule l'indexation pour un contrat spécifique
 * 
 * @param {string} contractId - Identifiant unique du contrat (URL param)
 * @param {Date} [indexationDate] - Date d'indexation (body)
 * @param {boolean} [simulate=false] - Mode simulation (body)
 * 
 * @returns {Object} Résultat du calcul avec détails
 * @returns {boolean} success - Statut de l'opération
 * @returns {Object} result - Détails du calcul d'indexation
 * @returns {string} message - Message de confirmation
 * 
 * @example
 * POST /api/indexation-v2/calculate/abc123
 * Body: { "indexationDate": "2024-09-01", "simulate": false }
 */
router.post("/calculate/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;
    const { indexationDate, simulate = false } = req.body;
    
    const result = await indexationEngineV2.calculateIndexation({
      contractId,
      indexationDate: new Date(indexationDate || Date.now()),
      simulate
    });
    
    res.json({
      success: true,
      result,
      message: simulate ? "Simulation terminée" : "Indexation calculée et sauvegardée"
    });
  } catch (error: any) {
    console.error("Erreur calcul indexation:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route POST /calculate-test-contracts
 * @description Calcule les indexations pour les 4 contrats de test ENGIE
 * 
 * Contrats traités :
 * - AUX89 : Type 1 (ICHT simple)
 * - FIG83 : Type 2.A (ICHT+FMOA pondéré)
 * - SCM29 : Type 3 (CPI avec seuil)
 * - GLB04 : Type 2.A (avec cap 2%)
 * 
 * @returns {Object} Résultats détaillés pour chaque contrat
 * @returns {Array} results - Tableau des résultats par contrat
 * @returns {Object} summary - Résumé (total, succès, échecs)
 * 
 * @example
 * POST /api/indexation-v2/calculate-test-contracts
 */
router.post("/calculate-test-contracts", async (req, res) => {
  try {
    const parkCodes = ['AUX89', 'FIG83', 'SCM29', 'GLB04'];
    
    // Récupérer les contrats de test
    const testContracts = await db
      .select()
      .from(contracts)
      .where(inArray(contracts.parkCode, parkCodes));
    
    const results = [];
    
    for (const contract of testContracts) {
      try {
        // Déterminer la date d'indexation selon le document
        let indexationDate: Date;
        
        switch (contract.parkCode) {
          case 'AUX89':
            indexationDate = new Date('2024-09-24');
            break;
          case 'FIG83':
          case 'SCM29':
            indexationDate = new Date('2024-09-01');
            break;
          case 'GLB04':
            indexationDate = new Date('2025-01-01');
            break;
          default:
            indexationDate = new Date();
        }
        
        const result = await indexationEngineV2.calculateIndexation({
          contractId: contract.id,
          indexationDate,
          simulate: false
        });
        
        results.push({
          contract: contract.parkCode,
          success: true,
          result
        });
        
      } catch (error: any) {
        results.push({
          contract: contract.parkCode,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error: any) {
    console.error("Erreur calcul contrats test:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route GET /indices/:code/:date
 * @description Récupère la valeur d'un indice INSEE à une date donnée
 * 
 * @param {string} code - Code de l'indice (ICHT, FM0A, IPC)
 * @param {string} date - Date au format ISO (YYYY-MM-DD)
 * 
 * @returns {Object} Valeur de l'indice
 * @returns {string} code - Code de l'indice
 * @returns {string} date - Date demandée
 * @returns {number|null} value - Valeur de l'indice
 * @returns {string} status - 'found' ou 'not_found'
 * 
 * @example
 * GET /api/indexation-v2/indices/ICHT/2024-09-01
 */
router.get("/indices/:code/:date", async (req, res) => {
  try {
    const { code, date } = req.params;
    const value = await inseeService.getIndiceValue(
      code,
      new Date(date)
    );
    
    res.json({
      code,
      date,
      value,
      status: value ? 'found' : 'not_found'
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * @route POST /indices/update
 * @description Met à jour les indices depuis INSEE
 * 
 * @note Actuellement en mode simulation - implémentation API INSEE à venir
 * 
 * @returns {Object} Statut de la mise à jour
 * @returns {boolean} success - Succès de l'opération
 * @returns {string} message - Message de confirmation
 * 
 * @example
 * POST /api/indexation-v2/indices/update
 */
router.post("/indices/update", async (req, res) => {
  try {
    await inseeService.updateIndicesFromInsee();
    res.json({
      success: true,
      message: "Indices mis à jour depuis INSEE"
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * @route DELETE /test-contracts/reset
 * @description Réinitialise les indexations des contrats de test
 * 
 * Supprime toutes les indexations existantes pour :
 * - AUX89-2024
 * - FIG83-2024
 * - SCM29-2024
 * - GLB04-2024
 * 
 * @returns {Object} Statut de la réinitialisation
 * @returns {boolean} success - Succès de l'opération
 * @returns {string} message - Message de confirmation
 * 
 * @example
 * DELETE /api/indexation-v2/test-contracts/reset
 */
router.delete("/test-contracts/reset", async (req, res) => {
  try {
    const parkCodes = ['AUX89-2024', 'FIG83-2024', 'SCM29-2024', 'GLB04-2024'];
    
    // Supprimer les indexations existantes
    await db
      .delete(indexations)
      .where(inArray(indexations.contractNumber, parkCodes));
    
    res.json({
      success: true,
      message: "Indexations des contrats test réinitialisées"
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

export default router;