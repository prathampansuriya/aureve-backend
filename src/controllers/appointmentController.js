import * as appointmentService from '../services/appointmentService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAvailability = asyncHandler(async (req, res) => {
  const result = await appointmentService.getAvailableSlots({
    date: req.query.date,
    storeLocationId: req.query.storeLocationId,
    appointmentType: req.query.appointmentType
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Slot availability retrieved successfully.',
    data: result
  });
});

export const bookAppointment = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const appointment = await appointmentService.bookAppointment({
    userId,
    ...req.body
  });

  return sendResponse(res, {
    statusCode: appointment.isExisting ? 200 : 201,
    message: appointment.isExisting
      ? 'Existing appointment retrieved.'
      : 'VIP appointment scheduled successfully.',
    data: { appointment }
  });
});

export const getCustomerAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getCustomerAppointments(req.user._id, req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Customer appointments retrieved successfully.',
    data: result
  });
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user?.role);
  const appointment = await appointmentService.getAppointmentById(req.params.id, req.user, isAdmin);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Appointment details retrieved successfully.',
    data: { appointment }
  });
});

export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user?.role);
  const appointment = await appointmentService.rescheduleAppointment(
    req.params.id,
    req.user,
    req.body,
    isAdmin
  );

  return sendResponse(res, {
    statusCode: 200,
    message: 'Appointment rescheduled successfully.',
    data: { appointment }
  });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user?.role);
  const appointment = await appointmentService.cancelAppointment(
    req.params.id,
    req.user,
    req.body,
    isAdmin
  );

  return sendResponse(res, {
    statusCode: 200,
    message: 'Appointment cancelled successfully.',
    data: { appointment }
  });
});

export const adminGetAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getAdminAppointments(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Admin appointment queue retrieved successfully.',
    data: result
  });
});

export const adminUpdateAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.adminUpdateAppointment(
    req.params.id,
    req.user,
    req.body
  );

  return sendResponse(res, {
    statusCode: 200,
    message: 'Appointment updated successfully.',
    data: { appointment }
  });
});

export const adminBlockSlot = asyncHandler(async (req, res) => {
  const blocked = await appointmentService.adminBlockSlot(req.user, req.body);
  return sendResponse(res, {
    statusCode: 201,
    message: 'Showroom slot blocked successfully.',
    data: { blocked }
  });
});
