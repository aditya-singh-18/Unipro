import pool from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility to inspect database schema and write to file
 * This helps ensure query column consistency
 */
export const inspectDatabaseSchema = async () => {
  try {
    const tables = ['users', 'student_profiles', 'mentor_profiles', 'admin_profiles'];
    const schemaInfo = {};

    for (const table of tables) {
      const query = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const result = await pool.query(query, [table]);
      schemaInfo[table] = result.rows;
    }

    // Write schema info to file for reference
    const schemaPath = path.join(__dirname, '..', '..', 'schema_info.json');
    await fs.writeFile(schemaPath, JSON.stringify(schemaInfo, null, 2));
    
    console.log('✅ Database schema written to:', schemaPath);
    return schemaInfo;
  } catch (error) {
    console.error('❌ Error inspecting database schema:', error);
    throw error;
  }
};

/**
 * Get column names for a specific table
 */
export const getTableColumns = async (tableName) => {
  try {
    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error) {
    console.error(`❌ Error getting columns for ${tableName}:`, error);
    throw error;
  }
};

/**
 * Log query results to file for debugging
 */
export const logQueryResult = async (queryName, data) => {
  try {
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    
    // Create logs directory if it doesn't exist
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
    }
    
    const logPath = path.join(logsDir, `${queryName}_${Date.now()}.json`);
    await fs.writeFile(logPath, JSON.stringify(data, null, 2));
    
    console.log(`📝 Query result logged to: ${logPath}`);
  } catch (error) {
    console.error('❌ Error logging query result:', error);
  }
};

// Only run schema inspection on explicit call, not on import
// To manually check schema, run: node checkSchema.js
