import mongoose from 'mongoose';
import { logger } from './logger.js';

/**
 * Checks whether the active MongoDB connection topology supports multi-document ACID transactions.
 * MongoDB transactions require a Replica Set or Sharded Cluster (mongos).
 * Standalone single instances (often used in local development) do not support transactions.
 */
export const isReplicaSetSupported = () => {
  try {
    const topology = mongoose.connection.client?.topology?.description?.type;
    return topology === 'ReplicaSetWithPrimary' || topology === 'Sharded';
  } catch {
    return false;
  }
};

/**
 * Executes a database operation within a transaction if replica set is available,
 * or gracefully runs the callback directly if on a standalone developer instance.
 *
 * @param {Function} operation - Async function receiving (session)
 * @returns {Promise<any>} Result of the operation
 */
export const runInTransaction = async (operation) => {
  const supportsTransactions = isReplicaSetSupported();

  if (!supportsTransactions) {
    logger.debug('MongoDB is running in standalone mode. Executing operation without replica-set transaction.');
    return operation(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
