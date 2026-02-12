import { SensorEvent } from '@enocean/common';
import { Kafka, Producer } from 'kafkajs';

/**
 * Creates a test Kafka producer and provides helper methods
 * to publish sensor events to the topic.
 */
export class TestKafkaProducer {
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    private brokers: string[],
    private topic: string,
  ) {
    this.kafka = new Kafka({
      clientId: 'test-producer',
      brokers: this.brokers,
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    await this.producer.connect();
  }

  async disconnect() {
    await this.producer.disconnect();
  }

  /**
   * Send a batch of sensor events to Kafka
   */
  async sendEvents(events: SensorEvent[]) {
    await this.producer.send({
      topic: this.topic,
      messages: events.map((e) => ({
        key: e.deviceId,
        value: JSON.stringify(e),
      })),
    });
  }

  /**
   * Generates test events — useful for integration tests
   */
  static generateEvents(deviceCount: number, eventsPerDevice: number): SensorEvent[] {
    const events: SensorEvent[] = [];
    for (let d = 0; d < deviceCount; d++) {
      for (let e = 0; e < eventsPerDevice; e++) {
        events.push({
          deviceId: `device-${d.toString().padStart(3, '0')}`,
          ts: Date.now() + e * 100, // increasing timestamps
          sensor: `temp`,
          value: 20 + Math.random() * 10,
        });
      }
    }
    return events;
  }
}
