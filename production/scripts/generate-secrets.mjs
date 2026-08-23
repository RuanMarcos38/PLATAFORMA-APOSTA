import{randomBytes}from'node:crypto';
const secret=(bytes=48)=>randomBytes(bytes).toString('base64url');
console.log('# Gere uma vez e salve SOMENTE no gerenciador de secrets do ambiente. Não faça commit deste output.');
console.log(`POSTGRES_PASSWORD=${secret(36)}`);
console.log(`JWT_ACCESS_SECRET=${secret(64)}`);
console.log(`JWT_REFRESH_SECRET=${secret(64)}`);
console.log(`CPF_HASH_PEPPER=${secret(48)}`);
console.log(`INTERNAL_JOB_SECRET=${secret(48)}`);
