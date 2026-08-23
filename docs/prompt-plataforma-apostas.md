# PROMPT MESTRE — Plataforma de Apostas Online Multiusuário (Frontend + Backend)

> Cole este arquivo inteiro como prompt no ChatGPT (ou em outra IA de codificação). Ele descreve o sistema completo para que a IA gere a arquitetura, o código e a documentação.

---

## ⚠️ AVISO LEGAL (leia antes de implementar em produção)

Este projeto é uma **especificação técnica**. Operar uma plataforma de apostas real exige:

- **Licença/autorização regulatória** no país e estado/UF onde vai operar (no Brasil: autorização da SPA/Ministério da Fazenda para apostas de quota fixa, Lei 14.790/2023; nos EUA: licença estado a estado).
- **Verificação de idade e identidade (KYC)** e prevenção à lavagem de dinheiro (AML).
- Mercados sobre **eleições/política** e **religião** são proibidos ou fortemente restritos em várias jurisdições (ex.: CFTC nos EUA restringe "event contracts" políticos). Avalie remover essas categorias ou tratá-las apenas como **mercados de opinião sem dinheiro real (play money)** até obter parecer jurídico.
- Consulte um advogado especializado em iGaming antes de lançar com dinheiro real.

O prompt abaixo já inclui os módulos de compliance como requisito de arquitetura, não como sugestão opcional.

---

## 1. CONTEXTO E OBJETIVO

Aja como um arquiteto de software sênior full-stack especializado em plataformas de apostas/iGaming (referência: estrutura de casas como DraftKings, FanDuel, Kalshi/Polymarket para mercados de eventos, e Bet365 para esportivo). Preciso que você projete e gere o código de uma plataforma completa chamada **[NOME_DA_PLATAFORMA]**, com as seguintes verticais de apostas:

1. **Apostas esportivas** (placar, resultado, handicap, over/under, ao vivo).
2. **Jogos de cassino / "fortune"** (slots, roleta, crash game, etc. — mecânica de RNG).
3. **Mercados de eventos / previsão** (política, economia, entretenimento) — modelo de "prediction market" (compra/venda de posições Sim/Não com preço variando por oferta e demanda), e não aposta de banca fixa, para reduzir risco regulatório.
4. **Debates e disputas entre usuários** (apostas peer-to-peer: um usuário cria uma disputa, outros apostam contra ele, a plataforma cobra taxa de intermediação).
5. **Religião** — trate como subcategoria de "mercados de opinião/entretenimento" sem conotação ofensiva, com moderação de conteúdo sensível.

O sistema deve suportar **múltiplos usuários simultâneos**, cadastro/login, carteira digital interna, e painel administrativo.

---

## 2. REQUISITOS FUNCIONAIS

### 2.1 Usuários e Autenticação
- Cadastro com e-mail/telefone + senha, e login social (Google/Apple).
- Verificação de e-mail e SMS (OTP).
- **KYC obrigatório** antes de saque: upload de documento + selfie, validação de maioridade (18+).
- Autenticação com JWT (access + refresh token) e 2FA opcional (TOTP).
- Perfis: `usuario_comum`, `usuario_verificado`, `moderador`, `admin`, `suporte`.
- Recuperação de senha, bloqueio de conta, log de sessões/dispositivos.

### 2.2 Carteira e Pagamentos
- Carteira interna (saldo em BRL/USD/crypto opcional).
- Depósito via PIX, cartão de crédito, boleto, ou gateway (Stripe/Mercado Pago/PagSeguro).
- Saque com validação KYC e limite diário/antifraude.
- Extrato de transações (depósito, aposta, ganho, saque, taxa).
- Sistema de "hold" de saldo enquanto a aposta está em aberto.
- Cálculo automático de odds e payout.

### 2.3 Módulo de Apostas Esportivas
- Catálogo de eventos (integração com API de dados esportivos, ex. odds-api, Sportradar).
- Mercados: vencedor, placar exato, handicap asiático, over/under, apostas ao vivo (live betting) com atualização via WebSocket.
- Motor de cálculo de odds (fixed-odds) com margem da casa configurável.
- Liquidação automática de apostas ao final do evento (settlement engine).

### 2.4 Módulo Cassino ("Fortune")
- Jogos com RNG certificável (usar biblioteca de RNG criptográfico, nunca `Math.random()` puro).
- Histórico auditável de cada rodada (seed público + hash, "provably fair").
- RTP (return to player) configurável por jogo, exibido ao usuário.

### 2.5 Módulo de Mercados de Eventos (Política/Religião/Outros)
- Modelo de "order book" ou AMM (automated market maker) para posições Sim/Não.
- Preço da posição = probabilidade implícita (0 a 100%).
- Resolução do mercado por fonte oficial + período de contestação (dispute window) antes de liquidar.
- Moderação de conteúdo: fila de aprovação manual para mercados sensíveis antes de publicar.

