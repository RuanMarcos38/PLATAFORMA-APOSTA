import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../config/db.js';
import { env, realMoneyGate } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute, HttpError } from '../middleware/errors.js';
import { paymentsProvider } from '../services/providers.js';
import { credit } from './wallet.js';
import { verifyMercadoPagoSignature } from '../utils/security.js';

const r=Router();
const amountSchema=z.object({amount:z.coerce.number().positive()});

async function requireKyc(userId:string){
  const u=(await pool.query('select kyc_status,status from users where id=$1',[userId])).rows[0];
  if(!u||u.kyc_status!=='approved'||u.status!=='active') throw new HttpError(403,'KYC aprovado e conta ativa são obrigatórios.','kyc_required');
}

async function depositLimits(userId:string,amount:number){
  const lim=(await pool.query('select daily_deposit_limit,weekly_deposit_limit from responsible_limits where user_id=$1',[userId])).rows[0];
  const sums=(await pool.query("select coalesce(sum(case when approved_at>=date_trunc('day',now()) then amount else 0 end),0) day,coalesce(sum(case when approved_at>=date_trunc('week',now()) then amount else 0 end),0) week from deposits where user_id=$1 and status='approved'",[userId])).rows[0];
  if(Number(sums.day)+amount>Number(lim.daily_deposit_limit)||Number(sums.week)+amount>Number(lim.weekly_deposit_limit)) throw new HttpError(400,'Limite de depósito excedido.','deposit_limit');
}

r.post('/checkout-pro/deposit',requireAuth,asyncRoute(async(req,res)=>{
  const {amount}=amountSchema.parse(req.body);
  if(amount<env.MIN_DEPOSIT_BRL) throw new HttpError(400,`Depósito mínimo: R$ ${env.MIN_DEPOSIT_BRL}.`);
  if(env.PAYMENT_PROVIDER!=='mercadopago') throw new HttpError(503,'Mercado Pago não está selecionado como gateway.','provider_not_configured');
  if(!env.MERCADOPAGO_ACCESS_TOKEN||!env.MERCADOPAGO_PUBLIC_KEY||!env.MERCADOPAGO_WEBHOOK_SECRET) throw new HttpError(503,'Credenciais do Checkout Pro ainda não estão completas.','provider_not_configured');

  const testMode=env.MERCADOPAGO_MODE==='test';
  if(!testMode){
    if(!realMoneyGate().enabled) throw new HttpError(503,'Ambiente real ainda aguarda licença, domínio e provedores obrigatórios.','production_not_ready');
    await requireKyc(req.user!.sub);
    await depositLimits(req.user!.sub,amount);
  }

  const user=(await pool.query('select email,full_name from users where id=$1',[req.user!.sub])).rows[0];
  if(!user) throw new HttpError(404,'Usuário não encontrado.');
  const provider=`mercadopago_checkout_pro_${env.MERCADOPAGO_MODE}`;
  const d=(await pool.query("insert into deposits(user_id,provider,amount,status) values($1,$2,$3,'pending') returning id",[req.user!.sub,provider,amount])).rows[0];
  const p=await paymentsProvider.createCheckoutPreference({amount,externalReference:d.id,email:user.email,fullName:user.full_name});
  const preferenceId=String(p.id||'');
  const checkoutUrl=testMode?String(p.sandbox_init_point||p.init_point||''):String(p.init_point||'');
  if(!preferenceId||!checkoutUrl) throw new HttpError(502,'Mercado Pago não retornou a preferência/URL de checkout.','provider_error');
  await pool.query('update deposits set provider_payment_id=$1,provider_payload=$2 where id=$3',[preferenceId,p,d.id]);
  res.status(201).json({depositId:d.id,status:'pending',mode:env.MERCADOPAGO_MODE,preferenceId,publicKey:env.MERCADOPAGO_PUBLIC_KEY,checkoutUrl});
}));

