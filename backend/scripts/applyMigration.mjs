/**
 * Migration runner – applies a single SQL file via DATABASE_URL from .env
 * Usage: node scripts/applyMigration.mjs <path-to-sql-file>
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node scripts/applyMigration.mjs <path-to-sql-file>');
  process.exit(1);
}

const sql = readFileSync(resolve(__dirname, '..', sqlFile), 'utf8');
console.log(`\n=== Applying migration: ${sqlFile} ===\n`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let client;
try {
  client = await pool.connect();
  await client.query(sql);
  console.log('[OK] Migration applied successfully.');
} catch (err) {
  console.error('[FAIL]', err.message);
  process.exit(1);
} finally {
  if (client) client.release();
  await pool.end();
}
