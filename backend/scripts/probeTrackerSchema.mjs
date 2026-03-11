/**
 * Probe project_weeks + projects table schemas and sample a real project for fixture use
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();

// project_weeks columns
const cols = await client.query(`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'project_weeks'
  ORDER BY ordinal_position
`);
console.log('\n=== project_weeks columns ===');
cols.rows.forEach(c => console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(20)} nullable=${c.is_nullable} default=${c.column_default ?? 'none'}`));

// Sample a real project that has a mentor
const proj = await client.query(`
  SELECT p.project_id, p.mentor_employee_id, COUNT(tm.enrollment_id) AS member_count
  FROM projects p
  JOIN team_members tm ON tm.team_id = p.project_id
  WHERE p.mentor_employee_id IS NOT NULL
  GROUP BY p.project_id, p.mentor_employee_id
  LIMIT 3
`);
console.log('\n=== Sample projects with mentor+members ===');
proj.rows.forEach(r => console.log(`  project_id=${r.project_id}  mentor=${r.mentor_employee_id}  members=${r.member_count}`));

// Any existing project_weeks
const weeks = await client.query(`
  SELECT pw.week_id, pw.project_id, pw.week_number, pw.status, pw.deadline_at
  FROM project_weeks pw
  ORDER BY pw.week_id DESC
  LIMIT 5
`);
console.log('\n=== Existing project_weeks (latest 5) ===');
if (weeks.rows.length === 0) console.log('  (none)');
weeks.rows.forEach(r => console.log(`  week_id=${r.week_id}  project=${r.project_id}  wk=${r.week_number}  status=${r.status}  deadline=${r.deadline_at}`));

// Check tracker_notification_dispatch_log exists
const logCheck = await client.query(`
  SELECT COUNT(*) FROM tracker_notification_dispatch_log
`);
console.log('\n=== tracker_notification_dispatch_log row count ===', logCheck.rows[0].count);

client.release();
await pool.end();
