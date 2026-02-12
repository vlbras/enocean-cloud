import { execSync } from 'child_process';
import * as path from 'path';

const root = path.resolve(__dirname, '..');

console.log('Stopping dependencies...');
try {
  execSync('docker compose down -v', { cwd: root, stdio: 'inherit' });
  console.log('Dependencies stopped.');
} catch (err) {
  console.error('Failed to stop dependencies:', err);
  process.exit(1);
}
