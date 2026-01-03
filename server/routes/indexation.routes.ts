import { Router } from 'express';
import { IndexationController } from '../modules/indexation/api/IndexationController';

const router = Router();
const controller = new IndexationController();

// Scheduler routes
router.post('/scheduler/start', (req, res) => controller.startScheduler(req, res));
router.post('/scheduler/stop', (req, res) => controller.stopScheduler(req, res));
router.post('/scheduler/run', async (req, res) => await controller.runScheduler(req, res));

// Proposals routes
router.post('/proposals', async (req, res) => await controller.createProposal(req, res));
router.get('/proposals', async (req, res) => await controller.searchProposals(req, res));
router.get('/proposals/:proposalId', async (req, res) => await controller.getProposal(req, res));
router.post('/proposals/:proposalId/submit', async (req, res) => await controller.submitProposal(req, res));
router.post('/proposals/:proposalId/validate', async (req, res) => await controller.validateProposal(req, res));

// Indices routes
router.get('/indices/:indexKey/:period', async (req, res) => await controller.getIndexValue(req, res));
router.post('/indices/manual', async (req, res) => await controller.saveManualIndex(req, res));

// Formula routes
router.post('/formula/test', (req, res) => controller.testFormula(req, res));

// Reports routes
router.get('/reports', async (req, res) => await controller.searchReports(req, res));
router.get('/reports/:reportId', async (req, res) => await controller.getReport(req, res));

// Stats route
router.get('/stats', async (req, res) => await controller.getStats(req, res));

export default router;