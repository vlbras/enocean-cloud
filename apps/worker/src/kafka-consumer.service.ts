import { APP_CONFIG, AppConfig, Logger, SensorEvent, SensorEventSchema } from '@enocean/common';
import { Inject, Injectable } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';

import { BufferService } from './buffer.service';
import { KafkaDlqProducerService } from './kafka-dlq-producer.service';

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
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly bufferService: BufferService,
    private readonly dlqProducer: KafkaDlqProducerService,
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
      eachMessage: async ({ topic, partition, message }) => {
        const rawValue = message.value?.toString() ?? null;

        try {
          if (!rawValue) {
            throw new Error('Kafka message value is empty');
          }

          const parsed: unknown = JSON.parse(rawValue);
          const event: SensorEvent = SensorEventSchema.parse(parsed);

          this.bufferService.addEvent(event);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);

          logger.error('Failed to process message', { error: reason });

          try {
            await this.dlqProducer.publishMalformedEvent({
              rawValue,
              reason,
              topic,
              partition,
              offset: message.offset,
              timestamp: message.timestamp,
            });
          } catch (dlqErr) {
            logger.error('Failed to publish message to DLQ', {
              error: dlqErr instanceof Error ? dlqErr.message : String(dlqErr),
            });
          }
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
