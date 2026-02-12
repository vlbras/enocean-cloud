import { execSync } from 'child_process';
import * as path from 'path';

const root = path.resolve(__dirname, '..');

console.log('Starting dependencies...');
try {
  execSync('docker compose up -d', { cwd: root, stdio: 'inherit' });
  console.log('Dependencies started. Run `yarn deps:wait` or wait a moment for services to be healthy.');
} catch (err) {
  console.error('Failed to start dependencies:', err);
  process.exit(1);
}
