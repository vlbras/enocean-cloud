import { AggregationInterval, APP_CONFIG, AppConfig, DeviceHistoryDoc } from '@enocean/common';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Collection, Document, Filter, MongoClient } from 'mongodb';

import { GetDeviceHistoryQuery, GetDeviceHistoryResponse } from './dto/get-device-history.dto';
import {
  GetDeviceSensorAggregateItem,
  GetDeviceSensorAggregateQuery,
} from './dto/get-device-sensor-aggregate.dto';

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

  async getDeviceSensorAggregate(
    deviceId: string,
    sensor: string,
    query: GetDeviceSensorAggregateQuery,
  ): Promise<GetDeviceSensorAggregateItem[]> {
    const bucketSizeMs = this.getBucketSizeMs(query.interval);

    const pipeline: Document[] = [
      {
        $match: {
          deviceId,
          sensor,
          ts: {
            $gte: query.from,
            $lte: query.to,
          },
          value: {
            $type: 'number',
          },
        },
      },
      {
        $project: {
          _id: 0,
          ts: 1,
          value: 1,
          bucketTs: {
            $subtract: ['$ts', { $mod: ['$ts', bucketSizeMs] }],
          },
        },
      },
      {
        $group: {
          _id: '$bucketTs',
          min: { $min: '$value' },
          max: { $max: '$value' },
          avg: { $avg: '$value' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          ts: '$_id',
          min: 1,
          max: 1,
          avg: 1,
          count: 1,
        },
      },
      {
        $sort: {
          ts: 1,
        },
      },
    ];

    const result = await this.historyCol
      .aggregate<GetDeviceSensorAggregateItem>(pipeline)
      .toArray();

    return result.map((item) => ({
      ts: item.ts,
      min: item.min,
      max: item.max,
      avg: item.avg,
      count: item.count,
    }));
  }

  private getBucketSizeMs(interval: AggregationInterval): number {
    switch (interval) {
      case AggregationInterval.ONE_MINUTE:
        return 60 * 1000;

      case AggregationInterval.FIVE_MINUTES:
        return 5 * 60 * 1000;

      case AggregationInterval.ONE_HOUR:
        return 60 * 60 * 1000;

      case AggregationInterval.ONE_DAY:
        return 24 * 60 * 60 * 1000;
    }
  }
}
