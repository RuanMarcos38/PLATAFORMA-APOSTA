import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const hashCpf = (cpf: string) => sha256(`${env.CPF_HASH_PEPPER}:${cpf.replace(/\D/g,'')}`);
export const randomToken = () => crypto.randomBytes(48).toString('base64url');
export const hashToken = (value: string) => sha256(value);
export const timingSafeHexEqual = (a: string, b: string) => {
  try { const aa=Buffer.from(a,'hex'); const bb=Buffer.from(b,'hex'); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); } catch { return false; }
};
export function verifyMercadoPagoSignature(xSignature: string | undefined, xRequestId: string | undefined, dataId: string | undefined) {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET || !xSignature) return false;
  const fields = Object.fromEntries(xSignature.split(',').map(part => part.trim().split('=')));
  const ts = fields.ts; const v1 = fields.v1;
  if (!ts || !v1) return false;
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(';')};`;
  const digest = crypto.createHmac('sha256', env.MERCADOPAGO_WEBHOOK_SECRET).update(manifest).digest('hex');
  return timingSafeHexEqual(digest, v1);
}
