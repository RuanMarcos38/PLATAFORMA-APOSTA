import 'dotenv/config';
import { z } from 'zod';

const bool=z.string().default('false').transform((v:string)=>v==='true');
const emptyToUndefined=(v:unknown)=>v===''?undefined:v;
const optionalString=z.preprocess(emptyToUndefined,z.string().optional());
const optionalUrl=z.preprocess(emptyToUndefined,z.string().url().optional());

const schema=z.object({
  NODE_ENV:z.enum(['development','test','production']).default('production'),
  API_PORT:z.coerce.number().default(4000),
  FRONTEND_URL:z.string().url(),
  PUBLIC_DOMAIN:optionalUrl,
  BRAND_NAME:z.string().default('PLATAFORMA APOSTA'),
  LEGAL_ENTITY_NAME:optionalString,
  LEGAL_CNPJ:optionalString,
  LICENSE_REFERENCE:optionalString,
  DATABASE_URL:z.string().min(10),
  REDIS_URL:optionalString,
  JWT_ACCESS_SECRET:z.string().min(32),
  JWT_REFRESH_SECRET:z.string().min(32),
  JWT_ACCESS_EXPIRES_IN:z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS:z.coerce.number().default(30),
  CPF_HASH_PEPPER:z.string().min(16),
  INTERNAL_JOB_SECRET:z.string().min(16),
  ENABLE_REAL_MONEY:bool,
  REQUIRE_FEDERAL_LICENSE:bool,
  PAYMENT_PROVIDER:z.enum(['mercadopago','custom','none']).default('none'),
  MERCADOPAGO_MODE:z.enum(['test','production']).default('test'),
  MERCADOPAGO_ACCESS_TOKEN:optionalString,
  MERCADOPAGO_PUBLIC_KEY:optionalString,
  MERCADOPAGO_WEBHOOK_SECRET:optionalString,
  PAYMENT_CUSTOM_BASE_URL:optionalUrl,
  PAYMENT_CUSTOM_API_KEY:optionalString,
  PAYMENT_CUSTOM_WEBHOOK_SECRET:optionalString,
  PAYMENT_WEBHOOK_URL:optionalUrl,
  MIN_DEPOSIT_BRL:z.coerce.number().default(20),
  MIN_WITHDRAWAL_BRL:z.coerce.number().default(50),
  KYC_PROVIDER:z.enum(['external','none']).default('none'),
  KYC_PROVIDER_BASE_URL:optionalUrl,
  KYC_PROVIDER_API_KEY:optionalString,
  KYC_CALLBACK_SECRET:optionalString,
  SPORTS_PROVIDER:z.enum(['theoddsapi','custom','none']).default('none'),
  SPORTS_DATA_API_KEY:optionalString,
  SPORTS_DATA_BASE_URL:z.string().url().default('https://api.the-odds-api.com/v4'),
  SPORTS_DEFAULT_REGIONS:z.string().default('eu'),
  SPORTS_DEFAULT_MARKETS:z.string().default('h2h,totals'),
  CASINO_PROVIDER:z.enum(['aggregator','none']).default('none'),
  CASINO_PROVIDER_BASE_URL:optionalUrl,
  CASINO_PROVIDER_API_KEY:optionalString,
  CASINO_CALLBACK_SECRET:optionalString,
  ENABLE_EVENT_MARKETS:bool,
  ENABLE_P2P_REAL_MONEY:bool
});

export const env=schema.parse(process.env);

export const softwareCapabilities=()=>({
  kycMandatory:true,
  ledgerTransactional:true,
  pixBySignedWebhook:true,
  checkoutPro:true,
  responsibleGaming:true,
  idempotentFinancialEvents:true,
  serverSideOddsValidation:true,
  testPaymentsNeverCreditRealBalance:true,
  realMoneyFailClosed:true
});

export const providerStatus=()=>{
  const mercadoPagoCredentials=Boolean(env.MERCADOPAGO_ACCESS_TOKEN&&env.MERCADOPAGO_PUBLIC_KEY&&env.MERCADOPAGO_WEBHOOK_SECRET);
  const customCredentials=Boolean(env.PAYMENT_CUSTOM_BASE_URL&&env.PAYMENT_CUSTOM_API_KEY&&env.PAYMENT_CUSTOM_WEBHOOK_SECRET);
  const paymentsConfigured=env.PAYMENT_PROVIDER==='mercadopago'?mercadoPagoCredentials:env.PAYMENT_PROVIDER==='custom'?customCredentials:false;
  const paymentsProductionReady=env.PAYMENT_PROVIDER==='mercadopago'?mercadoPagoCredentials&&env.MERCADOPAGO_MODE==='production':env.PAYMENT_PROVIDER==='custom'?customCredentials:false;
  return {
    realMoneyRequested:env.ENABLE_REAL_MONEY,
    legalIdentityConfigured:Boolean(env.LEGAL_ENTITY_NAME&&env.LEGAL_CNPJ),
    domainConfigured:Boolean(env.PUBLIC_DOMAIN),
    licenseConfigured:Boolean(env.LICENSE_REFERENCE&&env.PUBLIC_DOMAIN?.endsWith('.bet.br')),
    paymentsConfigured,
    paymentsProductionReady,
    mercadoPagoMode:env.PAYMENT_PROVIDER==='mercadopago'?env.MERCADOPAGO_MODE:null,
    paymentWebhookOverrideConfigured:Boolean(env.PAYMENT_WEBHOOK_URL),
    kycConfigured:env.KYC_PROVIDER==='external'&&Boolean(env.KYC_PROVIDER_BASE_URL&&env.KYC_PROVIDER_API_KEY&&env.KYC_CALLBACK_SECRET),
    sportsConfigured:env.SPORTS_PROVIDER==='theoddsapi'?Boolean(env.SPORTS_DATA_API_KEY):env.SPORTS_PROVIDER==='custom'?Boolean(env.SPORTS_DATA_BASE_URL&&env.SPORTS_DATA_API_KEY):false,
    casinoConfigured:env.CASINO_PROVIDER==='aggregator'&&Boolean(env.CASINO_PROVIDER_BASE_URL&&env.CASINO_PROVIDER_API_KEY&&env.CASINO_CALLBACK_SECRET),
    eventMarketsEnabled:env.ENABLE_EVENT_MARKETS,
    p2pRealMoneyEnabled:env.ENABLE_P2P_REAL_MONEY
  };
};

export function realMoneyGate(){
  const s=providerStatus();
  const licenseOk=env.REQUIRE_FEDERAL_LICENSE?s.licenseConfigured:true;
  return {
    enabled:env.ENABLE_REAL_MONEY&&s.legalIdentityConfigured&&licenseOk&&s.paymentsProductionReady&&s.kycConfigured&&s.sportsConfigured,
    ...s,
    licenseRequired:env.REQUIRE_FEDERAL_LICENSE
  };
}
