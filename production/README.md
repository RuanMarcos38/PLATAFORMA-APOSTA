# PLATAFORMA-APOSTA — Production V3

Versão de produção construída a partir do material `plataforma-apostas-projeto-completo.zip` e da Production V2 já integrada no repositório.

## Status
O código fica pronto para receber credenciais reais sem uso de saldo DEMO. Funcionalidades externas permanecem **fail-closed**: se um provedor não estiver configurado, a API retorna `503 provider_not_configured` em vez de simular sucesso.

## Incluído
- Frontend Next.js responsivo com UX sportsbook/cassino de identidade própria, inspirada em padrões do mercado.
- Cadastro 18+, login, access token curto e refresh token rotativo em cookie HttpOnly.
- CPF armazenado somente como hash com pepper configurável.
- KYC externo com callback assinado e liberação de conta somente após aprovação.
- Carteira BRL com ledger, saldo disponível e saldo retido.
- PIX com criação via provedor e crédito apenas após webhook assinado + consulta ao pagamento.
- Webhook idempotente e proteção contra crédito duplicado.
- Solicitação de saque com retenção de saldo e fila administrativa.
- Feed esportivo, sincronização, odds server-side e revalidação no momento da aposta.
- Settlement idempotente de apostas esportivas.
- Agregador de cassino certificado por adapter; sem RNG interno usado como cassino real.
- Limites de aposta/depósito e autoexclusão aplicada no backend.
- Painel administrativo e trilha de auditoria.
- Health/readiness endpoints com status de banco, provedores e gate de dinheiro real.
- PostgreSQL, Docker Compose e CI de build.

## Gate de dinheiro real
`ENABLE_REAL_MONEY=true` sozinho **não** habilita operação. O endpoint `/api/system/readiness` só marca o gate como habilitado quando os requisitos configurados estiverem presentes.

Para o cenário federal brasileiro, mantenha `REQUIRE_FEDERAL_LICENSE=true`; assim o gate também exige identidade jurídica, referência de autorização e domínio `.bet.br`.

## Subida
```bash
cp .env.example .env
# preencher apenas quando as credenciais oficiais forem obtidas
docker compose up --build
```

## Endpoints principais
- `GET /api/system/health`
- `GET /api/system/readiness`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/kyc/status`
- `POST /api/kyc/start`
- `POST /api/payments/pix/deposit`
- `POST /api/payments/webhook/mercadopago`
- `POST /api/payments/withdrawals`
- `GET /api/sports/events`
- `POST /api/sports/bets`
- `POST /api/sports/bets/:id/settle`
- `GET /api/casino/games`
- `POST /api/casino/launch`
- `GET /api/admin/dashboard`

## Pendente somente de configuração externa
Veja `docs/CREDENTIALS_PENDING.md`.
