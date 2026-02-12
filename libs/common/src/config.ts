/**
 * Centralized config — reads from env vars
 * Note: some of these defaults are for local dev only
 */
export interface AppConfig {
  kafka: {
    brokers: string[];
    groupId: string;
    topic: string;
  };
  mongo: {
    uri: string;
    dbName: string;
  };
  flush: {
    intervalMs: number;
    maxBufferSize: number;
    debugDelayMs: number;
  };
  port: number;
}

export function loadConfig(): AppConfig {
  return {
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: process.env.KAFKA_GROUP_ID || 'enocean-worker',
      topic: process.env.KAFKA_TOPIC || 'device.events',
    },
    mongo: {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGO_DB || 'enocean',
    },
    flush: {
      intervalMs: parseInt(process.env.FLUSH_INTERVAL_MS || '500', 10),
      maxBufferSize: parseInt(process.env.FLUSH_MAX_BUFFER_SIZE || '10', 10),
      // This widens the race window for testing — set to 0 in production
      debugDelayMs: parseInt(process.env.FLUSH_DEBUG_DELAY_MS || '0', 10),
    },
    port: parseInt(process.env.PORT || '3000', 10),
  };
}
