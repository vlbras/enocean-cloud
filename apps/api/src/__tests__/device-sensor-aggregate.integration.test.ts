import { AggregationInterval, DeviceHistoryDoc, loadConfig } from '@enocean/common';
import { cleanCollections, getTestMongoClient } from '@enocean/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Collection, Db, MongoClient } from 'mongodb';
import request from 'supertest';

import { ApiModule } from '../api.module';

describe('Device Sensor Aggregate API Integration', () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let mongoClient: MongoClient;
  let db: Db;
  let historyCol: Collection<DeviceHistoryDoc>;

  beforeAll(async () => {
    const config = loadConfig();
    const mongo = await getTestMongoClient(config.mongo.uri, config.mongo.dbName);

    mongoClient = mongo.client;
    db = mongo.db;
    historyCol = db.collection<DeviceHistoryDoc>('devices.history');

    app = await NestFactory.create(ApiModule, {
      logger: false,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await mongoClient?.close();
  });

  beforeEach(async () => {
    await cleanCollections(db);
  });

  it('returns sensor aggregates grouped by interval and ignores non-numeric values', async () => {
    const deviceId = 'device-aggregate-1';
    const sensor = 'temperature';

    await historyCol.insertMany([
      {
        deviceId,
        sensor,
        ts: 0,
        value: 10,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        sensor,
        ts: 10_000,
        value: 20,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        sensor,
        ts: 59_000,
        value: 30,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        sensor,
        ts: 60_000,
        value: 40,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        sensor,
        ts: 61_000,
        value: 'bad-value' as never,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        sensor: 'humidity',
        ts: 5_000,
        value: 99,
        ingestedAt: new Date(),
      },
      {
        deviceId: 'other-device',
        sensor,
        ts: 5_000,
        value: 999,
        ingestedAt: new Date(),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get(`/devices/${deviceId}/sensors/${sensor}/aggregate`)
      .query({
        from: 0,
        to: 120_000,
        interval: AggregationInterval.ONE_MINUTE,
      })
      .expect(200);

    expect(response.body).toEqual([
      {
        ts: 0,
        min: 10,
        max: 30,
        avg: 20,
        count: 3,
      },
      {
        ts: 60_000,
        min: 40,
        max: 40,
        avg: 40,
        count: 1,
      },
    ]);
  });

  it('returns 400 when from is greater than to', async () => {
    await request(app.getHttpServer())
      .get('/devices/device-1/sensors/temperature/aggregate')
      .query({
        from: 100,
        to: 50,
        interval: AggregationInterval.ONE_MINUTE,
      })
      .expect(400);
  });

  it('aggregates numeric sensor data into time buckets', async () => {
    const deviceId = 'device-agg-1';

    await historyCol.deleteMany({ deviceId });

    await historyCol.insertMany([
      { deviceId, sensor: 'temperature', value: 20, ts: 1710000000000, ingestedAt: new Date() },
      { deviceId, sensor: 'temperature', value: 22, ts: 1710000060000, ingestedAt: new Date() },
      { deviceId, sensor: 'temperature', value: 24, ts: 1710000240000, ingestedAt: new Date() },
      { deviceId, sensor: 'temperature', value: 26, ts: 1710000300000, ingestedAt: new Date() },
      {
        deviceId,
        sensor: 'temperature',
        value: 'bad-non-numeric',
        ts: 1710000120000,
        ingestedAt: new Date(),
      },
      { deviceId, sensor: 'humidity', value: 55, ts: 1710000000000, ingestedAt: new Date() },
    ]);

    const res = await request(app.getHttpServer())
      .get(`/devices/${deviceId}/sensors/temperature/aggregate`)
      .query({
        interval: AggregationInterval.FIVE_MINUTES,
        from: 1710000000000,
        to: 1710000300000,
      })
      .expect(200);

    expect(res.body).toEqual([
      {
        ts: 1710000000000,
        min: 20,
        max: 24,
        avg: 22,
        count: 3,
      },
      {
        ts: 1710000300000,
        min: 26,
        max: 26,
        avg: 26,
        count: 1,
      },
    ]);
  });
});
