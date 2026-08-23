import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';

async function jsonFetch(url:string, init?:RequestInit){
  const r=await fetch(url,init); const text=await r.text(); let body:any={}; try{body=text?JSON.parse(text):{};}catch{body={raw:text};}
  if(!r.ok) throw new HttpError(502,`Falha no provedor externo (${r.status})`,'provider_error'); return body;
}

export const paymentsProvider={
  async createPix(input:{amount:number;externalReference:string;email:string}){
    if(env.PAYMENT_PROVIDER==='mercadopago'){
      if(!env.MERCADOPAGO_ACCESS_TOKEN) throw new HttpError(503,'Credencial do Mercado Pago pendente.','provider_not_configured');
      return jsonFetch('https://api.mercadopago.com/v1/payments',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,'x-idempotency-key':input.externalReference},body:JSON.stringify({transaction_amount:input.amount,description:`Depósito ${env.BRAND_NAME}`,payment_method_id:'pix',payer:{email:input.email},external_reference:input.externalReference,notification_url:env.PAYMENT_WEBHOOK_URL})});
    }
    if(env.PAYMENT_PROVIDER==='custom'){
      if(!env.PAYMENT_CUSTOM_BASE_URL||!env.PAYMENT_CUSTOM_API_KEY) throw new HttpError(503,'Credencial do gateway pendente.','provider_not_configured');
      return jsonFetch(`${env.PAYMENT_CUSTOM_BASE_URL}/pix/deposits`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.PAYMENT_CUSTOM_API_KEY}`},body:JSON.stringify(input)});
    }
    throw new HttpError(503,'Gateway de pagamento ainda não configurado.','provider_not_configured');
  },
  async getPayment(id:string){
    if(env.PAYMENT_PROVIDER==='mercadopago'){
      if(!env.MERCADOPAGO_ACCESS_TOKEN) throw new HttpError(503,'Credencial do Mercado Pago pendente.','provider_not_configured');
      return jsonFetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`}});
    }
    if(env.PAYMENT_PROVIDER==='custom'){if(!env.PAYMENT_CUSTOM_BASE_URL||!env.PAYMENT_CUSTOM_API_KEY)throw new HttpError(503,'Credencial do gateway pendente.','provider_not_configured');return jsonFetch(`${env.PAYMENT_CUSTOM_BASE_URL}/payments/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${env.PAYMENT_CUSTOM_API_KEY}`}});}
    throw new HttpError(503,'Consulta do gateway ainda não configurada.','provider_not_configured');
  }
};

export const kycProvider={
  async createCase(input:{userId:string;fullName:string;birthDate:string;callbackUrl:string}){
    if(!env.KYC_PROVIDER_BASE_URL||!env.KYC_PROVIDER_API_KEY) throw new HttpError(503,'Credencial KYC pendente.','provider_not_configured');
    return jsonFetch(`${env.KYC_PROVIDER_BASE_URL}/cases`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.KYC_PROVIDER_API_KEY}`},body:JSON.stringify(input)});
  }
};

export const sportsProvider={
  async listOdds(sportKey='soccer_brazil_campeonato'){
    if(!env.SPORTS_DATA_API_KEY) throw new HttpError(503,'Credencial do feed esportivo pendente.','provider_not_configured');
    if(env.SPORTS_PROVIDER==='custom'){return jsonFetch(`${env.SPORTS_DATA_BASE_URL}/odds?sport=${encodeURIComponent(sportKey)}&regions=${encodeURIComponent(env.SPORTS_DEFAULT_REGIONS)}&markets=${encodeURIComponent(env.SPORTS_DEFAULT_MARKETS)}`,{headers:{authorization:`Bearer ${env.SPORTS_DATA_API_KEY}`}});}
    const u=new URL(`${env.SPORTS_DATA_BASE_URL}/sports/${sportKey}/odds`);u.searchParams.set('apiKey',env.SPORTS_DATA_API_KEY);u.searchParams.set('regions',env.SPORTS_DEFAULT_REGIONS);u.searchParams.set('markets',env.SPORTS_DEFAULT_MARKETS);u.searchParams.set('oddsFormat','decimal');
    return jsonFetch(u.toString());
  },
  async listScores(sportKey='soccer_brazil_campeonato'){
    if(!env.SPORTS_DATA_API_KEY) throw new HttpError(503,'Credencial do feed esportivo pendente.','provider_not_configured');
    if(env.SPORTS_PROVIDER==='custom'){return jsonFetch(`${env.SPORTS_DATA_BASE_URL}/scores?sport=${encodeURIComponent(sportKey)}`,{headers:{authorization:`Bearer ${env.SPORTS_DATA_API_KEY}`}});}
    const u=new URL(`${env.SPORTS_DATA_BASE_URL}/sports/${sportKey}/scores`);u.searchParams.set('apiKey',env.SPORTS_DATA_API_KEY);u.searchParams.set('daysFrom','3');return jsonFetch(u.toString());
  }
};

export const casinoProvider={
  async listGames(){
    if(!env.CASINO_PROVIDER_BASE_URL||!env.CASINO_PROVIDER_API_KEY) throw new HttpError(503,'Credencial do agregador de cassino pendente.','provider_not_configured');
    return jsonFetch(`${env.CASINO_PROVIDER_BASE_URL}/games`,{headers:{authorization:`Bearer ${env.CASINO_PROVIDER_API_KEY}`}});
  },
  async launch(input:{userId:string;gameId:string;returnUrl:string}){
    if(!env.CASINO_PROVIDER_BASE_URL||!env.CASINO_PROVIDER_API_KEY) throw new HttpError(503,'Credencial do agregador de cassino pendente.','provider_not_configured');
    return jsonFetch(`${env.CASINO_PROVIDER_BASE_URL}/sessions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.CASINO_PROVIDER_API_KEY}`},body:JSON.stringify(input)});
  }
};
