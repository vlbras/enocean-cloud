import { loadConfig } from '@enocean/common';
import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { BufferService } from './buffer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { MongoWriterService } from './mongo-writer.service';

const config = loadConfig();

@Module({
  providers: [
    {
      provide: 'APP_CONFIG',
      useValue: config,
    },
    BufferService,
    MongoWriterService,
    KafkaConsumerService,
  ],
})
export class WorkerModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly kafkaConsumer: KafkaConsumerService) {}

  async onModuleInit() {
    await this.kafkaConsumer.start();
  }

  async onModuleDestroy() {
    await this.kafkaConsumer.stop();
  }
}
