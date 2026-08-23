import 'dotenv/config';
import { z } from 'zod';

const bool = z.string().default('false').transform(v => v === 'true');
const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('production'),
  API_PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().min(1), PUBLIC_DOMAIN: z.string().url().optional(), BRAND_NAME: z.string().default('PLATAFORMA APOSTA'),
  LEGAL_ENTITY_NAME: z.string().optional(), LEGAL_CNPJ: z.string().optional(), LICENSE_REFERENCE: z.string().optional(),
  DATABASE_URL: z.string().min(10), REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32), JWT_REFRESH_SECRET: z.string().min(32), JWT_ACCESS_EXPIRES_IN: z.string().default('15m'), JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  PAYMENT_PROVIDER: z.enum(['mercadopago','none']).default('none'), MERCADOPAGO_ACCESS_TOKEN: z.string().optional(), PAYMENT_WEBHOOK_URL: z.string().url().optional(), MIN_DEPOSIT_BRL: z.coerce.number().default(20), MIN_WITHDRAWAL_BRL: z.coerce.number().default(50),
  KYC_PROVIDER: z.enum(['external','none']).default('none'), KYC_PROVIDER_BASE_URL: z.string().url().optional(), KYC_PROVIDER_API_KEY: z.string().optional(), KYC_CALLBACK_SECRET: z.string().optional(),
  SPORTS_PROVIDER: z.enum(['theoddsapi','none']).default('none'), SPORTS_DATA_API_KEY: z.string().optional(), SPORTS_DATA_BASE_URL: z.string().url().default('https://api.the-odds-api.com/v4'), SPORTS_DEFAULT_REGIONS: z.string().default('eu'), SPORTS_DEFAULT_MARKETS: z.string().default('h2h,totals'),
  INTERNAL_JOB_SECRET: z.string().min(16), ENABLE_REAL_MONEY: bool, ENABLE_EVENT_MARKETS: bool, ENABLE_P2P_REAL_MONEY: bool
});
export const env = schema.parse(process.env);
export const providerStatus = () => ({
  realMoney: env.ENABLE_REAL_MONEY,
  payments: env.PAYMENT_PROVIDER === 'mercadopago' && Boolean(env.MERCADOPAGO_ACCESS_TOKEN),
  kyc: env.KYC_PROVIDER === 'external' && Boolean(env.KYC_PROVIDER_BASE_URL && env.KYC_PROVIDER_API_KEY),
  sports: env.SPORTS_PROVIDER === 'theoddsapi' && Boolean(env.SPORTS_DATA_API_KEY),
  eventMarkets: env.ENABLE_EVENT_MARKETS,
  p2pRealMoney: env.ENABLE_P2P_REAL_MONEY
});
