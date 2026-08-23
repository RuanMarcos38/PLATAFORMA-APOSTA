# Readiness pré-domínio

Esta etapa deixa o software pronto antes do registro do domínio oficial. O domínio é uma troca de configuração, não uma mudança de código.

## Itens do selo da Home

### KYC obrigatório — implementado
- Cadastro começa em `pending_kyc`.
- Operações reais exigem `kyc_status=approved` e conta `active`.
- Callback do KYC é assinado por HMAC.
- A URL de callback é derivada do host HTTPS atual da API, então funciona em uma URL temporária e continua funcionando após a troca de domínio.

### Ledger transacional — implementado
- Saldo começa em zero.
- Créditos, reservas de aposta, liquidações e retenções de saque usam transação de banco.
- Carteira é bloqueada com `FOR UPDATE` durante alterações.
- Eventos financeiros possuem chave de idempotência única.
- Saldo posterior à transação é registrado no ledger.

### PIX por webhook — implementado
- Checkout Pro usa Preferences API.
- Webhook Mercado Pago valida `x-signature`.
- O pagamento é consultado novamente na API do Mercado Pago; o body recebido não é confiado como fonte final.
- Valor e moeda são conferidos antes do crédito.
- Eventos de webhook são idempotentes.
- Em `MERCADOPAGO_MODE=test`, pagamento aprovado vira `approved_test` e nunca credita saldo real.
- Se `PAYMENT_WEBHOOK_URL` estiver vazio, a URL é derivada automaticamente do host HTTPS atual da API. Quando o domínio oficial existir, a variável pode ser preenchida sem alterar código.

## Endpoints de verificação

- `GET /api/system/health` — processo da API.
- `GET /api/system/capabilities` — capacidades implementadas no software.
- `GET /api/system/readiness` — banco, capacidades, provedores e gate de ativação.

## Configuração pré-domínio recomendada

```env
ENABLE_REAL_MONEY=false
REQUIRE_FEDERAL_LICENSE=true
PUBLIC_DOMAIN=
PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_MODE=test
PAYMENT_WEBHOOK_URL=
```

`PAYMENT_WEBHOOK_URL` vazio significa: usar automaticamente `https://HOST-ATUAL-DA-API/api/payments/webhook/mercadopago`.

## Ativação final

Somente na etapa de go-live:
1. Definir `PUBLIC_DOMAIN` com o domínio oficial aplicável.
2. Configurar dados legais e referência de licença.
3. Trocar `MERCADOPAGO_MODE=production` somente após aprovação do provedor para a operação.
4. Configurar credenciais de produção do Mercado Pago, KYC, feed esportivo e agregador de cassino.
5. Manter `ENABLE_REAL_MONEY=false` até `GET /api/system/readiness` confirmar todos os gates externos.
6. Depois da validação E2E, habilitar `ENABLE_REAL_MONEY=true`.

## Segurança

Nenhuma chave privada deve ser gravada no GitHub. Tokens e secrets devem existir apenas no gerenciador de secrets/variáveis do ambiente de hospedagem. Credenciais que apareceram em prints ou chat devem ser rotacionadas antes de uso.
