/**
 * Kafka input event shape — comes from device gateways
 * TODO: add validation schema (zod?)
 */
export interface SensorEvent {
  deviceId: string;
  ts: number;
  sensor: string;
  value: number | string | boolean | null;
}

/**
 * Shape of a document in devices.latest collection
 */
export interface DeviceLatestDoc {
  _id: string; // deviceId
  sensors: Record<string, { value: any; ts: number }>;
  updatedAt: Date;
}

/**
 * Shape of a document in devices.history collection
 */
export interface DeviceHistoryDoc {
  deviceId: string;
  ts: number;
  sensor: string;
  value: any;
  ingestedAt: Date;
}

/**
 * Internal buffer entry used by the worker
 */
export interface BufferEntry {
  items: SensorEvent[];
  timer: ReturnType<typeof setTimeout> | null;
}
