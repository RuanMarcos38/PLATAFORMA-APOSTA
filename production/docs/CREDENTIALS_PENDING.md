# Credenciais pendentes para ativação

O código está preparado para receber as variáveis abaixo. Nenhuma chave real deve ser commitada no GitHub.

## 1. Operador / domínio
- `LEGAL_ENTITY_NAME`
- `LEGAL_CNPJ`
- `LICENSE_REFERENCE`
- `PUBLIC_DOMAIN` (para operação federal brasileira, domínio autorizado `.bet.br`)

## 2. Banco
- `DATABASE_URL` de um PostgreSQL dedicado (Supabase, RDS etc.)

## 3. Segurança
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CPF_HASH_PEPPER`
- `INTERNAL_JOB_SECRET`

## 4. Pagamentos / PIX
- `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`, **se o provedor aprovar o modelo de negócio**; ou
- `PAYMENT_CUSTOM_BASE_URL` + `PAYMENT_CUSTOM_API_KEY` + `PAYMENT_CUSTOM_WEBHOOK_SECRET` para gateway homologado alternativo.

## 5. KYC / AML
- `KYC_PROVIDER_BASE_URL`
- `KYC_PROVIDER_API_KEY`
- `KYC_CALLBACK_SECRET`

## 6. Esportes
- `SPORTS_DATA_API_KEY`
- opcionalmente `SPORTS_DATA_BASE_URL` para provedor contratado.

## 7. Cassino certificado
- `CASINO_PROVIDER_BASE_URL`
- `CASINO_PROVIDER_API_KEY`
- `CASINO_CALLBACK_SECRET`

Depois de preencher as credenciais, validar `GET /api/system/readiness`. O go-live só deve ocorrer com `realMoney.enabled=true` e todos os testes de fluxo executados.