r.post('/pix/deposit',requireAuth,asyncRoute(async(req,res)=>{
  const {amount}=amountSchema.parse(req.body);
  if(amount<env.MIN_DEPOSIT_BRL) throw new HttpError(400,`Depósito mínimo: R$ ${env.MIN_DEPOSIT_BRL}.`);
  if(env.MERCADOPAGO_MODE!=='production'||!realMoneyGate().enabled) throw new HttpError(503,'PIX direto fica disponível somente no ambiente real autorizado.','production_not_ready');
  await requireKyc(req.user!.sub);
  await depositLimits(req.user!.sub,amount);
  const email=(await pool.query('select email from users where id=$1',[req.user!.sub])).rows[0].email;
  const d=(await pool.query("insert into deposits(user_id,provider,amount,status) values($1,$2,$3,'pending') returning id",[req.user!.sub,env.PAYMENT_PROVIDER,amount])).rows[0];
  const p=await paymentsProvider.createPix({amount,externalReference:d.id,email});
  await pool.query('update deposits set provider_payment_id=$1,provider_payload=$2 where id=$3',[String(p.id||p.payment_id||''),p,d.id]);
  res.status(201).json({depositId:d.id,status:'pending',providerPaymentId:p.id||p.payment_id||null,qrCode:p.point_of_interaction?.transaction_data?.qr_code||p.qr_code||null,qrCodeBase64:p.point_of_interaction?.transaction_data?.qr_code_base64||null,ticketUrl:p.point_of_interaction?.transaction_data?.ticket_url||null});
}));

r.post('/webhook/mercadopago',asyncRoute(async(req,res)=>{
  const dataId=String(req.query['data.id']||req.body?.data?.id||'');
  if(!verifyMercadoPagoSignature(String(req.headers['x-signature']||''),String(req.headers['x-request-id']||''),dataId)) throw new HttpError(401,'Assinatura de webhook inválida.');
  const eventKey=`mp:${String(req.body?.id||req.headers['x-request-id']||dataId)}`;
  const accepted=await pool.query('insert into webhook_events(provider,event_key,payload) values($1,$2,$3) on conflict(event_key) do nothing returning id',['mercadopago',eventKey,req.body]);
  if(!accepted.rowCount) return res.status(204).end();
  if(!dataId) return res.status(204).end();

  const p=await paymentsProvider.getPayment(dataId);
  const external=String(p.external_reference||'');
  const d=(await pool.query('select id,user_id,amount,status from deposits where id=$1 or provider_payment_id=$2',[external,dataId])).rows[0];
  if(!d){await pool.query('update webhook_events set processed_at=now() where event_key=$1',[eventKey]);return res.status(204).end();}

  const paymentStatus=String(p.status||'pending');
  if(paymentStatus!=='approved'){
    const safeStatus=['pending','rejected','cancelled','refunded','charged_back'].includes(paymentStatus)?paymentStatus:'pending';
    await pool.query('update deposits set status=$1,provider_payload=$2 where id=$3 and status<>\'approved\'',[safeStatus,p,d.id]);
    await pool.query('update webhook_events set processed_at=now() where event_key=$1',[eventKey]);
    return res.status(204).end();
  }

  if(Math.abs(Number(d.amount)-Number(p.transaction_amount))>0.001) throw new HttpError(409,'Valor do pagamento não confere.','payment_mismatch');
  if(p.currency_id&&String(p.currency_id)!=='BRL') throw new HttpError(409,'Moeda do pagamento não confere.','payment_currency_mismatch');

  await tx(async c=>{
    const locked=(await c.query('select * from deposits where id=$1 for update',[d.id])).rows[0];
    if(['approved','approved_test'].includes(locked.status)) return;

    const isTest=env.MERCADOPAGO_MODE==='test'||p.live_mode===false;
    if(isTest){
      await c.query("update deposits set status='approved_test',approved_at=now(),provider_payload=$1 where id=$2",[p,locked.id]);
      return;
    }

    if(!realMoneyGate().enabled){
      await c.query("update deposits set status='approved_blocked',provider_payload=$1 where id=$2",[p,locked.id]);
      return;
    }

    await credit(c,locked.user_id,Number(locked.amount),'deposit',`deposit:${locked.id}`,`deposit:${locked.id}`);
    await c.query("update deposits set status='approved',approved_at=now(),provider_payload=$1 where id=$2",[p,locked.id]);
  });
  await pool.query('update webhook_events set processed_at=now() where event_key=$1',[eventKey]);
  res.status(204).end();
}));

