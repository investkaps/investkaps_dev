const express = require('express');
const router = express.Router();
const { createSignRequest, checkSignStatus } = require('../utils/leegality');
const { verifyToken } = require('../middleware/auth');
const Document = require('../model/Document');
const logger = require('../utils/logger');

function base64Preview(b64) {
  if (!b64 || typeof b64 !== 'string') return { length: 0, head: '', tail: '' };
  return { length: b64.length, head: b64.slice(0, 40), tail: b64.slice(-40) };
}

// POST /api/esign
router.post('/esign', verifyToken, async (req, res) => {
  try {
    const { name, profileId, file, irn, invitees, fileName } = req.body;
    const userId = req.user?.id; // Get user ID from auth token
    
    // ✅ FIXED: Proper extraction from invitees array
    const invitee = Array.isArray(invitees) && invitees.length ? invitees[0] : undefined;
    const email = invitee?.email;
    const inviteeName = invitee?.name;

    const pdfBase64 = file?.file;

    // ✅ FIXED: Proper validation for PDF workflow
    if (!profileId || !pdfBase64 || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: profileId, file.file (base64), email',
        debug: {
          receivedProfileId: !!profileId,
          receivedFileObject: !!file,
          receivedFileFile: !!pdfBase64,
          receivedInviteesArray: Array.isArray(invitees),
          receivedInviteeEmail: !!email
        }
      });
    }

    // Log metadata
    const preview = base64Preview(pdfBase64);
    const logEntry = {
      ts: new Date().toISOString(),
      profileId,
      fileName: file?.name || fileName || 'Terms and Conditions',
      invitee: { name: inviteeName || name || '', email },
      base64Length: preview.length,
      base64Head: preview.head,
      base64Tail: preview.tail
    };
    console.info('[ESIGN ROUTE] Request metadata:', logEntry);

    // ✅ FIXED: Pass correct parameters
    const result = await createSignRequest({
      name: inviteeName || name || '',
      email,
      profileId,
      pdfBase64,
      fileName: file?.name || fileName || 'Terms and Conditions',
      irn
    });

    if (result.success) {
      // Extract documentId from Leegality response
      const documentId = result.data?.data?.documentId || result.data?.data?.requestId || irn;
      
      // Store in MongoDB
      if (userId && documentId) {
        try {
          const document = new Document({
            user: userId,
            name: fileName || 'Terms and Conditions',
            type: 'agreement',
            fileName: fileName || 'Terms and Conditions',
            filePath: '/esign/documents',
            fileSize: 0,
            mimeType: 'application/pdf',
            esign: {
              requestId: documentId,
              status: 'pending',
              signUrl: result.data?.data?.invitees?.[0]?.signUrl || '',
              irn: irn || documentId
            }
          });
          
          await document.save();
          logger.info(`Document saved to DB for user ${userId}, documentId: ${documentId}, mongoId: ${document._id}`);
          
          // Add MongoDB document ID to response for frontend to store
          if (!result.data) result.data = {};
          result.data.mongoDocumentId = document._id.toString();
        } catch (dbError) {
          logger.error('Error saving document to DB:', dbError);
          // Continue even if DB save fails - don't block the e-sign flow
        }
      }
      
      return res.json(result);
    } else {
      return res.status(result.httpStatus || 500).json({
        success: false,
        error: result.error || 'Failed to create sign request',
        details: result.details || undefined
      });
    }
  } catch (err) {
    console.error('[ESIGN ROUTE] Unexpected error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/esign/:requestId
router.get('/esign/:requestId', async (req, res) => {
  try {
    const requestId = req.params.requestId;
    if (!requestId) return res.status(400).json({ success: false, error: 'Missing requestId' });

    const result = await checkSignStatus(requestId);
    if (result.success) return res.json(result);
    return res.status(result.httpStatus || 500).json({ 
      success: false, 
      error: result.error, 
      details: result.details 
    });
  } catch (err) {
    console.error('[ESIGN ROUTE] Error fetching status:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/esign/document/:documentId - Check document status by MongoDB ID
router.get('/esign/document/:documentId', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;
    
    if (!documentId) {
      return res.status(400).json({ success: false, error: 'Missing documentId' });
    }
    
    // Find document by ID and verify it belongs to the user
    const document = await Document.findOne({
      _id: documentId,
      user: userId
    });
    
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found or access denied' 
      });
    }
    
    return res.json({
      success: true,
      data: {
        documentId: document._id,
        status: document.esign?.status || 'pending',
        signedAt: document.esign?.signedAt,
        requestId: document.esign?.requestId,  // Leegality requestId for status checking
        signUrl: document.esign?.signUrl,
        irn: document.esign?.irn
      }
    });
  } catch (err) {
    logger.error('[ESIGN ROUTE] Error fetching document status:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/esign/bypass - Bypass e-signing for testing
router.post('/esign/bypass', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    logger.info(`E-Sign Bypass Request for user: ${userId}`);
    
    // Check if user already has a completed e-sign document
    const existingDocument = await Document.findOne({
      user: userId,
      'esign.status': 'completed'
    });
    
    if (existingDocument) {
      logger.info(`User ${userId} already has a completed e-sign document`);
      return res.status(200).json({
        success: true,
        message: 'E-sign already completed',
        isAlreadySigned: true,
        documentId: existingDocument._id,
        data: {
          requestId: existingDocument.esign.requestId,
          status: existingDocument.esign.status,
          signedAt: existingDocument.esign.signedAt
        }
      });
    }
    
    // Create a test document with completed e-sign
    const testDocument = new Document({
      user: userId,
      name: 'Terms and Conditions (Test)',
      type: 'agreement',
      fileName: 'terms_and_conditions_test.pdf',
      filePath: '/test/terms_and_conditions_test.pdf',
      fileSize: 0,
      mimeType: 'application/pdf',
      esign: {
        requestId: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'completed',
        signedAt: new Date(),
        signUrl: 'https://test.example.com/signed-document',
        irn: `TEST_IRN_${Date.now()}`
      }
    });
    
    await testDocument.save();
    logger.info(`Test e-sign document created for user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'E-sign bypassed successfully',
      documentId: testDocument._id,
      data: {
        requestId: testDocument.esign.requestId,
        status: testDocument.esign.status,
        signedAt: testDocument.esign.signedAt,
        irn: testDocument.esign.irn
      }
    });
    
  } catch (err) {
    logger.error('[ESIGN BYPASS] Error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/esign/update-status - Update document status after checking Leegality
router.post('/esign/update-status', async (req, res) => {
  try {
    const { documentId, status } = req.body;
    
    if (!documentId || !status) {
      return res.status(400).json({ success: false, error: 'Missing documentId or status' });
    }
    
    // Find and update document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }
    
    document.esign.status = status;
    if (status === 'completed') {
      document.esign.signedAt = new Date();
    }
    await document.save();
    
    logger.info(`Document ${documentId} status updated to: ${status}`);
    
    return res.json({
      success: true,
      message: 'Document status updated successfully'
    });
    
  } catch (err) {
    logger.error('[ESIGN UPDATE STATUS] Error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/esign/webhook - Webhook for Leegality to notify completion
router.post('/esign/webhook', async (req, res) => {
  try {
    logger.info('[ESIGN WEBHOOK] Received callback from Leegality:', req.body);
    
    const { requestId, status, signedAt, irn } = req.body;
    
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Missing requestId' });
    }
    
    // Find document by requestId and update status
    const document = await Document.findOne({ 'esign.requestId': requestId });
    
    if (document) {
      document.esign.status = status || 'completed';
      if (signedAt) document.esign.signedAt = new Date(signedAt);
      await document.save();
      
      logger.info(`[ESIGN WEBHOOK] Document ${document._id} updated with status: ${status}`);
    } else {
      logger.warn(`[ESIGN WEBHOOK] Document not found for requestId: ${requestId}`);
    }
    
    // Always return 200 to acknowledge receipt
    return res.status(200).json({ success: true, message: 'Webhook received' });
    
  } catch (err) {
    logger.error('[ESIGN WEBHOOK] Error processing webhook:', err);
    // Still return 200 to prevent Leegality from retrying
    return res.status(200).json({ success: true, message: 'Webhook received with errors' });
  }
});

module.exports = router;
 