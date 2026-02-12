import { AppConfig, BufferEntry, Logger, SensorEvent } from '@enocean/common';
import { Inject, Injectable } from '@nestjs/common';

import { MongoWriterService } from './mongo-writer.service';

const logger = new Logger('buffer-service');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Buffers incoming sensor events per device and flushes them to MongoDB.
 *
 * Flush triggers:
 * - Timer: after FLUSH_INTERVAL_MS (default 500ms)
 * - Size: when buffer reaches FLUSH_MAX_BUFFER_SIZE (default 10)
 *
 * Known issues: there might be edge cases with concurrent flushes
 * but it works fine in our dev environment. — Jake, 2024-03
 */
@Injectable()
export class BufferService {
  private readonly buffers: Map<string, BufferEntry> = new Map();
  private readonly intervalMs: number;
  private readonly maxBufferSize: number;
  private readonly debugDelayMs: number;

  constructor(
    @Inject('APP_CONFIG') private readonly config: AppConfig,
    private readonly mongoWriter: MongoWriterService,
  ) {
    this.intervalMs = config.flush.intervalMs;
    this.maxBufferSize = config.flush.maxBufferSize;
    this.debugDelayMs = config.flush.debugDelayMs;
  }

  /**
   * Add an event to the device buffer.
   * Will trigger flush if buffer is full.
   */
  addEvent(event: SensorEvent): void {
    let buffer = this.buffers.get(event.deviceId);
    if (!buffer) {
      buffer = { items: [], timer: null };
      this.buffers.set(event.deviceId, buffer);
    }

    buffer.items.push(event);

    // Start timer if not already running
    if (!buffer.timer) {
      buffer.timer = setTimeout(() => {
        buffer!.timer = null;
        this.flush(event.deviceId);
      }, this.intervalMs);
    }

    if (buffer.items.length >= this.maxBufferSize) {
      this.flush(event.deviceId);
    }
  }

  /**
   * Flush buffered events for a device to MongoDB.
   *
   * Note: this is called from both the timer callback and the size check.
   * Should be fine since JS is single-threaded... right?
   */
  async flush(deviceId: string): Promise<void> {
    const buffer = this.buffers.get(deviceId);
    const items = buffer?.items;
    if (!items?.length) return;

    const toFlush = items;

    logger.debug(`Flushing ${toFlush.length} events for ${deviceId}`);

    if (this.debugDelayMs > 0) {
      await sleep(this.debugDelayMs);
    }

    try {
      await this.mongoWriter.writeEvents(deviceId, toFlush);
    } catch (err) {
      logger.error(`Flush failed for ${deviceId}: ${(err as Error).message}`);
      return;
    }
    items.length = 0;

    if (buffer?.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }
  }

  /**
   * Flush all remaining buffers — used during shutdown
   */
  async flushAll(): Promise<void> {
    const deviceIds = Array.from(this.buffers.keys());
    for (const deviceId of deviceIds) {
      await this.flush(deviceId);
    }
  }

  /** Visible for testing */
  getBufferSize(deviceId: string): number {
    return this.buffers.get(deviceId)?.items.length ?? 0;
  }
}
