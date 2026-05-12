import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleAuth.js';
import * as questionnaireController from '../controllers/questionnaireController.js';

// ===== ADMIN ROUTES =====

/**
 * @route   GET /api/questionnaire/admin/all
 * @desc    Get all questionnaires
 * @access  Private (Admin only)
 */
router.get('/admin/all', verifyToken, checkRole('admin'), questionnaireController.getAllQuestionnaires);

/**
 * @route   GET /api/questionnaire/admin/:id
 * @desc    Get questionnaire by ID
 * @access  Private (Admin only)
 */
router.get('/admin/:id', verifyToken, checkRole('admin'), questionnaireController.getQuestionnaireById);

/**
 * @route   POST /api/questionnaire/admin/create
 * @desc    Create new questionnaire
 * @access  Private (Admin only)
 */
router.post('/admin/create', verifyToken, checkRole('admin'), questionnaireController.createQuestionnaire);

/**
 * @route   PUT /api/questionnaire/admin/:id
 * @desc    Update questionnaire
 * @access  Private (Admin only)
 */
router.put('/admin/:id', verifyToken, checkRole('admin'), questionnaireController.updateQuestionnaire);

/**
 * @route   DELETE /api/questionnaire/admin/:id
 * @desc    Delete questionnaire
 * @access  Private (Admin only)
 */
router.delete('/admin/:id', verifyToken, checkRole('admin'), questionnaireController.deleteQuestionnaire);

/**
 * @route   GET /api/questionnaire/admin/responses/all
 * @desc    Get all user responses
 * @access  Private (Admin only)
 */
router.get('/admin/responses/all', verifyToken, checkRole('admin'), questionnaireController.getAllResponses);

/**
 * @route   GET /api/questionnaire/admin/responses/:id
 * @desc    Get response by ID
 * @access  Private (Admin only)
 */
router.get('/admin/responses/:id', verifyToken, checkRole('admin'), questionnaireController.getResponseById);

// ===== USER ROUTES =====

/**
 * @route   GET /api/questionnaire/active
 * @desc    Get active questionnaire for IA service
 * @access  Private
 */
router.get('/active', verifyToken, questionnaireController.getActiveQuestionnaire);

/**
 * @route   POST /api/questionnaire/submit
 * @desc    Submit questionnaire response
 * @access  Private
 */
router.post('/submit', verifyToken, questionnaireController.submitResponse);

/**
 * @route   GET /api/questionnaire/my-response
 * @desc    Get user's own response
 * @access  Private
 */
router.get('/my-response', verifyToken, questionnaireController.getUserResponse);

export default router;
