import { Router, type Request, type Response } from 'express';
import { pingDb } from '../config/db.js';
import { providerStatus, realMoneyGate } from '../config/env.js';
const r=Router();
r.get('/health',(_q:Request,res:Response)=>res.json({ok:true}));
r.get('/readiness',async(_q:Request,res:Response)=>{try{await pingDb();res.json({ok:true,database:true,providers:providerStatus(),realMoney:realMoneyGate()});}catch{res.status(503).json({ok:false,database:false});}});
export default r;
