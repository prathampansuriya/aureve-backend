import crypto from 'crypto';
import { Appointment } from '../models/Appointment.js';
import { StoreLocation } from '../models/StoreLocation.js';
import { User } from '../models/User.js';
import { createPersistentNotification } from './notificationService.js';
import { sendAppointmentConfirmationEmail, sendAppointmentStatusEmail } from './emailService.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Normalizes date to midnight UTC for consistent calendar day grouping.
 */
export const normalizeToCalendarDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new BadRequestError('Invalid appointment date format.');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Generates standard hourly time slots for a given opening/closing hour.
 */
export const generateStandardTimeSlots = (openingHour = 10, closingHour = 20, slotDurationMinutes = 60) => {
  const slots = [];
  const formatHour = (h) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12.toString().padStart(2, '0')}:00 ${period}`;
  };

  const stepHours = slotDurationMinutes / 60;
  for (let hour = openingHour; hour < closingHour; hour += stepHours) {
    const startStr = formatHour(hour);
    const endStr = formatHour(hour + stepHours);
    slots.push(`${startStr} - ${endStr}`);
  }

  return slots;
};

/**
 * Retrieves slot availability for a showroom or virtual consultation on a specific calendar date.
 */
export const getAvailableSlots = async ({ date, storeLocationId, appointmentType = 'IN_STORE_VIP' }) => {
  if (!date) {
    throw new BadRequestError('Appointment date is required.');
  }

  const normalizedDate = normalizeToCalendarDate(date);
  const now = new Date();
  const todayCalendar = normalizeToCalendarDate(now);

  if (normalizedDate < todayCalendar) {
    throw new BadRequestError('Cannot view availability for dates in the past.');
  }

  let store = null;
  let timezone = DEFAULT_TIMEZONE;
  let openingHour = 10;
  let closingHour = 20;
  let slotDurationMinutes = 60;
  let capacityPerSlot = appointmentType === 'VIRTUAL_CONSULTATION' ? 3 : 2;
  let leadTimeHours = 2;

  if (appointmentType === 'IN_STORE_VIP') {
    if (!storeLocationId) {
      store = await StoreLocation.findOne({ isActive: true }).lean();
      if (!store) {
        return {
          date: normalizedDate.toISOString().split('T')[0],
          appointmentType,
          storeLocation: null,
          slots: []
        };
      }
      storeLocationId = store._id;
    } else {
      store = await StoreLocation.findById(storeLocationId).lean();
      if (!store) {
        throw new NotFoundError('Showroom location not found.');
      }
      if (!store.isActive) {
        throw new BadRequestError('This showroom is currently inactive and not accepting appointments.');
      }
    }

    timezone = store.timezone || DEFAULT_TIMEZONE;
    openingHour = store.appointmentConfig?.openingHour ?? 10;
    closingHour = store.appointmentConfig?.closingHour ?? 20;
    slotDurationMinutes = store.appointmentConfig?.slotDurationMinutes ?? 60;
    capacityPerSlot = store.appointmentConfig?.capacityPerSlot ?? 2;
    leadTimeHours = store.appointmentConfig?.leadTimeHours ?? 2;
  }

  const allSlots = generateStandardTimeSlots(openingHour, closingHour, slotDurationMinutes);

  // Query existing bookings on that date
  const query = {
    scheduledDate: normalizedDate,
    status: { $in: ['REQUESTED', 'CONFIRMED', 'BLOCKED'] }
  };

  if (appointmentType === 'IN_STORE_VIP') {
    query.storeLocationId = storeLocationId;
  } else {
    query.appointmentType = 'VIRTUAL_CONSULTATION';
  }

  const existingBookings = await Appointment.find(query).select('timeSlot status').lean();

  // Aggregate bookings count per timeSlot
  const slotCountMap = {};
  for (const b of existingBookings) {
    slotCountMap[b.timeSlot] = (slotCountMap[b.timeSlot] || 0) + 1;
  }

  const isToday = normalizedDate.getTime() === todayCalendar.getTime();
  const currentHour = now.getHours();

  const slots = allSlots.map((timeSlot) => {
    const bookedCount = slotCountMap[timeSlot] || 0;
    let available = bookedCount < capacityPerSlot;
    let reason = available ? null : 'SLOT_FULL';

    // If today, check lead time
    if (isToday) {
      // Parse starting hour from "10:00 AM - 11:00 AM"
      const match = timeSlot.match(/^(\d{1,2}):00\s*(AM|PM)/i);
      if (match) {
        let slotHour = parseInt(match[1], 10);
        const period = match[2].toUpperCase();
        if (period === 'PM' && slotHour !== 12) slotHour += 12;
        if (period === 'AM' && slotHour === 12) slotHour = 0;

        if (slotHour <= currentHour + leadTimeHours) {
          available = false;
          reason = 'LEAD_TIME_EXPIRED';
        }
      }
    }

    return {
      timeSlot,
      capacity: capacityPerSlot,
      bookedCount,
      remainingCapacity: Math.max(0, capacityPerSlot - bookedCount),
      available,
      reason
    };
  });

  return {
    date: normalizedDate.toISOString().split('T')[0],
    appointmentType,
    timezone,
    storeLocation: store
      ? {
          id: store._id,
          name: store.name,
          city: store.city,
          addressLine: store.addressLine
        }
      : null,
    slots
  };
};

/**
 * Books an in-store VIP consultation or virtual styling session.
 */
export const bookAppointment = async ({
  userId = null,
  clientName,
  clientEmail,
  clientPhone,
  appointmentType,
  storeLocationId = null,
  scheduledDate,
  timeSlot,
  interestCategories = [],
  notes = '',
  idempotencyKey = null
}) => {
  // Idempotency check: Return existing appointment if already processed
  if (idempotencyKey) {
    const existing = await Appointment.findOne({ idempotencyKey })
      .populate('storeLocationId', 'name city addressLine phone email')
      .lean();
    if (existing) {
      logger.info(`[APPOINTMENT IDEMPOTENCY] Intercepted duplicate booking submission with key: ${idempotencyKey}`);
      return { ...existing, isExisting: true };
    }
  }

  const normalizedDate = normalizeToCalendarDate(scheduledDate);
  const now = new Date();
  const todayCalendar = normalizeToCalendarDate(now);

  if (normalizedDate < todayCalendar) {
    throw new BadRequestError('Cannot book an appointment in the past.');
  }

  let store = null;
  let capacityPerSlot = 2;
  let leadTimeHours = 2;

  if (appointmentType === 'IN_STORE_VIP') {
    if (!storeLocationId) {
      throw new BadRequestError('Store location is required for in-store VIP consultations.');
    }
    store = await StoreLocation.findById(storeLocationId);
    if (!store) {
      throw new NotFoundError('Showroom location not found.');
    }
    if (!store.isActive) {
      throw new BadRequestError('Selected showroom is not accepting appointments.');
    }
    capacityPerSlot = store.appointmentConfig?.capacityPerSlot ?? 2;
    leadTimeHours = store.appointmentConfig?.leadTimeHours ?? 2;
  } else if (appointmentType === 'VIRTUAL_CONSULTATION') {
    capacityPerSlot = 3;
    leadTimeHours = 1;
  } else {
    throw new BadRequestError('Invalid appointment type. Must be IN_STORE_VIP or VIRTUAL_CONSULTATION.');
  }

  // Validate lead time if booked for today
  if (normalizedDate.getTime() === todayCalendar.getTime()) {
    const currentHour = now.getHours();
    const match = timeSlot.match(/^(\d{1,2}):00\s*(AM|PM)/i);
    if (match) {
      let slotHour = parseInt(match[1], 10);
      const period = match[2].toUpperCase();
      if (period === 'PM' && slotHour !== 12) slotHour += 12;
      if (period === 'AM' && slotHour === 12) slotHour = 0;

      if (slotHour <= currentHour + leadTimeHours) {
        throw new BadRequestError(
          `Appointments for today require at least ${leadTimeHours} hours advance notice.`
        );
      }
    }
  }

  // Double-booking & capacity check under concurrency
  const conflictQuery = {
    scheduledDate: normalizedDate,
    timeSlot,
    status: { $in: ['REQUESTED', 'CONFIRMED', 'BLOCKED'] }
  };

  if (appointmentType === 'IN_STORE_VIP') {
    conflictQuery.storeLocationId = storeLocationId;
  } else {
    conflictQuery.appointmentType = 'VIRTUAL_CONSULTATION';
  }

  const existingCount = await Appointment.countDocuments(conflictQuery);
  if (existingCount >= capacityPerSlot) {
    throw new ConflictError('The selected time slot is fully booked. Please select another time slot.');
  }

  // Generate meeting link for virtual consultation
  const meetingLink =
    appointmentType === 'VIRTUAL_CONSULTATION'
      ? `https://meet.aureve.com/consultation-${crypto.randomBytes(6).toString('hex')}`
      : '';

  const appointment = new Appointment({
    userId,
    clientName: clientName.trim(),
    clientEmail: clientEmail.trim().toLowerCase(),
    clientPhone: clientPhone.trim(),
    appointmentType,
    storeLocationId: appointmentType === 'IN_STORE_VIP' ? storeLocationId : null,
    scheduledDate: normalizedDate,
    timeSlot,
    interestCategories: Array.isArray(interestCategories) ? interestCategories : [],
    notes: notes ? notes.trim() : '',
    status: 'CONFIRMED',
    meetingLink,
    idempotencyKey
  });

  await appointment.save();

  // Send asynchronous confirmation email
  sendAppointmentConfirmationEmail({
    to: appointment.clientEmail,
    name: appointment.clientName,
    appointment,
    storeLocation: store
  }).catch((err) => {
    logger.error(`[APPOINTMENT EMAIL ERROR] Failed to send confirmation email: ${err.message}`);
  });

  // Create persistent customer notification if user is authenticated
  if (userId) {
    createPersistentNotification({
      userId,
      title: 'VIP Consultation Confirmed',
      message: `Your ${
        appointmentType === 'VIRTUAL_CONSULTATION' ? 'virtual' : 'in-store'
      } consultation is confirmed for ${timeSlot} on ${normalizedDate.toISOString().split('T')[0]}.`,
      type: 'APPOINTMENT_UPDATE',
      linkUrl: `/account/appointments`,
      idempotencyKey: idempotencyKey ? `notif-app-${idempotencyKey}` : `notif-app-${appointment._id}`,
      metadata: { appointmentId: appointment._id }
    }).catch((err) => {
      logger.error(`[APPOINTMENT NOTIF ERROR] Failed to create persistent notification: ${err.message}`);
    });
  }

  return appointment;
};

