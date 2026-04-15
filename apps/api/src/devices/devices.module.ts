import { APP_CONFIG, loadConfig } from '@enocean/common';
import { Module } from '@nestjs/common';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [DevicesController],
  providers: [
    DevicesService,
    {
      provide: APP_CONFIG,
      useValue: loadConfig(),
    },
  ],
  exports: [DevicesService],
})
export class DevicesModule {}
