# Lista para o lançamento

O sistema está em modo de teste. Nada abaixo é feito automaticamente.

## 1. Pagamentos

- [x] Gravar a chave de produção: `firebase apphosting:secrets:set MP_ACCESS_TOKEN --project criae-app`
- [x] Em `apphosting.yaml`, trocar `MP_OAUTH_TESTE` para `"false"`.
- [x] No painel do Mercado Pago, modo de produção: URL `https://SEU_DOMINIO/api/webhooks/mercadopago?chave=CHAVE_NOVA`, com os eventos de pagamentos e de planos e assinaturas.
- [x] Gerar `MP_WEBHOOK_CHAVE` nova: a atual apareceu nos registros de uma sessão de desenvolvimento.
- [x] Redefinir a assinatura secreta no painel e gravar `MP_WEBHOOK_SECRET`: a atual também apareceu nesses registros.
- [x] Venda de e-book pelo Mercado Pago encerrada em 16/11/2026: e-books vendem só pela Kiwify ou Hotmart do criador. O Mercado Pago fica para a assinatura do Criaê. Para reativar, `MERCADO_PAGO_VENDE_EBOOK` em `src/lib/promocao.ts` (exige domínio e e-mail de entrega).
- [ ] Teste real, com o cartão de outra pessoa: comprar o Mensal e o Vitalício e reembolsar cada um.
- [ ] Conferir se o aviso automático de planos chega (nos testes, a ativação veio da conferência direta).
- [ ] Testar uma recusa de cartão na renovação, ou acompanhar a primeira renovação real.

## 2. Kiwify e Hotmart

- [ ] Vender de verdade ou usar o teste de cada plataforma, e conferir valor, comprador e produto em Minhas vendas. A Kiwify não publica o corpo completo do aviso.
- [ ] Conferir os caminhos de menu descritos em Integrações.

## 3. E-mail e domínio

- [x] Domínio criaeapp.com.br (Hostinger) no App Hosting com certificado; `NEXT_PUBLIC_URL_SITE` atualizado em 17/11/2026. O endereço antigo continua no ar.
- [x] Domínio criaeapp.com.br no Resend (São Paulo), registros DKIM e envio na Hostinger em 17/11/2026; `EMAIL_REMETENTE` = nao-responda@criaeapp.com.br, respostas para o contato. Hoje o Resend só seria usado na venda de e-book pelo Mercado Pago, que está desligada.

## 4. Contas e custos

- [x] Conta da dona criada (09/11/2026) e única em `ADMIN_UIDS`.
- [ ] Ativar recarga automática na Anthropic e na OpenAI.
- [ ] Comparar o custo do painel com as faturas e calibrar os créditos em Administração > Custos.
- [ ] Rever os créditos do Vitalício antes da primeira venda: é difícil mudar depois.
- [x] Conferência diária de assinaturas: Cloud Scheduler `criae-conferencia-assinaturas` chama `/api/cron/assinaturas` com token OIDC da conta `criae-agendador`.

## 5. Jurídico

- [x] `EMAIL_CONTATO` = contato@criaeapp.com.br (caixa na Hostinger), 17/11/2026.
- [ ] Advogado: termos, privacidade (LGPD), significado de "vitalício", reembolso e responsabilidade pelo conteúdo gerado por IA.
- [x] Exclusão de conta testada em 09/11/2026 com conta descartável: nenhum documento nem arquivo restante. Isolamento entre contas conferido pela dona.

## 6. Limpeza

- [ ] Apagar a conta de teste e os dados dela (produtos Unhas, Prato Possível e Barba, pedidos e assinaturas de teste).
- [ ] Rever as dependências (`npm audit`). Em 05/11/2026 não havia correção compatível: as sugeridas rebaixam o Firebase ou trocam o Next de versão principal.
