import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Executes a SQL query.
 * @param text The SQL query string.
 * @param params Optional array of parameters for the query.
 * @returns A Promise that resolves with the query result.
 */
export const query = <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export default pool; // Exporting the pool itself can still be useful for transactions or direct control.
