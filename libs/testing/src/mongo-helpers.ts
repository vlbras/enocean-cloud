import { DeviceHistoryDoc, DeviceLatestDoc } from '@enocean/common';
import { Collection, Db, MongoClient } from 'mongodb';

/**
 * Connects to Mongo and returns the collections we care about.
 * Caller is responsible for closing the client.
 */
export async function getTestMongoClient(uri: string, dbName: string) {
  const client = new MongoClient(uri);
  await client.connect();
  const db: Db = client.db(dbName);

  const history: Collection<DeviceHistoryDoc> = db.collection('devices.history');
  const latest: Collection<DeviceLatestDoc> = db.collection('devices.latest');

  return { client, db, history, latest };
}

/**
 * Cleans test collections — useful between test runs
 */
export async function cleanCollections(db: Db) {
  await db.collection('devices.history').deleteMany({});
  await db.collection('devices.latest').deleteMany({});
}

/**
 * Polls mongo until the expected count of history docs appears,
 * or times out. Better than arbitrary sleep.
 */
export async function waitForHistoryCount(
  history: Collection<DeviceHistoryDoc>,
  expectedCount: number,
  timeoutMs = 15000,
  pollIntervalMs = 200,
): Promise<number> {
  const start = Date.now();
  let count = 0;
  while (Date.now() - start < timeoutMs) {
    count = await history.countDocuments();
    if (count >= expectedCount) return count;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return count; // return whatever we got, test will fail on assert
}

/**
 * Wait until latest collection has entries for all device IDs
 */
export async function waitForLatestDevices(
  latest: Collection<DeviceLatestDoc>,
  deviceIds: string[],
  timeoutMs = 15000,
  pollIntervalMs = 200,
): Promise<number> {
  const start = Date.now();
  let count = 0;
  while (Date.now() - start < timeoutMs) {
    count = await latest.countDocuments({ _id: { $in: deviceIds } });
    if (count >= deviceIds.length) return count;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return count;
}
