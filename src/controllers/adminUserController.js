import * as adminUserService from '../services/adminUserService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.listUsers(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Users retrieved successfully.',
    data: result
  });
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const result = await adminUserService.getUserDetails(req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'User details retrieved successfully.',
    data: result
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await adminUserService.updateUserStatus(
    req.params.id,
    req.user,
    req.body,
    req.ip,
    req.headers['user-agent']
  );

  return sendResponse(res, {
    statusCode: 200,
    message: `User account status updated to ${req.body.status}.`,
    data: { user }
  });
});

export const createAdministrativeUser = asyncHandler(async (req, res) => {
  const user = await adminUserService.createAdministrativeUser(
    req.user,
    req.body,
    req.ip,
    req.headers['user-agent']
  );

  return sendResponse(res, {
    statusCode: 201,
    message: `Administrative ${req.body.role} account created successfully.`,
    data: { user }
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await adminUserService.updateUserRole(
    req.params.id,
    req.user,
    req.body,
    req.ip,
    req.headers['user-agent']
  );

  return sendResponse(res, {
    statusCode: 200,
    message: `User role updated to ${req.body.role}.`,
    data: { user }
  });
});

export const adminUserController = {
  listUsers,
  getUserDetails,
  updateUserStatus,
  createAdministrativeUser,
  updateUserRole
};

