# Assessment Tasks

Welcome to the EnOcean backend assessment. This repository contains a working (but buggy) device event ingestion pipeline. Your job is to fix the bugs, add features, and demonstrate your engineering skills.

## Submitting Your Assignment

To complete this assessment, please follow these steps:

1. **Fork this repository** to your own GitHub/BitBucket account. Do not work directly in the original repository.
2. **Clone your forked repository** to your local machine.
3. **Complete the assignments** as described in this document and the project files. Commit your changes regularly to your forked repository.
4. When you are finished, **push all your commits** to your fork on GitHub/BitBucket.
5. **Send us the link** to your forked repository so we can review your work.

This process ensures your work is isolated and reviewable. If you have any questions, please reach out to your contact for this assessment.

## Context

This is a brownfield codebase. The worker app consumes device sensor events from Kafka, buffers them per-device, and periodically flushes to MongoDB. The API app exposes read endpoints.

**The codebase has a known bug** affecting event ingestion. The integration tests demonstrate this — they are currently failing.

## Task 1: Fix the Bug

**Priority: High**

There is a bug in the event ingestion pipeline that causes data consistency issues under load.

### Acceptance Criteria

- [ ] All integration tests pass: `yarn test:integration`
- [ ] No events are lost under ingestion
- [ ] No duplicate events in `devices.history`
- [ ] `devices.latest` always reflects the newest sensor value per device
- [ ] `FLUSH_DEBUG_DELAY_MS` should still work for testing purposes

### Constraints

- Do not remove the buffering/flush architecture
- Do not change the test expectations
- Keep the solution simple and production-ready

---

## Task 2: Device History API with Pagination

**Priority: Medium**

Add a REST endpoint to query the event history for a specific device.

### Requirements

- `GET /devices/:deviceId/history`
- Query parameters:
  - `sensor` (optional) — filter by sensor name
  - `from` / `to` (optional) — timestamp range filter
  - `page` (default: 1) — page number
  - `limit` (default: 50, max: 200) — page size
- Response: `{ data: DeviceHistoryDoc[], total: number, page: number, limit: number }`
- Sorted by `ts` descending
- Use the existing MongoDB connection and collection

### Acceptance Criteria

- [ ] Endpoint works correctly with all query parameters
- [ ] Pagination is implemented correctly (offset-based is fine)
- [ ] Input validation exists for limit, page, timestamps
- [ ] Unit or integration test covers the happy path

---

## Task 3: Sensor Aggregation Endpoint

**Priority: Medium**

Add an endpoint that returns aggregated sensor data for a device.

### Requirements

- `GET /devices/:deviceId/sensors/:sensor/aggregate`
- Query parameters:
  - `from` / `to` (required) — timestamp range
  - `interval` (required) — aggregation window: `1m`, `5m`, `1h`, `1d`
- Response: array of `{ ts: number, min: number, max: number, avg: number, count: number }`
- Use MongoDB aggregation pipeline
- Only works for numeric sensor values

### Acceptance Criteria

- [ ] Aggregation returns correct results
- [ ] Handles edge cases (no data, non-numeric values)
- [ ] At least one integration test

---

## General Expectations

- Code should be clean, well-typed, and follow existing patterns
- Document any AI-assisted code in `AI_CODE_SUMMARY.md`
- Track your AI usage in `AI_USAGE.md`
- Commit regularly with meaningful messages
- Keep changes focused and reviewable

## Running the Tests

```bash
# Start dependencies
yarn deps:up

# Wait for services
npx ts-node scripts/wait-ready.ts

# Run integration tests (will fail until Task 1 is fixed)
yarn test:integration
```

Good luck! 🚀
