import { execSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

/**
 * Start docker-compose dependencies
 * Assumes docker-compose.yml is at project root
 */
export function startDeps(): void {
  execSync('docker compose up -d --wait', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

/**
 * Stop docker-compose dependencies
 */
export function stopDeps(): void {
  execSync('docker compose down -v', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
