import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export type AuthUser={sub:string;role:string;email:string;sessionStart:number;};
declare global { namespace Express { interface Request { user?:AuthUser; } } }
export function requireAuth(req:Request,res:Response,next:NextFunction){const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):'';if(!token)return res.status(401).json({error:'unauthorized'});try{const decoded=jwt.verify(token,env.JWT_ACCESS_SECRET) as AuthUser;if(!decoded.sessionStart||!Number.isFinite(Number(decoded.sessionStart)))return res.status(401).json({error:'session_refresh_required'});req.user=decoded;next();}catch{return res.status(401).json({error:'invalid_token'});}}
export function requireRole(...roles:string[]){return(req:Request,res:Response,next:NextFunction)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({error:'forbidden'});next();};}
