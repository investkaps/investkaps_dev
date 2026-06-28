import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import CallPlan from '../model/CallPlan.js';
import CallDay from '../model/CallDay.js';
import CallBooking from '../model/CallBooking.js';
import User from '../model/User.js';
import PaymentRequest from '../model/PaymentRequest.js';
import { sendCallBookingEmail, sendCallConfirmedEmail, sendCallCancelledEmail } from '../utils/emailService.js';
import { createCalendarEvent, deleteCalendarEvent } from '../services/googleCalendarService.js';
import { generateInvoiceNumber, generateInvoicePDF, uploadInvoicePDF } from '../utils/invoiceGenerator.js';
import KycVerification from '../model/KycVerification.js';
import logger from '../utils/logger.js';
import { uploadImage } from '../config/cloudinary.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/* ── helper: build a slot-like object for emails/invoice from a booking ── */
const slotFromBooking = (b) => ({
  date: b.slotDate,
  startTime: b.slotStartTime,
  endTime: b.slotEndTime,
});

/* ── helper: build IST ISO string from date + time strings ── */
const toISTiso = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 5, min - 30)).toISOString();
};

/* ═══════════════════════════════════════════════════════
   PUBLIC — call plans
═══════════════════════════════════════════════════════ */

router.get('/plans', async (_req, res) => {
  try {
    const plans = await CallPlan.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, data: plans });
  } catch (err) {
    logger.error('[Call] GET plans:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   PUBLIC — available slots for a date
   Returns the CallDay doc's slots that are not booked.
═══════════════════════════════════════════════════════ */

router.get('/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'date param required (YYYY-MM-DD)' });

    const day = await CallDay.findOne({ date }).lean();
    const available = (day?.slots || []).filter(s => !s.isBooked);
    res.json({ success: true, data: available, dayId: day?._id || null });
  } catch (err) {
    logger.error('[Call] GET slots:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   USER — submit payment + book slot
═══════════════════════════════════════════════════════ */

router.post('/book', verifyToken, upload.single('screenshot'), async (req, res) => {
  try {
    const { planId, dayId, slotId, senderName, transactionId, amount } = req.body;
    const userId = req.user._id;

    const [plan, day, user] = await Promise.all([
      CallPlan.findById(planId),
      CallDay.findById(dayId),
      User.findById(userId).select('name email'),
    ]);

    if (!plan || !plan.isActive) return res.status(404).json({ success: false, error: 'Call plan not found' });
    if (!day) return res.status(404).json({ success: false, error: 'Day not found' });

    const existingBooking = await CallBooking.findOne({
      user: userId,
      status: { $in: ['awaiting_payment', 'payment_submitted', 'confirmed'] },
    }).lean();
    if (existingBooking) return res.status(409).json({ success: false, error: 'You already have a pending booking. Please wait for it to be approved or rejected before booking again.' });

    const slot = day.slots.id(slotId);
    if (!slot) return res.status(404).json({ success: false, error: 'Slot not found' });
    if (slot.isBooked) return res.status(409).json({ success: false, error: 'Slot already booked. Please choose another.' });
    if (!req.file) return res.status(400).json({ success: false, error: 'Payment screenshot required' });

    const uploadResult = await uploadImage(req.file.buffer, { folder: 'call_payments', resource_type: 'image' });

    const paymentReq = await PaymentRequest.create({
      user: userId,
      senderName,
      transactionId,
      amount: Number(amount),
      transactionImageUrl: uploadResult.secure_url,
      status: 'pending',
      serviceType: 'IA',
      adminNotes: `CALL BOOKING — Plan: ${plan.name} | ${day.date} ${slot.startTime}–${slot.endTime}`,
    });

    // Mark subdoc slot as booked
    slot.isBooked = true;
    slot.bookedBy = userId;
    await day.save();

    const booking = await CallBooking.create({
      user: userId,
      callPlan: planId,
      callDayId: day._id,
      slotId: slot._id,
      slotDate: day.date,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
      paymentRequest: paymentReq._id,
      paymentStatus: 'pending',
      amount: Number(amount),
      status: 'payment_submitted',
    });

    await sendCallBookingEmail(user, plan, slotFromBooking(booking)).catch(e =>
      logger.warn('[Call] sendCallBookingEmail failed:', e.message)
    );

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    logger.error('[Call] POST book:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   USER — free call eligibility
═══════════════════════════════════════════════════════ */

router.get('/free-call-status', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const [user, pendingBooking] = await Promise.all([
      User.findById(userId).select('freeCallClaimed').lean(),
      CallBooking.findOne({
        user: userId,
        status: { $in: ['awaiting_payment', 'payment_submitted', 'confirmed'] },
      }).select('_id status isFreeCall slotDate slotStartTime slotEndTime').lean(),
    ]);

    res.json({
      success: true,
      eligible: !user?.freeCallClaimed,
      pendingBooking: pendingBooking || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   USER — claim free call
═══════════════════════════════════════════════════════ */

router.post('/claim-free', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('name email profile freeCallClaimed');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.freeCallClaimed) return res.status(409).json({ success: false, error: 'You have already claimed your free call.' });

    const { planId, dayId, slotId } = req.body;
    if (!planId || !dayId || !slotId) return res.status(400).json({ success: false, error: 'planId, dayId and slotId are required' });

    const [plan, day] = await Promise.all([CallPlan.findById(planId), CallDay.findById(dayId)]);
    if (!plan || !plan.isActive) return res.status(404).json({ success: false, error: 'Call plan not found' });
    if (!day) return res.status(404).json({ success: false, error: 'Day not found' });

    const existingBooking = await CallBooking.findOne({
      user: userId,
      status: { $in: ['awaiting_payment', 'payment_submitted', 'confirmed'] },
    }).lean();
    if (existingBooking) return res.status(409).json({ success: false, error: 'You already have a pending booking. Please wait for it to be approved or rejected before booking again.' });

    const slot = day.slots.id(slotId);
    if (!slot) return res.status(404).json({ success: false, error: 'Slot not found' });
    if (slot.isBooked) return res.status(409).json({ success: false, error: 'Slot already booked. Please choose another.' });

    slot.isBooked = true;
    slot.bookedBy = userId;
    await day.save();

    const booking = await CallBooking.create({
      user: userId,
      callPlan: planId,
      callDayId: day._id,
      slotId: slot._id,
      slotDate: day.date,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
      paymentRequest: null,
      paymentStatus: 'approved',
      amount: 0,
      status: 'payment_submitted',
      isFreeCall: true,
    });

    user.freeCallClaimed = true;
    await user.save();

    await sendCallBookingEmail(user, plan, slotFromBooking(booking), true).catch(e =>
      logger.warn('[Call] sendCallBookingEmail (free) failed:', e.message)
    );

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    logger.error('[Call] POST claim-free:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   USER — my bookings
═══════════════════════════════════════════════════════ */

router.get('/my', verifyToken, async (req, res) => {
  try {
    const bookings = await CallBooking.find({ user: req.user._id })
      .populate('callPlan', 'name durationMinutes price')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) {
    logger.error('[Call] GET my:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   ADMIN — all bookings
═══════════════════════════════════════════════════════ */

router.get('/admin/bookings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const query = status ? { status } : {};

    const bookings = await CallBooking.find(query)
      .populate('user', 'name email phone')
      .populate('callPlan', 'name durationMinutes price')
      .populate('paymentRequest', 'transactionId transactionImageUrl amount status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await CallBooking.countDocuments(query);
    res.json({ success: true, data: bookings, total, page: Number(page) });
  } catch (err) {
    logger.error('[Call] ADMIN GET bookings:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   ADMIN — confirm booking → Google Meet + invoice + email
═══════════════════════════════════════════════════════ */

router.post('/admin/bookings/:id/confirm', verifyToken, requireAdmin, async (req, res) => {
  try {
    const booking = await CallBooking.findById(req.params.id)
      .populate('user', 'name email profile')
      .populate('callPlan', 'name durationMinutes price')
      .populate('paymentRequest', 'transactionId senderName billingName billingState amount');

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status === 'confirmed') return res.status(400).json({ success: false, error: 'Already confirmed' });

    const slot = slotFromBooking(booking);
    let meetLink = null, googleEventId = null;

    try {
      const gcal = await createCalendarEvent({
        summary: `InvestKaps Consultation — ${booking.user.name}`,
        description: `Call plan: ${booking.callPlan.name}\nDuration: ${booking.callPlan.durationMinutes} minutes`,
        startISO: toISTiso(slot.date, slot.startTime),
        endISO:   toISTiso(slot.date, slot.endTime),
        userEmail: booking.user.email,
        userName:  booking.user.name,
      });
      meetLink = gcal.meetLink;
      googleEventId = gcal.eventId;
    } catch (gcalErr) {
      logger.warn('[Call] Google Calendar failed:', gcalErr.message);
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'approved';
    booking.meetLink = meetLink;
    booking.googleEventId = googleEventId;
    if (req.body.adminNotes) booking.adminNotes = req.body.adminNotes;
    await booking.save();

    if (booking.paymentRequest) {
      await PaymentRequest.findByIdAndUpdate(booking.paymentRequest, {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        adminNotes: `Call booking confirmed. Meet: ${meetLink || 'TBD'}`,
      });
    }

    const isFreeCall = booking.isFreeCall === true;

    // Generate invoice
    let invoicePdfBuffer = null, invoiceNumber = null;
    try {
      let pan = null;
      try {
        const kyc = await KycVerification.findOne({ user: booking.user._id, status: 'completed' })
          .sort({ createdAt: -1 }).select('pan').lean();
        pan = kyc?.pan || null;
      } catch {}

      const payReq = booking.paymentRequest;
      const invoiceAmount = isFreeCall ? 0 : (payReq?.amount || booking.amount);
      invoiceNumber = await generateInvoiceNumber(PaymentRequest);
      invoicePdfBuffer = await generateInvoicePDF({
        invoiceNumber,
        date: new Date(),
        serviceType: 'IA',
        billingName: payReq?.billingName || payReq?.senderName || booking.user.name,
        billingState: payReq?.billingState || booking.user.profile?.state || '',
        pan,
        email: booking.user.email,
        phone: booking.user.profile?.phone || '',
        transactionId: isFreeCall ? 'FREE CALL — No Payment' : (payReq?.transactionId || '—'),
        packageName: isFreeCall
          ? `Complimentary First Consultation Call — ${booking.callPlan.name}`
          : `Consultation Call — ${booking.callPlan.name}`,
        duration: `${booking.callPlan.durationMinutes} minutes on ${slot.date} (${slot.startTime}–${slot.endTime} IST)`,
        amount: invoiceAmount,
        coupon: 0,
      });

      const uploaded = await uploadInvoicePDF(invoicePdfBuffer, invoiceNumber);
      if (booking.paymentRequest) {
        await PaymentRequest.findByIdAndUpdate(booking.paymentRequest, {
          invoiceNumber,
          invoicePdfUrl: uploaded.url,
          invoicePdfPublicId: uploaded.publicId,
        });
      }
      logger.info(`[Call] Invoice ${invoiceNumber} for booking ${booking._id}`);
    } catch (invErr) {
      logger.warn('[Call] Invoice generation failed:', invErr.message);
    }

    await sendCallConfirmedEmail(
      booking.user, booking.callPlan, slot, meetLink,
      invoicePdfBuffer ? { buffer: invoicePdfBuffer, filename: `Invoice_${invoiceNumber || 'INV'}.pdf` } : null,
      isFreeCall
    ).catch(e => logger.warn('[Call] sendCallConfirmedEmail failed:', e.message));

    res.json({ success: true, data: booking });
  } catch (err) {
    logger.error('[Call] ADMIN confirm:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   ADMIN — cancel booking
═══════════════════════════════════════════════════════ */

router.post('/admin/bookings/:id/cancel', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await CallBooking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('callPlan', 'name');

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    if (booking.googleEventId) {
      await deleteCalendarEvent(booking.googleEventId).catch(e =>
        logger.warn('[Call] Google Calendar delete failed:', e.message)
      );
    }

    // Free the slot in the CallDay subdoc
    await CallDay.findOneAndUpdate(
      { _id: booking.callDayId, 'slots._id': booking.slotId },
      { $set: { 'slots.$.isBooked': false, 'slots.$.bookedBy': null } }
    );

    booking.status = 'cancelled';
    booking.paymentStatus = 'rejected';
    booking.adminNotes = reason || '';
    await booking.save();

    if (booking.paymentRequest) {
      await PaymentRequest.findByIdAndUpdate(booking.paymentRequest, {
        status: 'rejected',
        approvedBy: req.user._id,
        adminNotes: reason || '',
      });
    }

    await sendCallCancelledEmail(booking.user, booking.callPlan, slotFromBooking(booking), reason).catch(e =>
      logger.warn('[Call] sendCallCancelledEmail failed:', e.message)
    );

    res.json({ success: true, data: booking });
  } catch (err) {
    logger.error('[Call] ADMIN cancel:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════
   ADMIN — call plans CRUD
═══════════════════════════════════════════════════════ */

router.get('/admin/plans', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const plans = await CallPlan.find().sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, data: plans });
  } catch (err) { res.status(500).json({ success: false, error: 'Server error' }); }
});

router.post('/admin/plans', verifyToken, requireAdmin, async (req, res) => {
  try {
    const plan = await CallPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.put('/admin/plans/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const plan = await CallPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.delete('/admin/plans/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await CallPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: 'Server error' }); }
});

/* ═══════════════════════════════════════════════════════
   ADMIN — slot management (per CallDay)
   GET  /admin/slots?date=YYYY-MM-DD  → full day doc
   POST /admin/slots/bulk             → bulk upsert
   DELETE /admin/slots/:dayId/:slotId → remove one slot
═══════════════════════════════════════════════════════ */

router.get('/admin/slots', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    if (date) {
      const day = await CallDay.findOne({ date })
        .populate('slots.bookedBy', 'name email').lean();
      return res.json({ success: true, data: day ? day.slots : [], dayId: day?._id || null, date });
    }
    // No date — return all days with their slots
    const days = await CallDay.find().sort({ date: 1 }).lean();
    res.json({ success: true, data: days });
  } catch (err) { res.status(500).json({ success: false, error: 'Server error' }); }
});

router.post('/admin/slots/bulk', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ success: false, error: 'slots array required' });
    }

    // Group incoming slots by date
    const byDate = {};
    for (const s of slots) {
      if (!s.date || !s.startTime || !s.endTime) continue;
      (byDate[s.date] = byDate[s.date] || []).push({ startTime: s.startTime, endTime: s.endTime });
    }

    let created = 0, skipped = 0;
    for (const [date, newSlots] of Object.entries(byDate)) {
      let day = await CallDay.findOne({ date });
      if (!day) day = new CallDay({ date, slots: [] });

      const existingTimes = new Set(day.slots.map(s => s.startTime));
      for (const s of newSlots) {
        if (existingTimes.has(s.startTime)) { skipped++; continue; }
        day.slots.push({ startTime: s.startTime, endTime: s.endTime });
        existingTimes.add(s.startTime);
        created++;
      }
      // Sort slots by startTime before saving
      day.slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      await day.save();
    }

    res.status(201).json({ success: true, data: { created, skipped } });
  } catch (err) {
    logger.error('[Call] ADMIN bulk slots:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/admin/slots/:dayId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query; // optional cross-check
    const day = await CallDay.findById(req.params.dayId);
    if (!day) return res.status(404).json({ success: false, error: 'Day not found' });

    // Safety: if the caller supplied a date, make sure it matches the doc
    if (date && day.date !== date) {
      return res.status(400).json({ success: false, error: `Day mismatch: doc is ${day.date}, requested ${date}` });
    }

    const before = day.slots.length;
    day.slots = day.slots.filter(s => s.isBooked);
    const removed = before - day.slots.length;
    await day.save();

    res.json({ success: true, data: { removed, date: day.date } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/admin/slots/:dayId/:slotId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dayId, slotId } = req.params;
    const day = await CallDay.findById(dayId);
    if (!day) return res.status(404).json({ success: false, error: 'Day not found' });

    const slot = day.slots.id(slotId);
    if (!slot) return res.status(404).json({ success: false, error: 'Slot not found' });
    if (slot.isBooked) return res.status(400).json({ success: false, error: 'Cannot delete a booked slot' });

    slot.deleteOne();
    await day.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