/**
 * Reschedules an upcoming appointment with slot capacity and lead-time validation.
 */
export const rescheduleAppointment = async (
  appointmentId,
  user,
  { scheduledDate, timeSlot, notes } = {},
  isAdmin = false
) => {
  const appointment = await Appointment.findById(appointmentId).populate('storeLocationId');
  if (!appointment) {
    throw new NotFoundError('Appointment not found.');
  }

  // Authorization check
  if (!isAdmin) {
    const isOwner =
      (appointment.userId && appointment.userId.toString() === user._id.toString()) ||
      appointment.clientEmail === user.email.toLowerCase();
    if (!isOwner) {
      throw new ForbiddenError('You do not have permission to reschedule this appointment.');
    }
  }

  if (['CANCELLED', 'COMPLETED', 'NO_SHOW', 'BLOCKED'].includes(appointment.status)) {
    throw new BadRequestError(`Cannot reschedule an appointment in ${appointment.status} status.`);
  }

  const normalizedNewDate = normalizeToCalendarDate(scheduledDate);
  const now = new Date();
  const todayCalendar = normalizeToCalendarDate(now);

  if (normalizedNewDate < todayCalendar) {
    throw new BadRequestError('Cannot reschedule an appointment to a date in the past.');
  }

  // Lead-time check for cancellation/rescheduling (minimum 4 hours prior to original slot)
  if (!isAdmin) {
    const originalDate = new Date(appointment.scheduledDate);
    if (originalDate.getTime() === todayCalendar.getTime()) {
      const match = appointment.timeSlot.match(/^(\d{1,2}):00\s*(AM|PM)/i);
      if (match) {
        let slotHour = parseInt(match[1], 10);
        const period = match[2].toUpperCase();
        if (period === 'PM' && slotHour !== 12) slotHour += 12;
        if (period === 'AM' && slotHour === 12) slotHour = 0;

        if (slotHour <= now.getHours() + 4) {
          throw new BadRequestError('Appointments must be rescheduled at least 4 hours in advance.');
        }
      }
    }
  }

  // Capacity check on the target new slot
  const conflictQuery = {
    _id: { $ne: appointment._id },
    scheduledDate: normalizedNewDate,
    timeSlot,
    status: { $in: ['REQUESTED', 'CONFIRMED', 'BLOCKED'] }
  };

  if (appointment.appointmentType === 'IN_STORE_VIP') {
    conflictQuery.storeLocationId = appointment.storeLocationId?._id || appointment.storeLocationId;
  } else {
    conflictQuery.appointmentType = 'VIRTUAL_CONSULTATION';
  }

  const capacityPerSlot =
    appointment.appointmentType === 'VIRTUAL_CONSULTATION'
      ? 3
      : appointment.storeLocationId?.appointmentConfig?.capacityPerSlot ?? 2;

  const existingCount = await Appointment.countDocuments(conflictQuery);
  if (existingCount >= capacityPerSlot) {
    throw new ConflictError('The requested new time slot is fully booked. Please choose another slot.');
  }

  appointment.scheduledDate = normalizedNewDate;
  appointment.timeSlot = timeSlot;
  appointment.status = 'RESCHEDULED';
  if (notes) {
    appointment.notes = appointment.notes ? `${appointment.notes} | Rescheduled: ${notes}` : notes;
  }

  await appointment.save();

  // Dispatch status update email & notification
  sendAppointmentStatusEmail({
    to: appointment.clientEmail,
    name: appointment.clientName,
    appointment,
    status: 'RESCHEDULED',
    reason: notes || 'Client requested reschedule'
  }).catch((err) => {
    logger.error(`[APPOINTMENT RESCHEDULE EMAIL ERROR] ${err.message}`);
  });

  if (appointment.userId) {
    createPersistentNotification({
      userId: appointment.userId,
      title: 'Appointment Rescheduled',
      message: `Your consultation has been rescheduled to ${timeSlot} on ${normalizedNewDate.toISOString().split('T')[0]}.`,
      type: 'APPOINTMENT_UPDATE',
      linkUrl: `/account/appointments`,
      metadata: { appointmentId: appointment._id }
    }).catch(() => {});
  }

  return appointment;
};