### 2.6 Módulo de Disputas Peer-to-Peer (Debates)
- Usuário cria uma "disputa" com título, regras, valor mínimo, prazo e critério de resolução.
- Outros usuários entram apostando "a favor" ou "contra".
- Árbitro (moderador humano ou oráculo externo) decide o resultado ao final.
- Taxa de intermediação (rake) configurável, ex. 3–5% sobre o valor total apostado.

### 2.7 Responsible Gambling (obrigatório)
- Limites de depósito diário/semanal definidos pelo usuário.
- Autoexclusão temporária ou permanente.
- Alertas de tempo de sessão e valor apostado.
- Link para suporte a jogo responsável.

### 2.8 Painel Administrativo
- Dashboard de métricas (GGR, NGR, usuários ativos, volume por vertical).
- Gestão de eventos, odds e mercados.
- Aprovação/moderação de mercados sensíveis (política/religião).
- Gestão de KYC (aprovar/rejeitar documentos).
- Logs de auditoria e detecção de fraude/apostas suspeitas.

---

## 3. ARQUITETURA TÉCNICA SUGERIDA

### 3.1 Frontend
- **Framework:** React (Next.js) ou Vue (Nuxt), com TypeScript.
- **Estado:** Zustand ou Redux Toolkit.
- **Estilo:** Tailwind CSS + componentes reutilizáveis (odds card, bet slip, wallet widget).
- **Tempo real:** WebSocket (Socket.io) para odds ao vivo, atualização de mercados e chat de disputas.
- **Bet slip:** carrinho de apostas persistente com cálculo de payout em tempo real.

### 3.2 Backend
- **Linguagem/Framework:** Node.js (NestJS) ou Python (FastAPI/Django) — escolha uma e seja consistente.
- **Arquitetura:** microsserviços ou monólito modular, separando:
  - `auth-service` (usuários, JWT, KYC)
  - `wallet-service` (saldo, transações, idempotência)
  - `sports-service` (eventos, odds, settlement)
  - `casino-service` (RNG, rodadas, RTP)
  - `market-service` (mercados de eventos, order book/AMM)
  - `dispute-service` (apostas peer-to-peer)
  - `notification-service` (e-mail, push, SMS)
  - `admin-service` (painel administrativo)
- **Comunicação interna:** REST + fila de mensagens (RabbitMQ/Kafka) para eventos assíncronos (settlement, notificações).
- **Cache:** Redis (odds em tempo real, sessões, rate limiting).

### 3.3 Banco de Dados
- **Relacional (PostgreSQL):** usuários, transações, apostas, eventos, mercados — tudo que exige consistência forte (ACID).
- **Documentos (MongoDB, opcional):** logs de auditoria, histórico de rodadas de cassino.
- **Modelagem mínima de tabelas:**
  - `users`, `kyc_documents`, `wallets`, `transactions`
  - `sports_events`, `sports_markets`, `sports_bets`
  - `casino_games`, `casino_rounds`
  - `event_markets`, `event_positions`
  - `disputes`, `dispute_bets`
  - `admin_logs`, `audit_trail`

### 3.4 Infraestrutura
- Containerização com Docker + orquestração via Kubernetes.
- CI/CD (GitHub Actions).
- Observabilidade: Prometheus + Grafana, logs centralizados (ELK/Loki).
- Ambiente de staging separado de produção para testes de settlement.

### 3.5 Segurança
- Rate limiting e proteção antifraude (device fingerprinting, detecção de múltiplas contas).
- Criptografia de dados sensíveis em repouso (AES-256) e em trânsito (TLS 1.3).
- Idempotência em todas as transações financeiras (evitar débito/crédito duplicado).
- Testes de carga no motor de settlement (picos em eventos ao vivo).

---

## 4. ENTREGÁVEIS QUE VOCÊ (IA) DEVE GERAR

Peça para a IA produzir, nesta ordem:

1. Diagrama de arquitetura (texto ou Mermaid) mostrando os serviços e o fluxo de dados.
2. Schema completo do banco de dados (DDL em SQL).
3. Estrutura de pastas do backend (monorepo ou multi-repo).
4. Endpoints da API REST (ou GraphQL) documentados, por serviço.
5. Componentes principais do frontend (lista de telas: onboarding, KYC, home, evento/mercado, bet slip, carteira, disputa, painel admin).
6. Exemplo de código do motor de cálculo de odds e do motor de settlement.
7. Exemplo de fluxo de "provably fair" para o módulo cassino.
8. Checklist de compliance (KYC/AML, responsible gambling, licenciamento) mapeado para o país-alvo.

---

## 5. INSTRUÇÃO FINAL PARA A IA

Ao responder, comece pelo diagrama de arquitetura e pelo schema do banco de dados. Depois avance serviço por serviço, mostrando código real (não pseudocódigo) em TypeScript (NestJS) para o backend e React/Next.js para o frontend. Assuma que o time de desenvolvimento é experiente e quer código pronto para adaptar, não apenas explicações teóricas. Sinalize claramente, em comentários, onde é necessário plugar um provedor de KYC, gateway de pagamento e API de dados esportivos reais.
