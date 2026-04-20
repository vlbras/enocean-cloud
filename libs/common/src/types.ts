import { z } from 'zod';

/**
 * Kafka input event shape — comes from device gateways
 */

export const SensorEventSchema = z.object({
  deviceId: z.string(),
  ts: z.number().nonnegative(),
  sensor: z.string(),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
});

export type SensorEvent = z.infer<typeof SensorEventSchema>;

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
  flushing: boolean;
}
