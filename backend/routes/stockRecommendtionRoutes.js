import express from 'express';
const router = express.Router();
import multer from 'multer';
import * as stockRecommendationController from '../controllers/stockRecommendationController.js';
import { authenticateToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';

// Multer: memory storage for chart images (generate step) and signed PDFs
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP images and PDF files are allowed'), false);
    }
  }
});

// Base route: /api/recommendations

// Public routes - None

// Protected routes for regular users
router.get('/user', authenticateToken, stockRecommendationController.getUserRecommendations);

// Admin-only routes
router.post('/', authenticateToken, checkRole('admin'), stockRecommendationController.createRecommendation);
router.get('/', authenticateToken, checkRole('admin'), stockRecommendationController.getAllRecommendations);
router.get('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.getRecommendation);
router.put('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.updateRecommendation);
router.delete('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.deleteRecommendation);
router.post('/:id/send', authenticateToken, checkRole('admin'), stockRecommendationController.sendRecommendation);
router.post('/:id/generate-pdf', authenticateToken, checkRole('admin'), pdfUpload.single('chartImage'), stockRecommendationController.generatePDFReport);
router.post('/:id/upload-signed-pdf', authenticateToken, checkRole('admin'), pdfUpload.single('signedPdf'), stockRecommendationController.uploadSignedPDF);

export default router;
