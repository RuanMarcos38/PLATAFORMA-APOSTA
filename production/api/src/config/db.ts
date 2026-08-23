import pg from 'pg';
import { env } from './env.js';
const { Pool } = pg;
export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 20, idleTimeoutMillis: 30_000, statement_timeout: 15_000 });
pool.on('error', err => console.error('postgres_pool_error', { message: err.message }));
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> { const c=await pool.connect(); try { await c.query('BEGIN'); const out=await fn(c); await c.query('COMMIT'); return out; } catch(e){ await c.query('ROLLBACK'); throw e; } finally { c.release(); } }
