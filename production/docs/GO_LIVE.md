# Checklist de go-live

- [ ] Empresa, marca e autorização regulatória validadas.
- [ ] Domínio oficial configurado e TLS ativo.
- [ ] PostgreSQL dedicado com backup/PITR.
- [ ] Segredos armazenados em secret manager, nunca no repositório.
- [ ] KYC/AML com fluxo aprovado e callback testado.
- [ ] Gateway PIX homologado para o segmento e webhook validado.
- [ ] Feed esportivo com contrato, limites e settlement definidos.
- [ ] Agregador de cassino/jogos certificado e callback financeiro validado.
- [ ] Políticas de termos, privacidade, jogo responsável e suporte publicadas.
- [ ] Rotina de conciliação de depósitos/saques habilitada.
- [ ] Monitoramento, logs, alertas e auditoria habilitados.
- [ ] Teste E2E: cadastro → KYC → PIX → aposta → settlement → saque.
- [ ] Testes de carga e recuperação de falhas concluídos.
- [ ] `GET /api/system/readiness` retorna gate real habilitado.
