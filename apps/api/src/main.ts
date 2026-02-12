import { loadConfig, Logger } from '@enocean/common';
import { NestFactory } from '@nestjs/core';

import { ApiModule } from './api.module';

const logger = new Logger('api-main');

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(ApiModule);

  await app.listen(config.port);
  logger.info(`API listening on port ${config.port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start API', { error: String(err) });
  process.exit(1);
});
