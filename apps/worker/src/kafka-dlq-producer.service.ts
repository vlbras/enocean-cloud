import { APP_CONFIG, AppConfig, Logger } from '@enocean/common';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

const logger = new Logger('kafka-dlq-producer');

@Injectable()
export class KafkaDlqProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.kafka = new Kafka({
      clientId: 'enocean-worker-dlq',
      brokers: config.kafka.brokers,
    });

    this.producer = this.kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    logger.info('DLQ producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    logger.info('DLQ producer disconnected');
  }

  async publishMalformedEvent(params: {
    rawValue: string | null;
    reason: string;
    topic: string;
    partition: number;
    offset: string;
    timestamp?: string;
  }): Promise<void> {
    await this.producer.send({
      topic: `${this.config.kafka.topic}.dlq`,
      messages: [
        {
          key: params.topic,
          value: JSON.stringify({
            rawValue: params.rawValue,
            reason: params.reason,
            source: {
              topic: params.topic,
              partition: params.partition,
              offset: params.offset,
              timestamp: params.timestamp ?? null,
            },
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });
  }
}
