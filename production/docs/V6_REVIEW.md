# V6 — Revisão completa de produto

## Frontend
- Nova identidade visual com Barlow/Barlow Condensed, superfícies mais neutras e hierarquia editorial.
- Cards do cassino com imagens reais e catálogo visual consistente.
- Home, Cassino, Ao Vivo, Sportsbook, Carteira, Login, Cadastro, Conta, KYC, Jogo Responsável, Promoções e Admin revisados.
- Cliente HTTP com renovação de access token via refresh cookie HttpOnly.
- Sportsbook normaliza o contrato de mercados e envia idempotencyKey por aposta.

## Backend
- Cadastro passa a criar sessão segura e retornar access token.
- Catálogo do cassino tem fallback real quando o agregador ainda não está configurado e muda para o feed do provedor após ativação.
- Launch do cassino é bloqueado por readiness, KYC e credenciais reais.
- Feed esportivo possui sincronização de odds e sincronização de resultados para liquidação automática de mercados h2h e totals.
- Apostas reais são bloqueadas enquanto o gate de produção não estiver habilitado.

## Ativação externa ainda obrigatória
O software não substitui requisitos externos. Go-live com dinheiro real depende de dados legais/licença aplicável, domínio oficial, banco/infra de produção e credenciais/contratos de pagamento, KYC, feed esportivo e agregador de cassino. Adaptações pequenas podem ser necessárias se o contrato de API do provedor escolhido diferir do adapter genérico.
