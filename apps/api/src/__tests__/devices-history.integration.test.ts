import { DeviceHistoryDoc, loadConfig } from '@enocean/common';
import { cleanCollections, getTestMongoClient } from '@enocean/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Collection, Db, MongoClient } from 'mongodb';
import request from 'supertest';

import { ApiModule } from '../api.module';

describe('Devices History API Integration', () => {
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
    await app.close();
    await mongoClient.close();
  });

  beforeEach(async () => {
    await cleanCollections(db);
  });

  it('returns paginated device history sorted by ts desc', async () => {
    const deviceId = 'device-1';

    await historyCol.insertMany([
      {
        deviceId,
        ts: 1000,
        sensor: 'temperature',
        value: 21,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        ts: 3000,
        sensor: 'temperature',
        value: 23,
        ingestedAt: new Date(),
      },
      {
        deviceId,
        ts: 2000,
        sensor: 'humidity',
        value: 55,
        ingestedAt: new Date(),
      },
      {
        deviceId: 'other-device',
        ts: 9999,
        sensor: 'temperature',
        value: 99,
        ingestedAt: new Date(),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get(`/devices/${deviceId}/history`)
      .query({ page: 1, limit: 2 })
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(2);
    expect(response.body.data).toHaveLength(2);

    expect(response.body.data[0].deviceId).toBe(deviceId);
    expect(response.body.data[0].ts).toBe(3000);

    expect(response.body.data[1].deviceId).toBe(deviceId);
    expect(response.body.data[1].ts).toBe(2000);
  });

  it('filters device history by sensor', async () => {
    const deviceId = 'device-1';

    await historyCol.insertMany([
      { deviceId, ts: 1000, sensor: 'temperature', value: 21, ingestedAt: new Date() },
      { deviceId, ts: 2000, sensor: 'humidity', value: 55, ingestedAt: new Date() },
      { deviceId, ts: 3000, sensor: 'temperature', value: 23, ingestedAt: new Date() },
    ]);

    const response = await request(app.getHttpServer())
      .get(`/devices/${deviceId}/history`)
      .query({ sensor: 'temperature' })
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.every((item: any) => item.sensor === 'temperature')).toBe(true);
  });

  it('returns 400 when limit is greater than 200', async () => {
    await request(app.getHttpServer())
      .get('/devices/device-1/history')
      .query({ limit: 201 })
      .expect(400);
  });
});
