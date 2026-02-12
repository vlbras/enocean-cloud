import {
  AppConfig,
  DeviceHistoryDoc,
  DeviceLatestDoc,
  loadConfig,
  SensorEvent,
} from '@enocean/common';
import {
  cleanCollections,
  getTestMongoClient,
  TestKafkaProducer,
  waitForHistoryCount,
} from '@enocean/testing';
import type { Admin } from 'kafkajs';
import { Kafka } from 'kafkajs';
import { Collection, Db, MongoClient } from 'mongodb';

import { BufferService } from '../buffer.service';
import { MongoWriterService } from '../mongo-writer.service';

/**
 * Integration tests for the worker flush pipeline.
 *
 * These tests validate that events ingested through the buffer
 * are correctly flushed to MongoDB without data loss.
 *
 * NOTE: These tests REQUIRE Docker services (MongoDB + Kafka) running.
 * Run with: yarn test:integration
 *
 * Expected: THESE TESTS SHOULD FAIL due to the concurrency bug
 * in BufferService. The candidate is expected to fix it.
 */

const DEVICE_COUNT = 20;
const EVENTS_PER_DEVICE = 10;
const TOTAL_EVENTS = DEVICE_COUNT * EVENTS_PER_DEVICE;
const TOPIC = 'device.events.test';

describe('Worker Integration — Concurrency Bug', () => {
  let mongoClient: MongoClient;
  let db: Db;
  let history: Collection<DeviceHistoryDoc>;
  let latest: Collection<DeviceLatestDoc>;
  let config: AppConfig;
  let bufferService: BufferService;
  let mongoWriter: MongoWriterService;
  let kafkaAdmin: Admin;

  beforeAll(async () => {
    config = loadConfig();
    config.kafka.topic = TOPIC;
    // Ensure debug delay is set to widen the race window
    config.flush.debugDelayMs = parseInt(process.env.FLUSH_DEBUG_DELAY_MS || '200', 10);
    config.flush.maxBufferSize = 5; // smaller buffer to trigger more flushes
    config.flush.intervalMs = 100;

    const mongo = await getTestMongoClient(config.mongo.uri, config.mongo.dbName);
    mongoClient = mongo.client;
    db = mongo.db;
    history = mongo.history;
    latest = mongo.latest;

    // Ensure topic exists
    const kafka = new Kafka({ brokers: config.kafka.brokers, clientId: 'test-admin' });
    kafkaAdmin = kafka.admin();
    await kafkaAdmin.connect();
    const topics = await kafkaAdmin.listTopics();
    if (!topics.includes(TOPIC)) {
      await kafkaAdmin.createTopics({
        topics: [{ topic: TOPIC, numPartitions: 3, replicationFactor: 1 }],
      });
    }
  }, 30000);

  afterAll(async () => {
    await kafkaAdmin?.disconnect();
    await mongoClient?.close();
  }, 15000);

  beforeEach(async () => {
    await cleanCollections(db);

    // Create fresh instances for each test
    mongoWriter = new MongoWriterService(config);
    await mongoWriter.onModuleInit();

    bufferService = new BufferService(config, mongoWriter);
  });

  afterEach(async () => {
    // Wait a bit for any in-flight async flushes to settle before
    // tearing down the mongo connection
    await new Promise((r) => setTimeout(r, 2000));
    await mongoWriter?.onModuleDestroy();
  });

  it('history must contain all events under concurrent ingestion', async () => {
    // Generate test events: 20 devices × 10 events = 200 total
    const allEvents = TestKafkaProducer.generateEvents(DEVICE_COUNT, EVENTS_PER_DEVICE);

    // Rapidly ingest all events — this will trigger both size-based
    // and timer-based flushes, creating overlapping async operations
    for (const event of allEvents) {
      bufferService.addEvent(event);
    }

    // Wait for all flushes to complete
    const historyCount = await waitForHistoryCount(history, TOTAL_EVENTS, 30000);

    // Check for duplicates
    const allDocs = await history.find({}).toArray();
    const uniqueKeys = new Set(allDocs.map((d) => `${d.deviceId}:${d.ts}:${d.sensor}`));

    // These assertions SHOULD FAIL because:
    // 1. Events arriving during flush are lost (buffer cleared after async write)
    // 2. Overlapping flushes may cause duplicate writes
    expect(historyCount).toBe(TOTAL_EVENTS);
    expect(uniqueKeys.size).toBe(TOTAL_EVENTS);
    expect(allDocs.length).toBe(TOTAL_EVENTS);
  }, 60000);

  it('latest must match newest sensor values', async () => {
    const deviceId = 'device-latest-test';
    const sensor = 'temperature';

    // Send multiple updates with increasing timestamps
    const events: SensorEvent[] = [];
    for (let i = 0; i < 20; i++) {
      events.push({
        deviceId,
        ts: 1000 + i * 100, // increasing: 1000, 1100, 1200, ...
        sensor,
        value: 20 + i,
      });
    }

    // Ingest rapidly
    for (const event of events) {
      bufferService.addEvent(event);
    }

    // Wait for events to be flushed
    await waitForHistoryCount(history, events.length, 30000);

    // Check latest — should have the newest value
    const latestDoc = await latest.findOne({ _id: deviceId });

    expect(latestDoc).not.toBeNull();
    expect(latestDoc!.sensors).toBeDefined();
    expect(latestDoc!.sensors[sensor]).toBeDefined();

    // The newest event has ts=2900 (1000 + 19*100) and value=39
    // Due to the race condition, latest might not reflect the true newest value
    expect(latestDoc!.sensors[sensor].ts).toBe(1000 + 19 * 100);
    expect(latestDoc!.sensors[sensor].value).toBe(39);
  }, 60000);
});
