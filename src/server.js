import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './utils/logger.js';

let server;

const startServer = async () => {
  try {
    // 1. Establish MongoDB connection
    logger.info('Connecting to MongoDB cluster...');
    await connectDatabase();

    // 2. Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`✨ AUREVÉ REST API service online on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`✨ Health endpoint active at: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      logger.info(`✨ Readiness probe active at: http://localhost:${env.PORT}${env.API_PREFIX}/health/readiness`);
    });
  } catch (error) {
    logger.error(`Fatal startup failure: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await disconnectDatabase();
        logger.info('Graceful shutdown completed. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error(`Error during database disconnect: ${err.message}`);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown timeout reached. Terminating process.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.message : reason}`, {
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  handleShutdown('uncaughtException');
});

startServer();
