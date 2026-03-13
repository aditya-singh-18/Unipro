import fs from 'fs/promises';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'tracker-jobs');

const safeError = (error) => {
  if (!error) return null;
  return {
    message: String(error?.message || error),
    name: String(error?.name || 'Error'),
  };
};

export const writeCronJobLog = async ({ job, status, durationMs, result, error }) => {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const filePath = path.join(LOG_DIR, `${job}-${day}.jsonl`);

  const payload = {
    ts: now.toISOString(),
    job,
    status,
    durationMs,
    result: result || null,
    error: safeError(error),
  };

  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (writeErr) {
    console.error('[CronLogger] failed to write log:', writeErr?.message || writeErr);
  }
};