/**
 * Cancels an upcoming appointment enforcing cancellation lead time rules.
 */
export const cancelAppointment = async (appointmentId, user, { reason = '' } = {}, isAdmin = false) => {
  const appointment = await Appointment.findById(appointmentId).populate('storeLocationId');
  if (!appointment) {
    throw new NotFoundError('Appointment not found.');
  }

  // Ownership verification
  if (!isAdmin) {
    const isOwner =
      (appointment.userId && appointment.userId.toString() === user._id.toString()) ||
      appointment.clientEmail === user.email.toLowerCase();
    if (!isOwner) {
      throw new ForbiddenError('You do not have permission to cancel this appointment.');
    }
  }

  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
    throw new BadRequestError(`Appointment is already marked as ${appointment.status.toLowerCase()}.`);
  }

  // Customer cancellation lead time policy: 4 hours advance notice
  if (!isAdmin) {
    const scheduledDate = new Date(appointment.scheduledDate);
    const todayCalendar = normalizeToCalendarDate(new Date());

    if (scheduledDate.getTime() === todayCalendar.getTime()) {
      const match = appointment.timeSlot.match(/^(\d{1,2}):00\s*(AM|PM)/i);
      if (match) {
        let slotHour = parseInt(match[1], 10);
        const period = match[2].toUpperCase();
        if (period === 'PM' && slotHour !== 12) slotHour += 12;
        if (period === 'AM' && slotHour === 12) slotHour = 0;

        if (slotHour <= new Date().getHours() + 4) {
          throw new BadRequestError('Appointments must be cancelled at least 4 hours in advance.');
        }
      }
    }
  }

  appointment.status = 'CANCELLED';
  appointment.cancellationReason = reason || (isAdmin ? 'Cancelled by staff concierge' : 'Cancelled by customer');
  await appointment.save();

  // Send status email & persistent notification
  sendAppointmentStatusEmail({
    to: appointment.clientEmail,
    name: appointment.clientName,
    appointment,
    status: 'CANCELLED',
    reason: appointment.cancellationReason
  }).catch((err) => {
    logger.error(`[APPOINTMENT CANCEL EMAIL ERROR] ${err.message}`);
  });

  if (appointment.userId) {
    createPersistentNotification({
      userId: appointment.userId,
      title: 'Appointment Cancelled',
      message: `Your consultation scheduled for ${appointment.timeSlot} has been cancelled.`,
      type: 'APPOINTMENT_UPDATE',
      linkUrl: `/account/appointments`,
      metadata: { appointmentId: appointment._id }
    }).catch(() => {});
  }

  return appointment;
};

