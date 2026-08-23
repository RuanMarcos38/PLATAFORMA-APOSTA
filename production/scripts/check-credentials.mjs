const mode=process.argv[2]||'pre-domain';
if(!['pre-domain','go-live'].includes(mode)){console.error('Uso: node scripts/check-credentials.mjs [pre-domain|go-live]');process.exit(2)}
const common=['FRONTEND_URL','DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','CPF_HASH_PEPPER','INTERNAL_JOB_SECRET'];
const kyc=process.env.KYC_PROVIDER==='external'?['KYC_PROVIDER_BASE_URL','KYC_PROVIDER_API_KEY','KYC_CALLBACK_SECRET']:[];
const sports=process.env.SPORTS_PROVIDER&&process.env.SPORTS_PROVIDER!=='none'?['SPORTS_DATA_API_KEY']:[];
const casino=process.env.CASINO_PROVIDER==='aggregator'?['CASINO_PROVIDER_BASE_URL','CASINO_PROVIDER_API_KEY','CASINO_CALLBACK_SECRET']:[];
let payment=[];
if(process.env.PAYMENT_PROVIDER==='mercadopago')payment=['MERCADOPAGO_ACCESS_TOKEN','MERCADOPAGO_PUBLIC_KEY','MERCADOPAGO_WEBHOOK_SECRET'];
else if(process.env.PAYMENT_PROVIDER==='custom')payment=['PAYMENT_CUSTOM_BASE_URL','PAYMENT_CUSTOM_API_KEY','PAYMENT_CUSTOM_WEBHOOK_SECRET'];
else payment=['PAYMENT_PROVIDER'];
const goLive=mode==='go-live'?['LEGAL_ENTITY_NAME','LEGAL_CNPJ','LICENSE_REFERENCE','PUBLIC_DOMAIN']:[];
const missing=[...new Set([...common,...payment,...kyc,...sports,...casino,...goLive])].filter(k=>!String(process.env[k]||'').trim());
const unsafe=[];
for(const k of ['JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','CPF_HASH_PEPPER','INTERNAL_JOB_SECRET','DATABASE_URL']){const v=String(process.env[k]||'');if(v.includes('CHANGE_ME')||v.includes('postgres:postgres'))unsafe.push(k)}
if(mode==='go-live'){
  if(process.env.PAYMENT_PROVIDER==='mercadopago'&&process.env.MERCADOPAGO_MODE!=='production')unsafe.push('MERCADOPAGO_MODE');
  if(process.env.REQUIRE_FEDERAL_LICENSE==='true'&&!String(process.env.PUBLIC_DOMAIN||'').endsWith('.bet.br'))unsafe.push('PUBLIC_DOMAIN');
}
if(missing.length||unsafe.length){if(missing.length)console.error('Configurações pendentes:\n- '+missing.join('\n- '));if(unsafe.length)console.error('Configurações inseguras/inválidas:\n- '+[...new Set(unsafe)].join('\n- '));process.exit(1)}
console.log(mode==='pre-domain'?'Pré-domínio preenchido. O domínio/licença continuam deliberadamente fora desta etapa.':'Configurações de go-live preenchidas. Confirme /api/system/readiness e testes E2E antes de ENABLE_REAL_MONEY=true.');
