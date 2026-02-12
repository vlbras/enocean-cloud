import { loadConfig } from '../config';

describe('loadConfig', () => {
  it('should return default config values', () => {
    const config = loadConfig();
    expect(config.kafka.brokers).toEqual(['localhost:9092']);
    expect(config.kafka.topic).toBe('device.events');
    expect(config.mongo.uri).toBe('mongodb://localhost:27017');
    expect(config.flush.intervalMs).toBe(500);
    expect(config.flush.maxBufferSize).toBe(10);
    expect(config.port).toBe(3000);
  });

  it('should respect env vars', () => {
    process.env.KAFKA_BROKERS = 'broker1:9092,broker2:9092';
    process.env.FLUSH_DEBUG_DELAY_MS = '100';
    const config = loadConfig();
    expect(config.kafka.brokers).toEqual(['broker1:9092', 'broker2:9092']);
    expect(config.flush.debugDelayMs).toBe(100);
    delete process.env.KAFKA_BROKERS;
    delete process.env.FLUSH_DEBUG_DELAY_MS;
  });
});
