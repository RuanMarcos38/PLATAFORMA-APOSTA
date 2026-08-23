import { Router } from 'express';
import { pool } from '../config/db.js';
import { providerStatus } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const r=Router();
r.get('/overview',requireAuth,requireRole('admin','support'),async(_req,res)=>{const [users,deposits,withdrawals,bets]=await Promise.all([pool.query(`SELECT count(*)::int count FROM users`),pool.query(`SELECT coalesce(sum(amount),0)::numeric total FROM deposits WHERE status='approved'`),pool.query(`SELECT count(*)::int count,coalesce(sum(amount),0)::numeric total FROM withdrawals WHERE status='pending_review'`),pool.query(`SELECT count(*)::int count,coalesce(sum(stake),0)::numeric volume FROM sports_bets`)]);res.json({providers:providerStatus(),users:users.rows[0],deposits:deposits.rows[0],withdrawals:withdrawals.rows[0],bets:bets.rows[0]});});
export default r;
