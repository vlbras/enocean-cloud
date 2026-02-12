import { AppConfig, Logger, SensorEvent } from '@enocean/common';
import { Inject, Injectable } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';

import { BufferService } from './buffer.service';

const logger = new Logger('kafka-consumer');

/**
 * Consumes sensor events from Kafka and feeds them to the buffer.
 * We run with partitionsConsumedConcurrently > 1 for throughput.
 */
@Injectable()
export class KafkaConsumerService {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(
    @Inject('APP_CONFIG') private readonly config: AppConfig,
    private readonly bufferService: BufferService,
  ) {
    this.kafka = new Kafka({
      clientId: 'enocean-worker',
      brokers: config.kafka.brokers,
    });
    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
    });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.kafka.topic,
      fromBeginning: true,
    });

    await this.consumer.run({
      // Multiple partitions consumed concurrently — this increases
      // the chance of concurrent flushes happening
      partitionsConsumedConcurrently: 3,
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString();
          if (!value) return;

          const event: SensorEvent = JSON.parse(value);
          this.bufferService.addEvent(event);
        } catch (err) {
          // TODO: DLQ for malformed events
          logger.error('Failed to process message', { error: String(err) });
        }
      },
    });

    logger.info(`Consuming from topic: ${this.config.kafka.topic}`);
  }

  async stop(): Promise<void> {
    await this.bufferService.flushAll();
    await this.consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  }
}
