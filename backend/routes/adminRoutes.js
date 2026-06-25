import express from 'express';
const router = express.Router();
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
const __adminRoutesDir = path.dirname(fileURLToPath(import.meta.url));
const KYC_LOGO_PATH = path.resolve(__adminRoutesDir, '../../frontend/public/logo.png');
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
import PDFDocument from 'pdfkit';
import { fetchPanKyc } from '../services/kyc_client.js';
import ModelPortfolio from '../model/ModelPortfolio.js';
import PaymentRequest from '../model/PaymentRequest.js';
import { extractCAMSStatus, isKYCVerified } from '../utils/camsStatusMapper.js';
import { generateInvoiceNumber, generateInvoicePDF, uploadInvoicePDF } from '../utils/invoiceGenerator.js';

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
      camsDownloadData: {
        kycStatus: statusMapping.status,
        camsStatusCode: statusMapping.rawCode,
        statusDescription: statusMapping.description,
        kycMode: kycData?.kycData?.[0]?.kycMode || null,
        signFlag: kycData?.kycData?.[0]?.signFlag || null,
        ipvFlag: kycData?.kycData?.[0]?.ipvFlag || null,
        ipvDate: kycData?.kycData?.[0]?.ipvDate || null,
        applicationNo: kycData?.kycData?.[0]?.appNo || null,
        registrationDate: kycData?.kycData?.[0]?.date || null,
        fullName: kycData?.kycData?.[0]?.name || null,
        fatherName: kycData?.kycData?.[0]?.firtName || null,
        gender: kycData?.kycData?.[0]?.gender || null,
        nationality: kycData?.kycData?.[0]?.nationality || null,
        address: kycData?.kycData?.[0]?.corAddress1 || null,
        mobile: kycData?.kycData?.[0]?.mobileNo || null,
        email: kycData?.kycData?.[0]?.email || null,
        dob: kycData?.kycData?.[0]?.dob || null,
        recordedAt: new Date(),
      },
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
    const subs = await Subscription.find({ isActive: true, isReferralPlan: { $ne: true } }).select('name packageCode serviceType planOptions pricing').sort('displayOrder');
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

