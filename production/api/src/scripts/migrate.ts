import { readFile } from 'node:fs/promises';
import { pool } from '../config/db.js';
const schemaUrl=new URL('../../db/schema.sql',import.meta.url);
try{const sql=await readFile(schemaUrl,'utf8');await pool.query(sql);console.log('database_schema_ready');}catch(error){console.error('database_schema_migration_failed',{message:error instanceof Error?error.message:String(error)});process.exitCode=1}finally{await pool.end()}
