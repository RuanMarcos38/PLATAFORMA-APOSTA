# PLATAFORMA-APOSTA — Production

Base de produção da plataforma. O software é **fail-closed**: ausência de licença, domínio ou credenciais obrigatórias nunca é convertida em saldo, aposta ou jogo real simulado.

## Estado do software

- Frontend Next.js responsivo para sportsbook, cassino, cassino ao vivo, carteira, KYC, conta, jogo responsável e administração.
- Cadastro 18+, access token curto, refresh rotativo HttpOnly e bloqueio de renovação para contas suspensas/banidas.
- CPF armazenado como hash com pepper.
- KYC obrigatório para operação real, callback assinado e ativação somente após aprovação.
- Carteira BRL com ledger transacional, saldo disponível/retido, `FOR UPDATE` e idempotência.
- Mercado Pago Checkout Pro com Preferences API, Wallet Brick, `back_urls`, webhook `x-signature`, consulta server-to-server, validação de valor/moeda e isolamento de testes.
- PIX direto disponível somente no ambiente real liberado; Checkout Pro pode oferecer PIX conforme a aplicação do Mercado Pago.
- Saques com retenção de saldo, fila operacional, auditoria e mutações financeiras restritas a `admin`.
- Feed esportivo, odds revalidadas no servidor, idempotência de aposta e settlement.
- Cassino via agregador externo; sem RNG interno usado como cassino real.
- Limites de aposta/depósito, autoexclusão e limite de tempo de sessão aplicados no backend para sportsbook/cassino.
- `/api/system/capabilities`, `/health` e `/readiness` para separar software implementado de ativação externa.
- PostgreSQL com schema idempotente aplicado antes da inicialização da API.
- Docker Compose sem senha padrão, containers da aplicação em usuário não-root, healthchecks e restart policy.
- CI com audit de dependências, build API/web, validação do Compose e build das imagens Docker.

## Pré-domínio

O domínio oficial pode ficar para a última etapa. Enquanto `PUBLIC_DOMAIN` e `PAYMENT_WEBHOOK_URL` estiverem vazios:

- KYC deriva o callback do host HTTPS atual da API.
- Mercado Pago deriva o webhook do host HTTPS atual da API.
- `ENABLE_REAL_MONEY=false` mantém qualquer operação real bloqueada.

Veja `docs/PRE_DOMAIN_READINESS.md`.

## Subida

```bash
cp .env.example .env
node scripts/generate-secrets.mjs
# salve o output somente no gerenciador de secrets/variáveis do ambiente
node scripts/check-credentials.mjs pre-domain
docker compose up --build -d
```

Depois da subida:

```text
GET /api/system/health
GET /api/system/capabilities
GET /api/system/readiness
```

Para promover uma conta já cadastrada a administrador no container da API:

```bash
ADMIN_EMAIL=seu-email npm run admin:promote
```

## Go-live

O domínio/licença e as credenciais de produção são ativação externa. Antes de dinheiro real:

```bash
node scripts/check-credentials.mjs go-live
```

O `/api/system/readiness` precisa confirmar os gates aplicáveis antes de `ENABLE_REAL_MONEY=true`.

## Segurança

Nunca grave `.env`, tokens ou secrets no GitHub. Credenciais que tenham aparecido em print, chat, log ou gravação de tela devem ser rotacionadas antes do uso.
