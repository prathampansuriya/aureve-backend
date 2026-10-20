import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnecting = false;

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    logger.debug('MongoDB already connected.');
    return mongoose.connection;
  }

  if (isConnecting) {
    logger.debug('MongoDB connection already in progress.');
    return;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info(`MongoDB connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    isConnecting = false;
    return conn.connection;
  } catch (error) {
    isConnecting = false;
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB runtime connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected from database.');
});

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly.');
  }
};