// ─── Reassign (reactivate) a cancelled subscription within its original period ─
router.patch('/users/:userId/subscriptions/:subId/reassign', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { userId, subId } = req.params;
    const userSub = await UserSubscription.findOne({ _id: subId, user: userId });
    if (!userSub) return res.status(404).json({ success: false, error: 'Subscription record not found' });
    if (userSub.status !== 'cancelled') return res.status(400).json({ success: false, error: 'Only cancelled subscriptions can be reassigned' });
    const endDay = new Date(userSub.endDate).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (endDay < today) return res.status(400).json({ success: false, error: 'Subscription period has already expired' });

    userSub.status = 'active';
    await userSub.save();
    return res.status(200).json({ success: true, message: 'Subscription reactivated successfully' });
  } catch (err) {
    console.error('Admin reassign subscription error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Remove / Delete a user's individual subscription ────────────────────────
// ?mode=unassign  → marks status 'cancelled', record kept in history
// ?mode=delete    → hard deletes the record entirely
router.delete('/users/:userId/subscriptions/:subId', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { userId, subId } = req.params;
    const mode = req.query.mode || 'unassign';

    const userSub = await UserSubscription.findOne({ _id: subId, user: userId });
    if (!userSub) return res.status(404).json({ success: false, error: 'Subscription record not found' });

    if (mode === 'delete') {
      await UserSubscription.deleteOne({ _id: subId });
      return res.status(200).json({ success: true, message: 'Subscription record permanently deleted' });
    }

    // unassign — cancel but keep history (preserve original endDate)
    userSub.status = 'cancelled';
    await userSub.save();
    return res.status(200).json({ success: true, message: 'Subscription unassigned (record kept in history)' });
  } catch (err) {
    console.error('Admin remove subscription error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Model Portfolios ─────────────────────────────────────────────────────────

router.get('/model-portfolios', verifyToken, checkRole('admin'), async (_req, res) => {
  try {
    const portfolios = await ModelPortfolio.find()
      .populate('subscription', 'name planOptions')
      .sort({ displayOrder: 1, createdAt: -1 });
    return res.status(200).json({ success: true, data: portfolios });
  } catch (err) {
    console.error('Error listing model portfolios:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Notify all active subscribers of a subscription plan ─────────────────────
const notifyPortfolioSubscribers = async (subscriptionId, subject, buildHtml) => {
  try {
    const activeSubs = await UserSubscription.find({
      subscription: subscriptionId,
      status: 'active',
      endDate: { $gt: new Date() },
    }).populate('user', 'name email').lean();

    const results = await Promise.allSettled(
      activeSubs
        .filter(s => s.user?.email)
        .map(s => sendEmail({
          to: s.user.email,
          subject,
          html: buildHtml(s.user.name || 'Valued Subscriber'),
          serviceType: 'RA',
        }))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[PORTFOLIO EMAIL] subject="${subject}" sent=${sent} failed=${failed}`);
  } catch (err) {
    console.error('[PORTFOLIO EMAIL] Failed to notify subscribers:', err.message);
  }
};

router.post('/model-portfolios', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { name, description, subscription, stocks, isActive, displayOrder } = req.body;
    const portfolio = new ModelPortfolio({
      name,
      description,
      subscription,
      stocks,
      isActive,
      displayOrder,
      createdBy: req.user._id || req.user.id
    });
    await portfolio.save();

    // Non-blocking email to all active subscribers
    if (subscription && isActive !== false) {
      const stockList = (stocks || []).map(s =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${s.stockSymbol}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${s.stockName}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">Rs. ${s.buyRange?.min ?? '—'} – ${s.buyRange?.max ?? '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">Rs. ${s.targetPrice1}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">Rs. ${s.stopLoss}</td>
        </tr>`
      ).join('');

      notifyPortfolioSubscribers(
        subscription,
        `New Model Portfolio Available: ${name}`,
        (userName) => `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#334155;">
            <div style="background:#1e3a5f;padding:24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:22px;">InvestKaps</h1>
              <p style="color:#c7d8f0;margin:6px 0 0;font-size:13px;">...driven by research, guided by expertise</p>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px;">Dear ${userName},</p>
              <p style="margin:0 0 16px;">We have launched a new <strong>Model Portfolio</strong> for your subscription plan.</p>
              <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 4px;">${name}</h2>
              <p style="color:#64748b;margin:0 0 20px;font-size:13px;">${description || ''}</p>
              ${stockList ? `
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                <thead>
                  <tr style="background:#1e3a5f;color:#fff;">
                    <th style="padding:8px 10px;text-align:left;">Symbol</th>
                    <th style="padding:8px 10px;text-align:left;">Name</th>
                    <th style="padding:8px 10px;text-align:left;">Buy Range</th>
                    <th style="padding:8px 10px;text-align:left;">Target</th>
                    <th style="padding:8px 10px;text-align:left;">Stop Loss</th>
                  </tr>
                </thead>
                <tbody>${stockList}</tbody>
              </table>` : ''}
              <p style="color:#64748b;font-size:12px;margin:20px 0 0;">Log in to your InvestKaps dashboard to view the full portfolio details.</p>
            </div>
            <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
              InvestKaps | A-144, Vivek Vihar, Phase-1, Delhi-110095 | SEBI Reg: INH000016834
            </div>
          </div>`
      );
    }

    return res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error creating model portfolio:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

router.put('/model-portfolios/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { name, description, stocks, isActive, displayOrder } = req.body;
    const portfolio = await ModelPortfolio.findByIdAndUpdate(
      req.params.id,
      { name, description, stocks, isActive, displayOrder },
      { new: true, runValidators: true }
    );
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    return res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error updating model portfolio:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

router.delete('/model-portfolios/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const portfolio = await ModelPortfolio.findByIdAndDelete(req.params.id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    return res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    console.error('Error deleting model portfolio:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/model-portfolios/:id/rebalance', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { changes, stocks } = req.body;
    const portfolio = await ModelPortfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });

    portfolio.rebalanceHistory.push({
      rebalancedBy: req.user._id || req.user.id,
      changes,
      snapshot: portfolio.stocks.toObject ? portfolio.stocks.toObject() : [...portfolio.stocks]
    });
    if (stocks) portfolio.stocks = stocks;
    await portfolio.save();

    // Non-blocking email to all active subscribers
    const newStocks = stocks || portfolio.stocks;
    const stockList = (Array.isArray(newStocks) ? newStocks : []).map(s =>
      `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${s.stockSymbol}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${s.stockName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">Rs. ${s.buyRange?.min ?? '—'} – ${s.buyRange?.max ?? '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">Rs. ${s.targetPrice1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">Rs. ${s.stopLoss}</td>
      </tr>`
    ).join('');

    notifyPortfolioSubscribers(
      portfolio.subscription,
      `Portfolio Rebalanced: ${portfolio.name}`,
      (userName) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#334155;">
          <div style="background:#1e3a5f;padding:24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">InvestKaps</h1>
            <p style="color:#c7d8f0;margin:6px 0 0;font-size:13px;">...driven by research, guided by expertise</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;">Dear ${userName},</p>
            <p style="margin:0 0 16px;">Your <strong>${portfolio.name}</strong> model portfolio has been <strong>rebalanced</strong>.</p>
            ${changes ? `<div style="background:#f0f9ff;border-left:4px solid #1e3a5f;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#334155;">${changes}</div>` : ''}
            ${stockList ? `
            <p style="font-weight:600;margin:0 0 8px;color:#1e3a5f;">Updated Portfolio Holdings</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
              <thead>
                <tr style="background:#1e3a5f;color:#fff;">
                  <th style="padding:8px 10px;text-align:left;">Symbol</th>
                  <th style="padding:8px 10px;text-align:left;">Name</th>
                  <th style="padding:8px 10px;text-align:left;">Buy Range</th>
                  <th style="padding:8px 10px;text-align:left;">Target</th>
                  <th style="padding:8px 10px;text-align:left;">Stop Loss</th>
                </tr>
              </thead>
              <tbody>${stockList}</tbody>
            </table>` : ''}
            <p style="color:#64748b;font-size:12px;margin:20px 0 0;">Log in to your InvestKaps dashboard to view the complete updated portfolio.</p>
          </div>
          <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
            InvestKaps | A-144, Vivek Vihar, Phase-1, Delhi-110095 | SEBI Reg: INH000016834
          </div>
        </div>`
    );

    return res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error rebalancing model portfolio:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — KYC PDF export
   ═══════════════════════════════════════════════════════════════ */

// Lookup maps for CAMS codes
const GENDER_MAP = { M: 'Male', F: 'Female', T: 'Transgender' };
const OCCUPATION_MAP = {
  '01': 'Private Sector', '02': 'Public Sector', '03': 'Business',
  '04': 'Professional', '05': 'Agriculture', '06': 'Retired',
  '07': 'Housewife', '08': 'Student', '99': 'Others',
};
const INCOME_MAP = {
  '01': 'Below 1 Lakh', '02': '1-5 Lakh', '03': '5-10 Lakh',
  '04': '10-25 Lakh', '05': '> 25 Lakh', '06': '> 1 Crore',
};
const MARITAL_MAP = { '01': 'Single', '02': 'Married', '03': 'Others' };
const NATIONALITY_MAP = { '01': 'Indian' };
const RES_STATUS_MAP = { R: 'Resident Individual', N: 'Non-Resident', F: 'Foreign National' };
const KYC_MODE_MAP = {
  '1': 'In-Person', '2': 'In-Person', '3': 'Aadhaar OTP',
  '4': 'Aadhaar Biometric', '5': 'Online (eKYC)', '6': 'Video KYC',
};

const buildKycPDF = async (kycId) => {
  const kyc = await KycVerification.findById(kycId).populate('user', 'name email').lean();
  if (!kyc) throw Object.assign(new Error('KYC record not found'), { status: 404 });

  const d = kyc.camsDownloadData || {};
  // Raw CAMS API record — the most complete source
  const r = kyc.rawEc2Response?.data?.kycData?.[0] || {};

  // Helpers
  const val = (v) => (v && String(v).trim()) || '—';
  const pick = (...vs) => { for (const v of vs) { if (v && String(v).trim()) return String(v).trim(); } return null; };
  const fmtDate = (s) => {
    if (!s) return '—';
    const dt = new Date(s);
    return isNaN(dt) ? String(s) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const boolFlag = (v) => v === 'Y' ? 'Yes' : v === 'N' ? 'No' : v ? String(v) : null;

  // Build full correspondence address from raw fields
  const buildAddress = (a1, a2, a3, city, pin, state) => {
    const parts = [a1, a2, a3, city, pin ? `PIN: ${pin}` : '', state ? `State Code: ${state}` : ''].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  };
  const corAddr = buildAddress(r.corAddress1, r.corAddress2, r.corAddress3, r.corCity, r.corPincode, r.corState)
    || d.address || null;
  const perAddr = buildAddress(r.perAddress1, r.perAddress2, r.perAddress3, r.perCity, r.perPincode, r.perState) || null;

  const NAVY = '#1e3a5f';
  const LIGHT = '#f8fafc';
  const BORDER = '#e2e8f0';
  const TEXT = '#334155';
  const MUTED = '#64748b';
  const W = 595.28;
  const M = 40;
  const CW = W - M * 2;

  const LOGO = KYC_LOGO_PATH;

  const sections = [
    {
      title: 'User Information',
      rows: [
        ['Platform Name', kyc.user?.name],
        ['Platform Email', kyc.user?.email],
      ],
    },
    {
      title: 'Personal Details',
      rows: [
        ['Full Name', pick(r.name, d.fullName, kyc.fullName)],
        ["Father's / Guardian's Name", pick(r.firtName, d.fatherName)],
        ['Date of Birth', pick(r.dob, d.dob, kyc.dob)],
        ['Gender', GENDER_MAP[pick(r.gender, d.gender)] || pick(r.gender, d.gender)],
        ['Marital Status', MARITAL_MAP[r.maritalStatus] || r.maritalStatus || null],
        ['Nationality', NATIONALITY_MAP[pick(r.nationality, d.nationality)] || pick(r.nationality, d.nationality)],
        ['Residential Status', RES_STATUS_MAP[r.resStatus] || r.resStatus || null],
        ['Occupation', OCCUPATION_MAP[r.occupation] || r.occupation || null],
        ['Income Slab', INCOME_MAP[r.income] || r.income || null],
        ['PAN Number', pick(r.pan, kyc.pan)],
        ['PAN Copy Submitted', boolFlag(r.panCopy)],
        ['Aadhaar Linked', r.uidNo === 'Y' ? 'Yes' : r.uidNo === 'N' ? 'No' : null],
      ],
    },
    {
      title: 'Contact Details',
      rows: [
        ['Mobile', pick(r.mobileNo, d.mobile)],
        ['Email', pick(r.email, d.email)],
        ['Office Phone', r.offNo || null],
        ['Residence Phone', r.resNo || null],
      ],
    },
    {
      title: 'Correspondence Address',
      rows: [
        ['Address Line 1', r.corAddress1 || null],
        ['Address Line 2', r.corAddress2 || null],
        ['Address Line 3', r.corAddress3 || null],
        ['City', r.corCity || null],
        ['Pincode', r.corPincode || null],
        ['State Code', r.corState || null],
        ['Country Code', r.corCountry || null],
        ['Address (Combined)', !r.corAddress1 ? corAddr : null],
      ],
    },
    {
      title: 'Permanent Address',
      rows: [
        ['Address Line 1', r.perAddress1 || null],
        ['Address Line 2', r.perAddress2 || null],
        ['Address Line 3', r.perAddress3 || null],
        ['City', r.perCity || null],
        ['Pincode', r.perPincode || null],
        ['State Code', r.perState || null],
        ['Country Code', r.perCountry || null],
      ],
    },
    {
      title: 'KYC Verification Details',
      rows: [
        ['KYC Status', pick(d.kycStatus, kyc.kycStatus)],
        ['Status Description', pick(d.statusDescription, r.errorDescription)],
        ['KYC Mode', KYC_MODE_MAP[pick(r.kycMode, d.kycMode)] || pick(r.kycMode, d.kycMode)],
        ['CAMS Status Code', pick(d.camsStatusCode, r.status, String(kyc.camsStatusCode || ''))],
        ['Status Date', pick(r.statusDate, d.registrationDate)],
        ['KRA Application No.', pick(d.applicationNo, r.appNo)],
        ['Registration Date', pick(r.date, d.registrationDate)],
        ['IPV Flag', boolFlag(pick(r.ipvFlag, d.ipvFlag))],
        ['IPV Date', pick(r.ipvDate, d.ipvDate)],
        ['Signature Available', boolFlag(pick(r.signature ? 'Y' : null, d.signFlag))],
        ['Political Connection', r.polConn === 'NA' ? 'None' : r.polConn || null],
        ['Internal Reference', r.internalRef || null],
        ['KRA Info', r.kraInfo || null],
        ['IOP Flag', r.iopFlag || null],
        ['Version', r.versionNo || null],
        ['Dump Date', r.dnlDdt || null],
        ['Verified At', fmtDate(kyc.createdAt)],
      ],
    },
    {
      title: 'FATCA / Tax Details',
      rows: [
        ['FATCA Applicable', boolFlag(r.fatcaApplicableFlag)],
        ['Birth Place', r.fatcaBirthPlace || null],
        ['Birth Country', r.fatcaBirthCountry || null],
        ['Country of Residence', r.fatcaCountryRes || null],
        ['Country of Citizenship', r.fatcaCountryCityzenship || null],
        ['FATCA Declaration Date', r.fatcaDateDeclaration || null],
      ],
    },
  ];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, W, 120).fill(NAVY);
    const logoSize = 52;
    try { doc.image(LOGO, W / 2 - logoSize / 2, 12, { width: logoSize, height: logoSize }); } catch {}
    doc.fontSize(18).fillColor('#fff').font('Helvetica-Bold').text('investkaps', M, 72, { width: CW, align: 'center' });
    doc.fontSize(9).fillColor('#c7d8f0').font('Helvetica').text('KYC Verification Report', M, 94, { width: CW, align: 'center' });

    let y = 136;

    // Meta strip — 3 rows
    const appNo = pick(d.applicationNo, r.appNo);
    doc.rect(M, y, CW, 50).fill(LIGHT).stroke(BORDER);
    // Row 1 — Application No (prominent, full width)
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('KRA Application No.:', M + 10, y + 8);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica-Bold').text(appNo || '—', M + 120, y + 8);
    // Row 2
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('PAN:', M + 10, y + 22);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(val(kyc.pan), M + 38, y + 22);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Generated:', M + 10, y + 36);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(fmtDate(new Date()), M + 68, y + 36);
    const rightX = M + CW / 2 + 10;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Record ID:', rightX, y + 22);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(String(kyc._id), rightX + 58, y + 22);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Status:', rightX, y + 36);
    const statusColor = kyc.status === 'success' ? '#16a34a' : '#dc2626';
    doc.fontSize(8).fillColor(statusColor).font('Helvetica-Bold').text(kyc.status === 'success' ? 'VERIFIED' : 'FAILED', rightX + 42, y + 36);
    y += 64;

    // Sections
    for (const section of sections) {
      // Filter blanks before rendering
      const rows = section.rows.filter(([, v]) => v && String(v).trim());

      // Skip entire section if no data (except User Information which always shows)
      if (rows.length === 0 && section.title !== 'User Information') continue;

      // Page break before section header if needed (leave 60pt buffer)
      if (y > 750) {
        doc.addPage({ size: 'A4', margin: 0 });
        y = 40;
      }

      // Section header
      doc.rect(M, y, CW, 22).fill(NAVY);
      doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold').text(section.title, M + 10, y + 6);
      y += 22;

      if (rows.length === 0) {
        doc.rect(M, y, CW, 22).fill('#fff').strokeColor(BORDER).lineWidth(0.5).stroke();
        doc.fontSize(8).fillColor(MUTED).font('Helvetica').text('No data available', M + 10, y + 7);
        y += 22;
      } else {
        rows.forEach(([label, value], i) => {
          const valStr = val(value);
          // Estimate rows needed; long values wrap at ~65 chars per line at 8pt
          const approxLines = Math.ceil(valStr.length / 65) || 1;
          const rowH = Math.max(22, approxLines * 13 + 8);

          // Mid-section page break
          if (y + rowH > 800) {
            doc.addPage({ size: 'A4', margin: 0 });
            y = 40;
            // Re-draw section header on new page
            doc.rect(M, y, CW, 22).fill(NAVY);
            doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold').text(section.title + ' (cont.)', M + 10, y + 6);
            y += 22;
          }

          doc.rect(M, y, CW, rowH).fill(i % 2 === 0 ? '#fff' : LIGHT).strokeColor(BORDER).lineWidth(0.3).stroke();
          doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text(label, M + 10, y + 7, { width: 150 });
          doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(valStr, M + 165, y + 7, { width: CW - 175, lineGap: 2 });
          y += rowH;
        });
      }
      y += 8;
    }

    // Footer
    doc.moveTo(M, y + 4).lineTo(M + CW, y + 4).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
      .text('This document is generated for internal compliance purposes only. Do not share externally without authorisation.', M, y + 10, { width: CW, align: 'center' });

    doc.end();
  });
};

/**
 * POST /api/admin/kyc/:id/pdf/preview
 * Stream KYC PDF directly — no save.
 */
router.post('/kyc/:id/pdf/preview', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const buf = await buildKycPDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="KYC_Preview.pdf"');
    res.setHeader('Content-Length', buf.length);
    return res.send(buf);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, error: err.message });
    console.error('[KYC PDF PREVIEW]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate KYC PDF' });
  }
});

/**
 * POST /api/admin/kyc/:id/pdf/save
 * Generate KYC PDF, save to Cloudinary, store URL on the KYC record.
 */
router.post('/kyc/:id/pdf/save', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const buf = await buildKycPDF(req.params.id);
    const filename = `kyc_${req.params.id}`;
    const uploaded = await uploadPDF(buf, filename, 'kyc-reports');
    await KycVerification.findByIdAndUpdate(req.params.id, {
      $set: { kycPdfUrl: uploaded.url, kycPdfPublicId: uploaded.publicId },
    });
    return res.json({ success: true, url: uploaded.url });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, error: err.message });
    console.error('[KYC PDF SAVE]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save KYC PDF' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Invoice Management
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/invoices
 * List all payment requests that have an invoice, paginated.
 */
router.get('/invoices', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { invoiceNumber: { $exists: true, $ne: null } };

    let results = await PaymentRequest.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(r =>
        r.invoiceNumber?.toLowerCase().includes(s) ||
        r.billingName?.toLowerCase().includes(s) ||
        r.user?.email?.toLowerCase().includes(s) ||
        r.user?.name?.toLowerCase().includes(s)
      );
    }

    const total = results.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginated = results.slice(skip, skip + Number(limit));

    return res.json({ success: true, data: paginated, total, page: Number(page) });
  } catch (err) {
    console.error('[ADMIN INVOICES] GET error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/**
 * POST /api/admin/invoices/preview
 * Generate invoice PDF and stream it back directly — no save, no email.
 */
router.post('/invoices/preview', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const {
      billingName, billingState, email, phone, pan,
      packageName, duration, amount, coupon = 0,
      serviceType = 'RA', transactionId = 'PREVIEW',
    } = req.body;

    if (!billingName || !billingState || !packageName || !amount) {
      return res.status(400).json({ success: false, message: 'billingName, billingState, packageName, and amount are required.' });
    }

    const invoiceNumber = `PREVIEW-${Date.now()}`;
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      date: new Date(),
      serviceType,
      billingName,
      billingState,
      pan: pan || null,
      email: email || '',
      phone: phone || '',
      transactionId,
      packageName,
      duration: duration || '',
      amount: Number(amount),
      coupon: Number(coupon) || 0,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_Preview.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[ADMIN INVOICE PREVIEW] error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Server error.' });
  }
});

/**
 * POST /api/admin/invoices/create
 * Generate a custom invoice (not tied to a payment request), upload to Cloudinary, optionally email it.
 */
router.post('/invoices/create', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const {
      billingName, billingState, email, phone, pan,
      packageName, duration, amount, coupon = 0,
      serviceType = 'RA', sendEmail: doSendEmail = true,
    } = req.body;

    if (!billingName || !billingState || !email || !packageName || !amount) {
      return res.status(400).json({ success: false, message: 'billingName, billingState, email, packageName, and amount are required.' });
    }

    const invoiceNumber = await generateInvoiceNumber(PaymentRequest);
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      date: new Date(),
      serviceType,
      billingName,
      billingState,
      pan: pan || null,
      email,
      phone: phone || '',
      transactionId: 'CUSTOM-ADMIN',
      packageName,
      duration: duration || '',
      amount: Number(amount),
      coupon: Number(coupon) || 0,
    });

    const uploaded = await uploadInvoicePDF(pdfBuffer, invoiceNumber);

    // Store as a minimal PaymentRequest record so it shows in the list
    const pr = await PaymentRequest.create({
      user: req.user._id,
      serviceType,
      planName: packageName,
      duration: duration || '',
      amount: Number(amount),
      senderName: billingName,
      billingName,
      billingState,
      transactionId: `ADMIN-${invoiceNumber}`,
      transactionImageUrl: '',
      transactionImagePublicId: '',
      paymentMethod: 'razorpay',
      status: 'approved',
      approvedAt: new Date(),
      invoiceNumber,
      invoicePdfUrl: uploaded.url,
      invoicePdfPublicId: uploaded.publicId,
    });

    if (doSendEmail) {
      try {
        await sendEmail({
          to: email,
          subject: `Invoice ${invoiceNumber} — InvestKaps`,
          serviceType,
          html: `<p>Dear ${billingName},</p><p>Please find your invoice attached.</p><p>Invoice Number: <strong>${invoiceNumber}</strong></p>`,
          attachments: [{ filename: `Invoice_${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
        });
      } catch (emailErr) {
        console.error('[ADMIN INVOICE] Email failed:', emailErr.message);
      }
    }

    return res.json({ success: true, invoiceNumber, pdfUrl: uploaded.url, paymentRequestId: pr._id });
  } catch (err) {
    console.error('[ADMIN INVOICES] CREATE error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Server error.' });
  }
});

export default router;
