import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';

/**
 * Waits for MongoDB and Kafka to be ready.
 * Used by CI and integration test setup.
 */
async function waitForMongo(uri: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      console.log('✓ MongoDB is ready');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('MongoDB did not become ready in time');
}

async function waitForKafka(brokers: string[], timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  const kafka = new Kafka({ clientId: 'wait-ready', brokers });
  const admin = kafka.admin();

  while (Date.now() - start < timeoutMs) {
    try {
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      console.log('✓ Kafka is ready');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Kafka did not become ready in time');
}

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

  console.log('Waiting for dependencies to be ready...');
  await Promise.all([
    waitForMongo(mongoUri),
    waitForKafka(kafkaBrokers),
  ]);
  console.log('All dependencies ready!');
}

main().catch((err) => {
  console.error('Dependency check failed:', err.message);
  process.exit(1);
});
