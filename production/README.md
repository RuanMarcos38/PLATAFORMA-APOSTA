# PLATAFORMA-APOSTA — Production V2

Base de produção derivada do material `plataforma-apostas-projeto-completo.zip` e reorganizada para operação real com provedores externos.

## O que esta versão resolve
- Frontend Next.js responsivo com UX de sportsbook/cassino inspirada em padrões do mercado brasileiro.
- Backend Node.js/Express/TypeScript com PostgreSQL, autenticação, KYC, carteira ledger, PIX, apostas esportivas, settlement e admin.
- Saldo real só é creditado depois de confirmação do gateway por webhook + consulta ao provedor.
- Saques são pedidos transacionais com KYC obrigatório e fila de revisão/provedor.
- Odds são armazenadas no servidor e revalidadas no momento da aposta.
- Settlement idempotente, usando locks no banco.
- Limites de depósito/aposta, autoexclusão e bloqueios regulatórios.
- Logs de auditoria e eventos de segurança.

## Importante
Esta pasta não contém chaves reais nem uma licença regulatória. Sem as credenciais oficiais do operador (pagamento, KYC, dados esportivos e infraestrutura), o backend inicia em modo production-safe, porém bloqueia operações que dependem do provedor ausente com HTTP 503. Não há crédito fictício.

Para operação nacional no Brasil, use apenas a empresa/marca/domínio devidamente autorizados e configure `BRAND_NAME`, `LEGAL_ENTITY_NAME`, `LEGAL_CNPJ`, `LICENSE_REFERENCE` e `PUBLIC_DOMAIN` com os dados reais.

## Estrutura
- `api/`: backend REST
- `web/`: frontend Next.js
- `docker-compose.yml`: PostgreSQL + Redis + API + Web para infraestrutura própria
- `.env.example`: todas as variáveis necessárias

## Subida local
```bash
cp .env.example .env
docker compose up --build
```

## Checklist de go-live
1. Licença/autorização e domínio legal do operador.
2. Banco PostgreSQL exclusivo de produção.
3. `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` fortes.
4. Gateway PIX habilitado para gambling e webhook cadastrado.
5. KYC/AML habilitado e callback cadastrado.
6. Feed esportivo contratado e job de sincronização ativo.
7. Provedor de jogos/cassino certificado; não usar RNG interno para catálogo real sem certificação aplicável.
8. Política de privacidade, termos, jogo responsável e suporte publicados.
9. Teste ponta a ponta: cadastro → KYC → PIX → aposta → settlement → saque.
