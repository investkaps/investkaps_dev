import express from 'express';
const router = express.Router();
import multer from 'multer';
import { verifyToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';
import User from '../model/User.js';
import KycVerification from '../model/KycVerification.js';
import Document from '../model/Document.js';
import UserSubscription from '../model/UserSubscription.js';
import Subscription from '../model/Subscription.js';
import { sendEmail } from '../utils/emailService.js';
import * as adminRoleController from '../controllers/adminRoleController.js';
import { sendOnboardingReminderToUser } from '../services/onboardingReminderService.js';
import {
  getMailTypeOptions,
  buildMailPreviewPath,
  sendAdminMail
} from '../services/adminMailService.js';
import { uploadImage, uploadPDF } from '../config/cloudinary.js';
import { fetchPanKyc } from '../services/kyc_client.js';
import { extractCAMSStatus, isKYCVerified } from '../utils/camsStatusMapper.js';

const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    // Get counts for dashboard
    const userCount = await User.countDocuments({ role: 'customer' });
    const kycCount = await KycVerification.countDocuments({ status: 'success' });
    const documentCount = await Document.countDocuments();
    
    // Get recent users
    const recentUsers = await User.find({ role: 'customer' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt kycStatus.isVerified');
    
    // Get recent KYC verifications
    const recentKyc = await KycVerification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');
    
    return res.status(200).json({
      success: true,
      data: {
        counts: {
          users: userCount,
          kyc: kycCount,
          documents: documentCount
        },
        recentUsers,
        recentKyc
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard data:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/users', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('-__v');
    
    // Add active subscription flag to each user
    const usersWithSubscriptionStatus = await Promise.all(
      users.map(async (user) => {
        const activeSubscription = await UserSubscription.findOne({
          user: user._id,
          status: 'active',
          endDate: { $gt: new Date() }
        });
        
        return {
          ...user.toObject(),
          hasActiveSubscription: !!activeSubscription
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      count: usersWithSubscriptionStatus.length,
      data: usersWithSubscriptionStatus
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/users/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Manually fetch related data (only for this specific user)
    const kycVerifications = await KycVerification.find({ 
      $or: [
        { user: user._id },
        { email: user.email, user: { $exists: false } }, // Legacy records without user reference
        { clerkId: user.clerkId, user: { $exists: false } } // Legacy records by clerkId
      ]
    }).sort({ createdAt: -1 });
    
    const documents = await Document.find({ user: user._id }).sort({ createdAt: -1 });
    
    // Fetch user subscriptions
    const userSubscriptions = await UserSubscription.find({ user: user._id })
      .populate('subscription', 'name packageCode description')
      .sort({ createdAt: -1 });
    
    // Add related data to user object
    const userWithRelations = {
      ...user.toObject(),
      kycVerifications,
      documents,
      userSubscriptions,
      investments: [] // Add investments if you have an Investment model
    };
    
    return res.status(200).json({
      success: true,
      data: userWithRelations
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put('/users/:id/role', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['customer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    user.role = role;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/unblock-kyc
 * @desc    Reset a user's KYC block so they can retry verification
 * @access  Private (Admin only)
 */
router.put('/users/:id/unblock-kyc', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.kycStatus.kycBlocked = false;
    user.kycStatus.kycAttempts = 0;
    await user.save();
    return res.status(200).json({
      success: true,
      message: 'KYC block removed. User can now retry KYC verification.',
      data: { userId: user._id, email: user.email }
    });
  } catch (error) {
    console.error('Error unblocking KYC:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/kyc
 * @desc    Get all KYC verifications
 * @access  Private (Admin only)
 */
router.get('/kyc', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const kycVerifications = await KycVerification.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');
    
    return res.status(200).json({
      success: true,
      count: kycVerifications.length,
      data: kycVerifications
    });
  } catch (error) {
    console.error('Error getting KYC verifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/admin/test-whatsapp
 * @desc    Test WhatsApp message sending
 * @access  Private (Admin only)
 */
router.post('/test-whatsapp', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { recommendationId, stockSymbol, stockName } = req.body;
    
    // Import WhatsApp service
    const { sendWhatsAppTemplate } = await import('../services/whatsappService.js');
    
    // Test phone number (hardcoded for testing)
    // Note: This number must be in your Meta Business approved recipient list
    const testPhoneNumber = '919876543210'; // Change to your verified number
    
    // Send test message (try without parameters first)
    const success = await sendWhatsAppTemplate(testPhoneNumber, 'hello_world', []);
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Test WhatsApp message sent successfully',
        details: {
          phoneNumber: testPhoneNumber,
          stockSymbol,
          stockName,
          template: 'hello_world'
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to send WhatsApp message',
        details: 'Check server logs for detailed error information'
      });
    }
  } catch (error) {
    console.error('Error in test WhatsApp endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/admin/set-admin/:email
 * @desc    Set a user as admin by their email address
 * @access  Public (for initial setup only)
 */
router.get('/set-admin/:email', adminRoleController.setAdminByEmail);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Permanently delete a user account, their KYC verifications,
 *          all subscription records, all documents, and their Clerk identity.
 * @access  Private (Admin only)
 */
router.delete('/users/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Prevent admin from deleting their own account
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own admin account.'
      });
    }

    // Find the user first so we have the clerkId for Clerk deletion
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const deletionLog = {
      userId: user._id,
      email: user.email,
      clerkId: user.clerkId,
      deleted: {}
    };

    // 1. Cancel / delete all UserSubscription records
    const subResult = await UserSubscription.deleteMany({ user: user._id });
    deletionLog.deleted.subscriptions = subResult.deletedCount;

    // 2. Delete all KYC verification records
    const kycResult = await KycVerification.deleteMany({
      $or: [
        { user: user._id },
        { clerkId: user.clerkId }
      ]
    });
    deletionLog.deleted.kycVerifications = kycResult.deletedCount;

    // 3. Delete all Document records
    const docResult = await Document.deleteMany({ user: user._id });
    deletionLog.deleted.documents = docResult.deletedCount;

    // 4. Delete the User document from MongoDB
    await User.findByIdAndDelete(targetUserId);
    deletionLog.deleted.user = true;

    // 5. Delete the user from Clerk (auth provider)
    if (user.clerkId) {
      try {
        const { createClerkClient } = await import('@clerk/clerk-sdk-node');
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        await clerkClient.users.deleteUser(user.clerkId);
        deletionLog.deleted.clerkUser = true;
        console.log(`Clerk user deleted: ${user.clerkId}`);
      } catch (clerkErr) {
        // Log but do not fail — MongoDB records are already gone
        console.error(`Failed to delete Clerk user ${user.clerkId}:`, clerkErr.message);
        deletionLog.deleted.clerkUser = false;
        deletionLog.clerkError = clerkErr.message;
      }
    } else {
      deletionLog.deleted.clerkUser = false;
      deletionLog.clerkError = 'No clerkId on user record';
    }

    console.log('User deletion summary:', JSON.stringify(deletionLog, null, 2));

    return res.status(200).json({
      success: true,
      message: `User "${user.name}" (${user.email}) has been permanently deleted.`,
      data: deletionLog
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, error: 'Server error while deleting user.' });
  }
});

/**
 * @route   POST /api/admin/users/:id/test-email
 * @desc    Send a test email to the selected user
 * @access  Private (Admin only)
 */
router.post('/users/:id/test-email', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const serviceType = String(req.body.serviceType || req.query.serviceType || 'RA').toUpperCase() === 'IA' ? 'IA' : 'RA';
    const user = await User.findById(req.params.id).select('name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        error: 'User does not have an email address'
      });
    }

    const appName = 'InvestKaps';
    const html = `
      <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;">Test Email from Admin Panel</h2>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">
        Hello ${user.name || 'there'},
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">
        This is a test email sent from the admin panel to verify that the email delivery system is working correctly.
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
        If you received this message, the mail setup for ${appName} is working.
      </p>
    `;

    await sendEmail({
      to: user.email,
      subject: `Test Email from ${appName} Admin Panel`,
      html,
      serviceType
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent to ${user.email} using ${serviceType} mail`
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error while sending test email'
    });
  }
});

/**
 * @route   POST /api/admin/users/:id/onboarding-reminder
 * @desc    Send a manual onboarding reminder to the selected user
 * @access  Private (Admin only)
 */
router.post('/users/:id/onboarding-reminder', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const serviceType = String(req.body.serviceType || req.query.serviceType || 'RA').toUpperCase() === 'IA' ? 'IA' : 'RA';
    const user = await User.findById(req.params.id).select('name email verificationStatus kycStatus.isVerified profile.phoneVerified clientTypes role');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        error: 'User does not have an email address'
      });
    }

    const result = await sendOnboardingReminderToUser(user, serviceType, { force: true });

    if (result.skipped) {
      return res.status(200).json({
        success: true,
        message: `No pending ${serviceType} onboarding steps found for ${user.email}`,
        pendingSteps: result.pendingSteps,
        skipped: true
      });
    }

    return res.status(200).json({
      success: true,
      message: `${serviceType} onboarding reminder sent to ${user.email}`,
      pendingSteps: result.pendingSteps,
      skipped: false
    });
  } catch (error) {
    console.error('Error sending onboarding reminder:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error while sending onboarding reminder'
    });
  }
});

/**
 * @route   GET /api/admin/mail-types
 * @desc    Get all admin mail types
 * @access  Private (Admin only)
 */
router.get('/mail-types', verifyToken, checkRole('admin'), async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: getMailTypeOptions().map((option) => ({
        ...option,
        path: buildMailPreviewPath()
      }))
    });
  } catch (error) {
    console.error('Error fetching mail types:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/admin/mail/send
 * @desc    Send any supported mail template to a selected user
 * @access  Private (Admin only)
 */
router.post('/mail/send', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { userId, mailType, serviceType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!mailType) {
      return res.status(400).json({
        success: false,
        error: 'Mail type is required'
      });
    }

    const result = await sendAdminMail({ userId, mailType, serviceType });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error sending admin mail:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error while sending mail'
    });
  }
});

// ─── Admin Onboarding Overrides ───────────────────────────────────────────────

/**
 * @route   POST /api/admin/users/:id/override-kyc-upload
 * @desc    Manually mark PAN KYC complete by uploading an image/document
 * @access  Private (Admin only)
 */
router.post(
  '/users/:id/override-kyc-upload',
  verifyToken, checkRole('admin'),
  kycUpload.single('file'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const isPdf = req.file.mimetype === 'application/pdf';
      let cloudinaryUrl;
      if (isPdf) {
        const result = await uploadPDF(req.file.buffer, `kyc-admin-${user._id}-${Date.now()}`, 'admin-kyc-uploads');
        cloudinaryUrl = result.url;
      } else {
        const result = await uploadImage(req.file.buffer, 'admin-kyc-uploads');
        cloudinaryUrl = result.url;
      }

      const record = new KycVerification({
        user: user._id,
        clerkId: user.clerkId,
        pan: 'ADMIN000000',
        dob: '01-01-1900',
        fullName: user.name,
        kycStatus: 'VERIFIED',
        camsStatusCode: '07',
        status: 'success',
        camsDownloadData: {
          kycStatus: 'VERIFIED',
          camsStatusCode: '07',
          statusDescription: 'Manually verified by admin',
          fullName: user.name,
          recordedAt: new Date(),
          adminUploadUrl: cloudinaryUrl,
        },
      });
      await record.save();

      await User.updateOne({ _id: user._id }, {
        'kycStatus.isVerified': true,
        'kycStatus.verifiedAt': new Date(),
        'kycStatus.latestVerification': record._id,
        'verificationStatus.panKyc': true,
      });

      return res.status(200).json({ success: true, message: 'KYC manually verified via document upload', documentUrl: cloudinaryUrl });
    } catch (err) {
      console.error('Admin KYC upload error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * @route   POST /api/admin/users/:id/override-kyc-pan
 * @desc    Manually verify PAN KYC by calling CAMS API (same as user flow)
 * @access  Private (Admin only)
 */
router.post('/users/:id/override-kyc-pan', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { pan, dob } = req.body;
    if (!pan || !dob) return res.status(400).json({ success: false, error: 'pan and dob are required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const sanitizedPAN = String(pan).toUpperCase().trim();
    const sanitizedDOB = String(dob).trim();

    let kycRaw, kycData, proxyIsVerified, proxyKycStatus, proxyUserMessage;
    try {
      ({ raw: kycRaw, data: kycData, isVerified: proxyIsVerified, kycStatus: proxyKycStatus, userMessage: proxyUserMessage } =
        await fetchPanKyc(sanitizedPAN, sanitizedDOB));
    } catch (err) {
      return res.status(422).json({ success: false, error: err.message || 'KYC API call failed' });
    }

    if (!proxyIsVerified) {
      return res.status(200).json({ success: false, isVerified: false, kycStatus: proxyKycStatus, message: proxyUserMessage || 'KYC not verified by CAMS' });
    }

    const statusMapping = extractCAMSStatus(kycData);
    const record = new KycVerification({
      user: user._id,
      clerkId: user.clerkId,
      pan: sanitizedPAN,
      dob: sanitizedDOB,
      fullName: kycData?.kycData?.[0]?.name || null,
      kycStatus: statusMapping.status || 'VERIFIED',
      camsStatusCode: statusMapping.rawCode,
      status: 'success',
      rawEc2Response: kycRaw,
      camsDownloadData: { kycStatus: statusMapping.status, camsStatusCode: statusMapping.rawCode, fullName: kycData?.kycData?.[0]?.name, recordedAt: new Date() },
    });
    await record.save();

    await User.updateOne({ _id: user._id }, {
      'kycStatus.isVerified': true,
      'kycStatus.verifiedAt': new Date(),
      'kycStatus.latestVerification': record._id,
      'verificationStatus.panKyc': true,
    });

    return res.status(200).json({ success: true, message: 'KYC verified via CAMS API', isVerified: true, fullName: record.fullName });
  } catch (err) {
    console.error('Admin KYC PAN error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/:id/override-phone
 * @desc    Set user phone without OTP
 * @access  Private (Admin only)
 */
router.post('/users/:id/override-phone', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });

    const cleanPhone = String(phone).trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) return res.status(400).json({ success: false, error: 'Invalid phone number' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    await User.updateOne({ _id: user._id }, {
      'profile.phone': cleanPhone,
      'profile.phoneVerified': true,
      'verificationStatus.phone': true,
    });

    return res.status(200).json({ success: true, message: 'Phone number set by admin', phone: cleanPhone });
  } catch (err) {
    console.error('Admin phone override error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/:id/override-esign
 * @desc    Manually upload signed document and mark e-sign complete
 * @access  Private (Admin only)
 */
router.post(
  '/users/:id/override-esign',
  verifyToken, checkRole('admin'),
  kycUpload.single('file'),
  async (req, res) => {
    try {
      const { serviceType = 'RA' } = req.body;
      const svcType = serviceType === 'IA' ? 'IA' : 'RA';

      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const isPdf = req.file.mimetype === 'application/pdf';
      let cloudinaryUrl;
      if (isPdf) {
        const result = await uploadPDF(req.file.buffer, `esign-admin-${user._id}-${Date.now()}`, 'admin-esign-uploads');
        cloudinaryUrl = result.url;
      } else {
        const result = await uploadImage(req.file.buffer, 'admin-esign-uploads');
        cloudinaryUrl = result.url;
      }

      const doc = new Document({
        user: user._id,
        name: `${svcType} Agreement (Admin Upload)`,
        type: 'agreement',
        serviceType: svcType,
        fileName: req.file.originalname || 'admin-agreement',
        filePath: cloudinaryUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        esign: {
          status: 'COMPLETED',
          currentStatus: 'COMPLETED',
          signedPdfUrl: cloudinaryUrl,
          signedPdfFetchedAt: new Date(),
          signedPdfFetchedBy: 'admin',
          completedAt: new Date(),
          signingDetails: { total: 1, signed: 1, rejected: 0, expired: 0, pending: 0 },
        },
      });
      await doc.save();

      const userUpdate = {
        'verificationStatus.esign': true,
        [`clientTypes.${svcType}.isCompleted`]: true,
        [`clientTypes.${svcType}.completedAt`]: new Date(),
        [`clientTypes.${svcType}.agreementDocumentId`]: doc._id,
      };
      await User.updateOne({ _id: user._id }, userUpdate);

      return res.status(200).json({ success: true, message: `${svcType} e-sign manually completed by admin`, documentUrl: cloudinaryUrl, documentId: doc._id });
    } catch (err) {
      console.error('Admin esign override error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * @route   GET /api/admin/subscriptions/list
 * @desc    Get all available subscription plans for admin assignment
 * @access  Private (Admin only)
 */
router.get('/subscriptions/list', verifyToken, checkRole('admin'), async (_req, res) => {
  try {
    const subs = await Subscription.find({ isActive: true }).select('name packageCode serviceType planOptions pricing').sort('displayOrder');
    return res.status(200).json({ success: true, data: subs });
  } catch (err) {
    console.error('Admin subscription list error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/:id/assign-plan
 * @desc    Assign a subscription plan to a user (create new or extend existing)
 * @access  Private (Admin only)
 */
router.post('/users/:id/assign-plan', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { subscriptionId, planOptionId, durationMonths, startDate, endDate, newEndDate, adjustDays } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Set a specific new end date on an existing subscription
    if (newEndDate !== undefined) {
      const query = { user: user._id, status: 'active', endDate: { $gt: new Date() } };
      if (subscriptionId) query._id = subscriptionId;
      const sub = await UserSubscription.findOne(query).sort({ createdAt: -1 });
      if (!sub) return res.status(404).json({ success: false, error: 'No active subscription found to adjust' });
      const parsed = new Date(newEndDate);
      if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, error: 'Invalid date' });
      const oldEnd = new Date(sub.endDate).toLocaleDateString('en-IN');
      sub.endDate = parsed;
      await sub.save();
      return res.status(200).json({ success: true, message: `End date updated from ${oldEnd} to ${parsed.toLocaleDateString('en-IN')}`, newEndDate: sub.endDate });
    }

    // Legacy: adjust by number of days
    if (adjustDays !== undefined) {
      const query = { user: user._id, status: 'active', endDate: { $gt: new Date() } };
      if (subscriptionId) query._id = subscriptionId;
      const activeSub = await UserSubscription.findOne(query).sort({ createdAt: -1 });
      if (!activeSub) return res.status(404).json({ success: false, error: 'No active subscription found to adjust' });
      const days = parseInt(adjustDays, 10);
      if (isNaN(days)) return res.status(400).json({ success: false, error: 'adjustDays must be a number' });
      activeSub.endDate = new Date(activeSub.endDate.getTime() + days * 24 * 60 * 60 * 1000);
      await activeSub.save();
      return res.status(200).json({ success: true, message: `Subscription ${days >= 0 ? 'extended' : 'reduced'} by ${Math.abs(days)} days`, newEndDate: activeSub.endDate });
    }

    // Assign new plan
    if (!subscriptionId) return res.status(400).json({ success: false, error: 'subscriptionId is required' });

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ success: false, error: 'Subscription plan not found' });

    // Resolve plan option
    let planOption = null;
    if (planOptionId) {
      planOption = subscription.planOptions.find(p => p._id.toString() === planOptionId);
    }
    const months = parseInt(durationMonths, 10) || planOption?.months || 1;
    const price = planOption?.price ?? 0;

    const start = startDate ? new Date(startDate) : new Date();
    let end;
    if (endDate) {
      end = new Date(endDate);
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + months);
    }

    // Cancel any existing active subscription for same serviceType
    await UserSubscription.updateMany(
      { user: user._id, serviceType: subscription.serviceType, status: 'active' },
      { status: 'cancelled' }
    );

    const userSub = new UserSubscription({
      user: user._id,
      subscription: subscription._id,
      serviceType: subscription.serviceType,
      status: 'active',
      startDate: start,
      endDate: end,
      paymentMethod: 'manual',
      price,
      currency: subscription.currency || 'INR',
      duration: `${months} month${months > 1 ? 's' : ''}`,
      durationMonths: months,
      planOptionId: planOption?._id?.toString() || null,
      planOptionName: planOption?.name || null,
    });
    await userSub.save();

    const actualDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const durationLabel = endDate
      ? `${actualDays} day${actualDays !== 1 ? 's' : ''}`
      : `${months} month${months !== 1 ? 's' : ''}`;

    return res.status(200).json({
      success: true,
      message: `Plan "${subscription.name}" assigned for ${durationLabel} (${start.toLocaleDateString('en-IN')} → ${end.toLocaleDateString('en-IN')})`,
      subscription: { id: userSub._id, plan: subscription.name, startDate: start, endDate: end, months, days: actualDays }
    });
  } catch (err) {
    console.error('Admin assign plan error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