/**
 * Retrieves appointment history for an authenticated customer.
 */
export const getCustomerAppointments = async (userId, { status, page = 1, limit = 20 } = {}) => {
  const query = { userId };
  if (status) {
    query.status = status;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('storeLocationId', 'name city addressLine phone email')
      .sort({ scheduledDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Appointment.countDocuments(query)
  ]);

  return {
    appointments,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Retrieves appointment details by ID.
 */
export const getAppointmentById = async (appointmentId, user, isAdmin = false) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('storeLocationId', 'name city addressLine phone email timezone openingHours')
    .populate('assignedStaffId', 'firstName lastName email role')
    .lean();

  if (!appointment) {
    throw new NotFoundError('Appointment not found.');
  }

  if (!isAdmin) {
    const isOwner =
      (appointment.userId && appointment.userId.toString() === user._id.toString()) ||
      appointment.clientEmail === user.email.toLowerCase();
    if (!isOwner) {
      throw new ForbiddenError('You do not have permission to view this appointment.');
    }
  }

  return appointment;
};

/**
 * Administrative master appointment calendar and queue.
 */
export const getAdminAppointments = async ({
  storeLocationId,
  appointmentType,
  status,
  dateFrom,
  dateTo,
  search,
  page = 1,
  limit = 50
} = {}) => {
  const query = {};

  if (storeLocationId) {
    query.storeLocationId = storeLocationId;
  }

  if (appointmentType) {
    query.appointmentType = appointmentType;
  }

  if (status) {
    query.status = status;
  }

  if (dateFrom || dateTo) {
    query.scheduledDate = {};
    if (dateFrom) query.scheduledDate.$gte = normalizeToCalendarDate(dateFrom);
    if (dateTo) query.scheduledDate.$lte = normalizeToCalendarDate(dateTo);
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { clientName: { $regex: escaped, $options: 'i' } },
      { clientEmail: { $regex: escaped, $options: 'i' } },
      { clientPhone: { $regex: escaped, $options: 'i' } }
    ];
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (numericPage - 1) * numericLimit;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('storeLocationId', 'name city addressLine phone email')
      .populate('assignedStaffId', 'firstName lastName email role')
      .sort({ scheduledDate: 1, timeSlot: 1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Appointment.countDocuments(query)
  ]);

  return {
    appointments,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Updates appointment status, assigns concierge staff, or configures meeting links (Admin).
 */
export const adminUpdateAppointment = async (
  appointmentId,
  adminUser,
  { status, assignedStaffId, meetingLink, notes }
) => {
  const appointment = await Appointment.findById(appointmentId).populate('storeLocationId');
  if (!appointment) {
    throw new NotFoundError('Appointment not found.');
  }

  if (assignedStaffId) {
    const staff = await User.findById(assignedStaffId);
    if (!staff) {
      throw new NotFoundError('Assigned concierge staff user not found.');
    }
    appointment.assignedStaffId = staff._id;
  }

  if (meetingLink !== undefined) {
    appointment.meetingLink = meetingLink;
  }

  if (notes !== undefined) {
    appointment.notes = notes;
  }

  if (status && status !== appointment.status) {
    const validTransitions = {
      REQUESTED: ['CONFIRMED', 'CANCELLED', 'RESCHEDULED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
      RESCHEDULED: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
      BLOCKED: ['CANCELLED']
    };

    const allowed = validTransitions[appointment.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestError(
        `Invalid appointment status transition from ${appointment.status} to ${status}.`
      );
    }

    appointment.status = status;

    // Send customer notification on status change
    sendAppointmentStatusEmail({
      to: appointment.clientEmail,
      name: appointment.clientName,
      appointment,
      status,
      reason: notes || `Updated by concierge (${adminUser.name})`
    }).catch(() => {});

    if (appointment.userId) {
      createPersistentNotification({
        userId: appointment.userId,
        title: `Appointment Status: ${status}`,
        message: `Your consultation status has been updated to ${status}.`,
        type: 'APPOINTMENT_UPDATE',
        linkUrl: `/account/appointments`,
        metadata: { appointmentId: appointment._id }
      }).catch(() => {});
    }
  }

  await appointment.save();
  return appointment;
};

/**
 * Administratively blocks a slot for private boutique events or staff unavailability.
 */
export const adminBlockSlot = async (
  adminUser,
  { storeLocationId = null, appointmentType = 'IN_STORE_VIP', scheduledDate, timeSlot, notes = '' }
) => {
  const normalizedDate = normalizeToCalendarDate(scheduledDate);

  if (appointmentType === 'IN_STORE_VIP' && !storeLocationId) {
    throw new BadRequestError('Store location is required to block an in-store slot.');
  }

  const blocked = new Appointment({
    clientName: 'Showroom Reserved (Concierge)',
    clientEmail: 'concierge@aureve.com',
    clientPhone: '0000000000',
    appointmentType,
    storeLocationId: appointmentType === 'IN_STORE_VIP' ? storeLocationId : null,
    scheduledDate: normalizedDate,
    timeSlot,
    status: 'BLOCKED',
    notes: notes || `Slot blocked by concierge (${adminUser.name || 'Admin'})`
  });

  await blocked.save();
  return blocked;
};
