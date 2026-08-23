# Mercado Pago — Checkout Pro

Integração baseada no fluxo oficial do Checkout Pro via Preferences API.

## Segurança e ambientes

- `MERCADOPAGO_MODE=test`: cria preferências de homologação e nunca credita saldo real.
- `MERCADOPAGO_MODE=production`: somente pode creditar dinheiro real quando o `realMoneyGate()` estiver liberado (identidade legal, licença/domínio, KYC, pagamentos e feed esportivo configurados).
- O Access Token é segredo de backend e nunca deve ser enviado ao frontend nem commitado.
- A Public Key é usada pelo MercadoPago.js/Wallet Brick no frontend.

## Variáveis

```env
PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_MODE=test
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
PAYMENT_WEBHOOK_URL=https://seu-dominio.bet.br/api/payments/webhook/mercadopago
```

## Fluxo

1. Usuário autenticado informa o valor na Carteira.
2. `POST /api/payments/checkout-pro/deposit` cria um depósito `pending` e uma preferência no Mercado Pago.
3. O frontend recebe `preferenceId`, Public Key e URL de checkout, renderizando o Wallet Brick oficial e mantendo um link de redirecionamento como fallback.
4. Mercado Pago redireciona para `/wallet?mp=success|pending|failure`.
5. O retorno do navegador é apenas informativo; nunca libera saldo.
6. O Webhook `POST /api/payments/webhook/mercadopago` valida `x-signature`, consulta o pagamento na API e confere `external_reference`, moeda e valor.
7. Em produção, somente pagamento `approved` e com o gate regulatório liberado credita a carteira de forma idempotente.
8. Em teste, o depósito vira `approved_test` e o saldo permanece inalterado.

## Painel Mercado Pago

Em **Suas integrações > aplicação > Webhooks**, configure o evento `Payments` para a URL de webhook e copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.

Em **Testes > Credenciais de teste**, copie a Public Key e o Access Token de teste. Utilize também a conta de comprador de teste para validar o fluxo completo.

## Produção

Somente troque `MERCADOPAGO_MODE=production` e `ENABLE_REAL_MONEY=true` depois de:

- usar credenciais de produção;
- configurar domínio HTTPS oficial;
- validar Webhook de produção;
- homologar o segmento com o Mercado Pago;
- configurar os demais gates regulatórios e operacionais exigidos pelo projeto.
