import { Router, type Request, type Response } from 'express';
import { pingDb } from '../config/db.js';
import { providerStatus, realMoneyGate, softwareCapabilities } from '../config/env.js';
const r=Router();
r.get('/health',(_q:Request,res:Response)=>res.json({ok:true}));
r.get('/capabilities',(_q:Request,res:Response)=>res.json({ok:true,software:softwareCapabilities()}));
r.get('/readiness',async(_q:Request,res:Response)=>{try{await pingDb();const providers=providerStatus();const activation=realMoneyGate();res.json({ok:true,database:true,software:softwareCapabilities(),providers,activation,preDomainReady:true,domainPending:!providers.domainConfigured});}catch{res.status(503).json({ok:false,database:false,software:softwareCapabilities(),providers:providerStatus(),activation:realMoneyGate()});}});
export default r;
