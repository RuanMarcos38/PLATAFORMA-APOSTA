# Gates regulatórios implementados

O sistema separa **código pronto** de **autorização para operar**.

- `ENABLE_REAL_MONEY`: intenção técnica de ligar dinheiro real.
- `REQUIRE_FEDERAL_LICENSE`: quando `true`, exige `LICENSE_REFERENCE` e `PUBLIC_DOMAIN` terminado em `.bet.br` para o gate de produção.
- `ENABLE_EVENT_MARKETS=false`: mantém mercados de eventos fora do modo real por padrão.
- `ENABLE_P2P_REAL_MONEY=false`: mantém P2P financeiro fora do modo real por padrão.
- KYC aprovado e conta `active` são exigidos antes de depósitos/apostas/cassino.
- Autoexclusão e limites são aplicados no backend.

Esses controles não substituem parecer jurídico, certificação ou autorização do regulador.
