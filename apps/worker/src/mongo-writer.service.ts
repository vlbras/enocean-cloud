import {
  APP_CONFIG,
  AppConfig,
  DeviceHistoryDoc,
  DeviceLatestDoc,
  Logger,
  SensorEvent,
} from '@enocean/common';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Collection, Db, MongoClient } from 'mongodb';

const logger = new Logger('mongo-writer');

/**
 * Handles all MongoDB operations for sensor data.
 * Manages connection lifecycle and collection indexes.
 */
@Injectable()
export class MongoWriterService implements OnModuleInit, OnModuleDestroy {
  private client!: MongoClient;
  private db!: Db;
  private historyCol!: Collection<DeviceHistoryDoc>;
  private latestCol!: Collection<DeviceLatestDoc>;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async onModuleInit() {
    this.client = new MongoClient(this.config.mongo.uri);
    await this.client.connect();
    this.db = this.client.db(this.config.mongo.dbName);
    this.historyCol = this.db.collection('devices.history');
    this.latestCol = this.db.collection('devices.latest');

    // Ensure indexes exist
    await this.historyCol.createIndex({ deviceId: 1, ts: 1 });
    logger.info('MongoDB connected and indexes ensured');
  }

  async onModuleDestroy() {
    await this.client?.close();
    logger.info('MongoDB connection closed');
  }

  /**
   * Write events to history and update latest.
   * Called by BufferService on flush.
   */
  async writeEvents(deviceId: string, events: SensorEvent[]): Promise<void> {
    if (!events.length) return;

    const now = new Date();

    // Write all events to history (append-only)
    const historyDocs: DeviceHistoryDoc[] = events.map((e) => ({
      deviceId: e.deviceId,
      ts: e.ts,
      sensor: e.sensor,
      value: e.value,
      ingestedAt: now,
    }));

    await this.historyCol.insertMany(historyDocs);

    // Build the latest sensor map from this batch
    // NOTE: we just take the newest per sensor from this flush batch
    const sensorUpdates: Record<string, { value: any; ts: number }> = {};
    for (const event of events) {
      const existing = sensorUpdates[event.sensor];
      if (!existing || event.ts > existing.ts) {
        sensorUpdates[event.sensor] = { value: event.value, ts: event.ts };
      }
    }

    await this.latestCol.updateOne(
      { _id: deviceId },
      {
        $setOnInsert: {
          _id: deviceId,
          sensors: {},
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    const latestOps = Object.entries(sensorUpdates).map(([sensor, data]) => ({
      updateOne: {
        filter: {
          _id: deviceId,
          $or: [
            { [`sensors.${sensor}`]: { $exists: false } },
            { [`sensors.${sensor}.ts`]: { $lt: data.ts } },
          ],
        },
        update: {
          $set: {
            updatedAt: now,
            [`sensors.${sensor}`]: data,
          },
        },
      },
    }));

    if (latestOps.length) {
      await this.latestCol.bulkWrite(latestOps, { ordered: false });
    }

    logger.debug(`Flushed ${events.length} events for ${deviceId}`);
  }
}
