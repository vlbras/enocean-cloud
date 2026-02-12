# EnOcean Assessment — Device Event Pipeline

A NestJS monorepo that ingests device sensor events from Kafka, buffers them, and flushes to MongoDB.

## Architecture

```
Kafka → [Worker: KafkaConsumer → BufferService → MongoWriter] → MongoDB
                                                                    ↑
                                                    [API] ─── reads ─┘
```

### Apps

- **worker** — Standalone NestJS app that consumes Kafka events, buffers per-device, and flushes to MongoDB
- **api** — NestJS HTTP app with health check and (stubbed) device read endpoints

### Libraries

- **@enocean/common** — Shared types, config loader, logger
- **@enocean/testing** — Integration test helpers, Docker orchestration, Kafka/Mongo test utilities

## Tech Stack

- Node 20+ (see `.nvmrc`)
- TypeScript (strict mode)
- NestJS 10
- MongoDB (official driver, no Mongoose)
- KafkaJS
- Yarn 4 workspaces
- Jest
- Docker Compose

## Getting Started

### Prerequisites

- Node 20+ (use `nvm use` if you have nvm)
- Docker & Docker Compose
- Yarn 4 (included via corepack)

### Setup

```bash
# Install dependencies
yarn install

# Start MongoDB + Kafka
yarn deps:up

# Wait for services to be ready
npx ts-node scripts/wait-ready.ts

# Build the project
yarn build
```

### Running Tests

```bash
# Unit tests
yarn test

# Integration tests (requires Docker services running)
yarn test:integration

# All tests
yarn test:all
```

### Running the Apps

```bash
# Worker (Kafka consumer)
npx ts-node apps/worker/src/main.ts

# API server
npx ts-node apps/api/src/main.ts
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKA_GROUP_ID` | `enocean-worker` | Consumer group ID |
| `KAFKA_TOPIC` | `device.events` | Topic to consume |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection URI |
| `MONGO_DB` | `enocean` | Database name |
| `FLUSH_INTERVAL_MS` | `500` | Buffer flush interval |
| `FLUSH_MAX_BUFFER_SIZE` | `10` | Max events before forced flush |
| `FLUSH_DEBUG_DELAY_MS` | `0` | Debug delay between read and write (for testing) |
| `PORT` | `3000` | API server port |
| `LOG_DIR` | _(none)_ | Directory for log files |
| `LOG_LEVEL` | _(none)_ | Set to `debug` for verbose logs |

## Data Model

### Kafka Event

```json
{
  "deviceId": "device-001",
  "ts": 1700000000000,
  "sensor": "temperature",
  "value": 23.5
}
```

### MongoDB Collections

- **devices.history** — Append-only log of all sensor events
- **devices.latest** — Latest sensor values per device (upserted)

## Project Structure

```
├── apps/
│   ├── api/              # REST API
│   └── worker/           # Kafka consumer + flush pipeline
├── libs/
│   ├── common/           # Shared types, config, logger
│   └── testing/          # Test helpers
├── scripts/              # Docker management scripts
├── docker-compose.yml
├── TASKS.md              # Assessment tasks
├── AGENTS.md             # AI assistant guidelines
└── README.md             # This file
```
