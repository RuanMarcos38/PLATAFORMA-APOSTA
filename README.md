# PLATAFORMA-APOSTA

Código-fonte da **Plataforma Apostas Sandbox**, ambiente multiusuário demonstrativo para esportes, mercados Sim/Não, Fortune Dice, disputas P2P, carteira DEMO e jogo responsável.

## Ambiente publicado

https://plataforma-apostas-sandbox-l9pyl5.v2.appdeploy.ai/

## Escopo atual

- Login multiusuário
- Carteira DEMO isolada por usuário
- Apostas esportivas demonstrativas
- Prediction markets Sim/Não
- Fortune Dice com RNG criptográfico e prova auditável
- Disputas peer-to-peer
- Extrato de operações
- Limites pessoais e autoexclusão
- Realtime por WebSocket
- Painel operacional
- Testes de fluxos principais

## Segurança e compliance

Esta versão é um **sandbox sem dinheiro real**. PIX, depósitos, saques, KYC externo e settlement esportivo oficial permanecem desativados até integração com provedores homologados e atendimento aos requisitos regulatórios aplicáveis.

## Estrutura

- `src/` — frontend React/Vite/TypeScript
- `backend/` — APIs, carteira DEMO, mercados, cassino, P2P e realtime
- `tests/` — cenários end-to-end
- `docs/` — prompt mestre e documentação do escopo
- `appdeploy.auth-login.json` — configuração de autenticação

## Ambiente técnico

O snapshot publicado utiliza os SDKs `@appdeploy/client` e `@appdeploy/sdk`, injetados pelo ambiente AppDeploy. Para execução fora desse ambiente, essas integrações precisam ser substituídas/adaptadas para o provedor de autenticação, banco, API e WebSocket escolhido.

Snapshot de origem: `1787498529645`.
