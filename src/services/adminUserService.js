import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Appointment } from '../models/Appointment.js';
import { Address } from '../models/Address.js';
import { recordAuditLog } from './auditService.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/AppError.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Lists all users with administrative filters and search (Admin/Super-Admin).
 */
export const listUsers = async ({
  role,
  status,
  search,
  page = 1,
  limit = 20,
  sort = 'newest'
} = {}) => {
  const query = {};

  if (role) {
    query.role = role.trim().toUpperCase();
  }

  if (status) {
    query.status = status.trim().toUpperCase();
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } }
    ];
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { firstName: 1, lastName: 1 },
    name_desc: { firstName: -1, lastName: -1 }
  };
  const selectedSort = sortOptions[sort] || sortOptions.newest;

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [rawUsers, total] = await Promise.all([
    User.find(query).sort(selectedSort).skip(skip).limit(numericLimit).lean(),
    User.countDocuments(query)
  ]);

  let users = rawUsers;
  if (rawUsers.length > 0) {
    const userIds = rawUsers.map((u) => u._id);
    const orderAggregates = await Order.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          orderStatus: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'] },
          paymentStatus: { $in: ['PAID', 'REFUNDED'] }
        }
      },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpentPaise: { $sum: '$financialBreakdown.grandTotalPaise' }
        }
      }
    ]);

    const statsMap = {};
    orderAggregates.forEach((stat) => {
      statsMap[stat._id.toString()] = stat;
    });

    users = rawUsers.map((u) => ({
      ...u,
      orderCount: statsMap[u._id.toString()]?.orderCount || 0,
      totalSpentPaise: statsMap[u._id.toString()]?.totalSpentPaise || 0
    }));
  }

  return {
    users,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Retrieves comprehensive details for a specific user, including order history and appointments.
 */
export const getUserDetails = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const [orders, appointments, addresses, orderStats] = await Promise.all([
    Order.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    Appointment.find({ userId }).sort({ scheduledDate: -1 }).limit(5).lean(),
    Address.find({ userId }).lean(),
    Order.aggregate([
      {
        $match: {
          userId: user._id,
          orderStatus: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSpentPaise: { $sum: '$financialBreakdown.grandTotalPaise' },
          totalOrders: { $sum: 1 }
        }
      }
    ])
  ]);

  const totalSpentPaise = orderStats.length > 0 ? orderStats[0].totalSpentPaise : 0;
  const totalOrders = orderStats.length > 0 ? orderStats[0].totalOrders : 0;

  return {
    user,
    summary: {
      totalSpentPaise,
      totalOrders,
      totalAppointments: appointments.length,
      registeredAt: user.createdAt
    },
    metrics: {
      totalSpentPaise,
      totalOrders,
      registeredAt: user.createdAt
    },
    orders,
    appointments,
    recentOrders: orders,
    recentAppointments: appointments,
    addresses
  };
};

/**
 * Updates a user's account status (ACTIVE, SUSPENDED, LOCKED) and records audit trail.
 */
export const updateUserStatus = async (
  userId,
  adminUser,
  { status, reason = '' },
  clientIp = '127.0.0.1',
  userAgent = ''
) => {
  if (!['ACTIVE', 'SUSPENDED', 'LOCKED'].includes(status)) {
    throw new BadRequestError('Invalid status. Must be ACTIVE, SUSPENDED, or LOCKED.');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new NotFoundError('User not found.');
  }

  // Prevent admin from modifying their own account status
  if (targetUser._id.toString() === adminUser._id.toString()) {
    throw new BadRequestError('You cannot alter your own account status.');
  }

  // Admin cannot suspend a Super-Admin
  if (targetUser.role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only Super Administrators can modify Super Administrator accounts.');
  }

  const previousStatus = targetUser.status;
  targetUser.status = status;
  if (status === 'LOCKED') {
    targetUser.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours lock
  } else {
    targetUser.lockUntil = null;
    targetUser.failedLoginAttempts = 0;
  }

  await targetUser.save();

  // Record audit log
  await recordAuditLog({
    action: 'USER_STATUS_UPDATED',
    entity: 'User',
    entityId: targetUser._id,
    performedBy: adminUser._id,
    ipAddress: clientIp,
    userAgent,
    changes: {
      before: { status: previousStatus },
      after: { status }
    },
    metadata: { reason, targetEmail: targetUser.email }
  });

  return targetUser;
};

/**
 * Creates an administrative staff or admin user account (Super-Admin only).
 */
export const createAdministrativeUser = async (
  superAdminUser,
  { firstName, lastName, email, phone, role, password },
  clientIp = '127.0.0.1',
  userAgent = ''
) => {
  if (superAdminUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only Super Administrators can create administrative staff accounts.');
  }

  if (!['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new BadRequestError('Role must be STAFF, ADMIN, or SUPER_ADMIN.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ConflictError('A user with this email address already exists.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const newUser = new User({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : undefined,
    passwordHash,
    role,
    status: 'ACTIVE',
    isVerified: true
  });

  await newUser.save();

  await recordAuditLog({
    action: 'ADMIN_USER_CREATED',
    entity: 'User',
    entityId: newUser._id,
    performedBy: superAdminUser._id,
    ipAddress: clientIp,
    userAgent,
    changes: {
      role,
      email: normalizedEmail
    },
    metadata: { role, createdRole: role }
  });

  const userObj = newUser.toObject();
  delete userObj.passwordHash;
  return userObj;
};

/**
 * Updates a user's role (Super-Admin only).
 */
export const updateUserRole = async (
  userId,
  superAdminUser,
  { role, reason = '' },
  clientIp = '127.0.0.1',
  userAgent = ''
) => {
  if (superAdminUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only Super Administrators can promote or demote user roles.');
  }

  if (!['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new BadRequestError('Invalid user role.');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new NotFoundError('User not found.');
  }

  // Prevent Super-Admin from demoting themselves
  if (targetUser._id.toString() === superAdminUser._id.toString() && role !== 'SUPER_ADMIN') {
    throw new BadRequestError('Super Administrators cannot demote their own account.');
  }

  const previousRole = targetUser.role;
  targetUser.role = role;
  await targetUser.save();

  await recordAuditLog({
    action: 'USER_ROLE_CHANGED',
    entity: 'User',
    entityId: targetUser._id,
    performedBy: superAdminUser._id,
    ipAddress: clientIp,
    userAgent,
    changes: {
      before: { role: previousRole },
      after: { role }
    },
    metadata: { reason, targetEmail: targetUser.email }
  });

  return targetUser;
};
