const required=['DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','CPF_HASH_PEPPER','INTERNAL_JOB_SECRET','LEGAL_ENTITY_NAME','LEGAL_CNPJ','LICENSE_REFERENCE','PUBLIC_DOMAIN','KYC_PROVIDER_BASE_URL','KYC_PROVIDER_API_KEY','KYC_CALLBACK_SECRET','SPORTS_DATA_API_KEY','CASINO_PROVIDER_BASE_URL','CASINO_PROVIDER_API_KEY','CASINO_CALLBACK_SECRET'];
const payment=process.env.PAYMENT_PROVIDER==='mercadopago'?['MERCADOPAGO_ACCESS_TOKEN','MERCADOPAGO_WEBHOOK_SECRET']:['PAYMENT_CUSTOM_BASE_URL','PAYMENT_CUSTOM_API_KEY','PAYMENT_CUSTOM_WEBHOOK_SECRET'];
const missing=[...required,...payment].filter(k=>!process.env[k]);
if(missing.length){console.error('Credenciais/configurações pendentes:\n- '+missing.join('\n- '));process.exit(1)}
console.log('Configurações obrigatórias preenchidas. Execute /api/system/readiness antes do go-live.');
