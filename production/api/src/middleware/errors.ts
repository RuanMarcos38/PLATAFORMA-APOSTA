import type { NextFunction, Request, Response } from 'express';
export class HttpError extends Error { constructor(public status: number, message: string, public code='error'){ super(message); } }
export const asyncRoute = <T extends (...args:any[])=>Promise<any>>(fn:T) => (req:Request,res:Response,next:NextFunction) => { void fn(req,res,next).catch(next); };
export function notFound(_req:Request,res:Response){ res.status(404).json({error:'not_found'}); }
export function errorHandler(err:unknown,_req:Request,res:Response,_next:NextFunction){
  const e=err as any; const status=e?.status && Number.isInteger(e.status) ? e.status : 500;
  if(status>=500) console.error('request_error',{message:e?.message,stack:e?.stack});
  res.status(status).json({error:e?.code||'server_error',message:status>=500?'Erro interno.':e?.message});
}
