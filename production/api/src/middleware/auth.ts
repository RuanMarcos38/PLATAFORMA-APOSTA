import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export type UserRole='user'|'verified'|'support'|'moderator'|'admin';
export interface AuthRequest extends Request { user?: { id:string; role:UserRole; sessionId:string } }
export function requireAuth(req:AuthRequest,res:Response,next:NextFunction){ const h=req.headers.authorization; if(!h?.startsWith('Bearer ')) return res.status(401).json({error:'authentication_required'}); try { const p=jwt.verify(h.slice(7),env.JWT_ACCESS_SECRET) as any; req.user={id:p.sub,role:p.role,sessionId:p.sid}; next(); } catch { return res.status(401).json({error:'invalid_or_expired_token'}); } }
export function requireRole(...roles:UserRole[]){ return (req:AuthRequest,res:Response,next:NextFunction)=> req.user&&roles.includes(req.user.role)?next():res.status(403).json({error:'forbidden'}); }
