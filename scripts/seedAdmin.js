import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/cryptoHelper.js';
import { logger } from '../src/utils/logger.js';

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const seedSuperAdmin = async () => {
  logger.info('Starting AUREVÉ Root Administrative Provisioning...');

  const email = (process.env.SUPER_ADMIN_EMAIL || process.argv[2] || 'admin@aureve.com').toLowerCase().trim();
  const password = process.env.SUPER_ADMIN_PASSWORD || process.argv[3] || 'Aureve@Royal2026!';
  const firstName = process.env.SUPER_ADMIN_FIRSTNAME || process.argv[4] || 'AUREVÉ';
  const lastName = process.env.SUPER_ADMIN_LASTNAME || process.argv[5] || 'Master Admin';
  const phone = process.env.SUPER_ADMIN_PHONE || process.argv[6] || '9876543210';

  if (!passwordComplexityRegex.test(password)) {
    logger.error('Provided password does not meet security complexity requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special symbol).');
    process.exit(1);
  }

  try {
    await connectDatabase();

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      if (existingAdmin.role === 'SUPER_ADMIN') {
        logger.warn(`Super-Admin account already exists for ${email}. No action required.`);
        await disconnectDatabase();
        process.exit(0);
      } else {
        logger.info(`Promoting existing user ${email} to SUPER_ADMIN role...`);
        existingAdmin.role = 'SUPER_ADMIN';
        existingAdmin.isVerified = true;
        existingAdmin.status = 'ACTIVE';
        await existingAdmin.save();

        await AuditLog.create({
          action: 'USER_PROMOTED_TO_SUPER_ADMIN_VIA_CLI',
          entity: 'User',
          entityId: existingAdmin._id,
          performedBy: existingAdmin._id,
          ipAddress: '127.0.0.1',
          changes: { role: 'SUPER_ADMIN' }
        });

        logger.info(`✨ Successfully promoted ${email} to SUPER_ADMIN.`);
        await disconnectDatabase();
        process.exit(0);
      }
    }

    const passwordHash = await hashPassword(password);

    const superAdmin = await User.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    await AuditLog.create({
      action: 'ROOT_SUPER_ADMIN_PROVISIONED_VIA_CLI',
      entity: 'User',
      entityId: superAdmin._id,
      performedBy: superAdmin._id,
      ipAddress: '127.0.0.1',
      changes: { email, role: 'SUPER_ADMIN' }
    });

    logger.info(`✨ Root SUPER_ADMIN successfully provisioned!`);
    logger.info(`   Email: ${email}`);
    logger.info(`   Role: ${superAdmin.role}`);
    logger.info(`   Audit record created.`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to provision Super-Admin: ${error.message}`, { stack: error.stack });
    await disconnectDatabase();
    process.exit(1);
  }
};

seedSuperAdmin();
