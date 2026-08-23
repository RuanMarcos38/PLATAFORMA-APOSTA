import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export type AuthUser={sub:string;role:string;email:string;};
declare global { namespace Express { interface Request { user?:AuthUser; } } }
export function requireAuth(req:Request,res:Response,next:NextFunction){
  const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):'';
  if(!token) return res.status(401).json({error:'unauthorized'});
  try{ req.user=jwt.verify(token,env.JWT_ACCESS_SECRET) as AuthUser; next(); }catch{return res.status(401).json({error:'invalid_token'});}
}
export function requireRole(...roles:string[]){return (req:Request,res:Response,next:NextFunction)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({error:'forbidden'});next();};}
