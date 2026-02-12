import { Logger } from '@enocean/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

const logger = new Logger('worker-main');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  logger.info('Worker application started');

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down...`);
      await app.close();
      process.exit(0);
    });
  }
}

bootstrap().catch((err) => {
  logger.error('Failed to start worker', { error: String(err) });
  process.exit(1);
});
