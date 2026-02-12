import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple logger that writes to console and optionally to a file.
 * We used to use winston but stripped it out to reduce deps.
 */
export class Logger {
  private logStream: fs.WriteStream | null = null;

  constructor(private readonly context: string) {
    const logDir = process.env.LOG_DIR;
    if (logDir) {
      const logFile = path.join(logDir, `${context}.log`);
      fs.mkdirSync(logDir, { recursive: true });
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    }
  }

  info(message: string, meta?: Record<string, any>) {
    this.write('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.write('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.write('ERROR', message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.write('DEBUG', message, meta);
    }
  }

  private write(level: string, message: string, meta?: Record<string, any>) {
    const ts = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `[${ts}] [${level}] [${this.context}] ${message}${metaStr}`;
    console.log(line);
    this.logStream?.write(`${line}\n`);
  }
}
