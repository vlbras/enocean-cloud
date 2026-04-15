import { APP_CONFIG, AppConfig, DeviceHistoryDoc } from '@enocean/common';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Collection, Filter, MongoClient } from 'mongodb';

import { GetDeviceHistoryQuery, GetDeviceHistoryResponse } from './dto/get-device-history.dto';

@Injectable()
export class DevicesService implements OnModuleInit, OnModuleDestroy {
  private client!: MongoClient;
  private historyCol!: Collection<DeviceHistoryDoc>;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async onModuleInit(): Promise<void> {
    this.client = new MongoClient(this.config.mongo.uri);
    await this.client.connect();

    const db = this.client.db(this.config.mongo.dbName);
    this.historyCol = db.collection<DeviceHistoryDoc>('devices.history');

    await this.historyCol.createIndex({ deviceId: 1, sensor: 1, ts: 1 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  async getDeviceHistory(
    deviceId: string,
    query: GetDeviceHistoryQuery,
  ): Promise<GetDeviceHistoryResponse> {
    const filter: Filter<DeviceHistoryDoc> = { deviceId };

    if (query.sensor) {
      filter.sensor = query.sensor;
    }

    if (query.from !== undefined || query.to !== undefined) {
      filter.ts = {};

      if (query.from !== undefined) {
        filter.ts.$gte = query.from;
      }

      if (query.to !== undefined) {
        filter.ts.$lte = query.to;
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.historyCol.find(filter).sort({ ts: -1 }).skip(skip).limit(query.limit).toArray(),
      this.historyCol.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