r.post('/webhook/custom',asyncRoute(async(req,res)=>{
  if(!env.PAYMENT_CUSTOM_WEBHOOK_SECRET) throw new HttpError(503,'Webhook custom não configurado.');
  const signature=String(req.headers['x-payment-signature']||'');
  const raw=JSON.stringify(req.body||{});
  const {createHmac,timingSafeEqual}=await import('node:crypto');
  const expected=createHmac('sha256',env.PAYMENT_CUSTOM_WEBHOOK_SECRET).update(raw).digest('hex');
  if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) throw new HttpError(401,'Assinatura inválida.');
  const eventId=String(req.body?.event_id||req.body?.id||'');
  const paymentId=String(req.body?.payment_id||req.body?.data?.id||'');
  if(!eventId||!paymentId) throw new HttpError(400,'Webhook inválido.');
  const accepted=await pool.query('insert into webhook_events(provider,event_key,payload) values($1,$2,$3) on conflict(event_key) do nothing returning id',['custom',`custom:${eventId}`,req.body]);
  if(!accepted.rowCount) return res.status(204).end();
  const p=await paymentsProvider.getPayment(paymentId);
  if(String(p.status)!=='approved') return res.status(204).end();
  const external=String(p.external_reference||p.reference||'');
  const d=(await pool.query('select id,user_id,amount,status from deposits where id=$1 or provider_payment_id=$2',[external,paymentId])).rows[0];
  if(!d) return res.status(204).end();
  if(Math.abs(Number(d.amount)-Number(p.amount||p.transaction_amount))>0.001) throw new HttpError(409,'Valor do pagamento não confere.');
  await tx(async c=>{
    const locked=(await c.query('select * from deposits where id=$1 for update',[d.id])).rows[0];
    if(locked.status==='approved') return;
    await credit(c,locked.user_id,Number(locked.amount),'deposit',`deposit:${locked.id}`,`deposit:${locked.id}`);
    await c.query("update deposits set status='approved',approved_at=now(),provider_payload=$1 where id=$2",[p,locked.id]);
  });
  res.status(204).end();
}));

r.post('/withdrawals',requireAuth,asyncRoute(async(req,res)=>{
  const {amount}=amountSchema.parse(req.body);
  if(amount<env.MIN_WITHDRAWAL_BRL) throw new HttpError(400,`Saque mínimo: R$ ${env.MIN_WITHDRAWAL_BRL}.`);
  await requireKyc(req.user!.sub);
  const result=await tx(async c=>{
    const w=(await c.query('select * from wallets where user_id=$1 for update',[req.user!.sub])).rows[0];
    if(Number(w.balance)<amount) throw new HttpError(400,'Saldo insuficiente.','insufficient_balance');
    const next=Number(w.balance)-amount;
    const wd=(await c.query("insert into withdrawals(user_id,amount,status) values($1,$2,'pending_review') returning id,status,amount,created_at",[req.user!.sub,amount])).rows[0];
    await c.query('update wallets set balance=$1,updated_at=now() where id=$2',[next,w.id]);
    await c.query('insert into ledger(wallet_id,kind,amount,balance_after,reference,idempotency_key,status) values($1,$2,$3,$4,$5,$6,$7)',[w.id,'withdrawal_hold',-amount,next,`withdrawal:${wd.id}`,`withdrawal:${wd.id}`,'completed']);
    return wd;
  });
  res.status(201).json(result);
}));

r.get('/deposits',requireAuth,asyncRoute(async(req,res)=>{
  const q=await pool.query('select id,amount,status,provider,provider_payment_id,approved_at,created_at from deposits where user_id=$1 order by created_at desc limit 100',[req.user!.sub]);
  res.json(q.rows);
}));

r.get('/withdrawals',requireAuth,asyncRoute(async(req,res)=>{
  const q=await pool.query('select id,amount,status,provider_payout_id,created_at,updated_at from withdrawals where user_id=$1 order by created_at desc limit 100',[req.user!.sub]);
  res.json(q.rows);
}));

export default r;
