# Lista para o lançamento

O sistema está em modo de teste. Nada abaixo é feito automaticamente.

## 1. Pagamentos

- [ ] Gravar a chave de produção: `firebase apphosting:secrets:set MP_ACCESS_TOKEN --project criae-app`
- [ ] Em `apphosting.yaml`, trocar `MP_OAUTH_TESTE` para `"false"`.
- [ ] No painel do Mercado Pago, modo de produção: URL `https://SEU_DOMINIO/api/webhooks/mercadopago?chave=CHAVE_NOVA`, com os eventos de pagamentos e de planos e assinaturas.
- [ ] Gerar `MP_WEBHOOK_CHAVE` nova: a atual apareceu nos registros de uma sessão de desenvolvimento.
- [ ] Redefinir a assinatura secreta no painel e gravar `MP_WEBHOOK_SECRET`: a atual também apareceu nesses registros.
- [ ] Reconectar as contas de vendedor, porque os tokens atuais são de teste.
- [ ] Teste real, com o cartão de outra pessoa: comprar o Mensal, comprar o Vitalício, vender um e-book, reembolsar cada um.
- [ ] Conferir se o aviso automático de planos chega (nos testes, a ativação veio da conferência direta).
- [ ] Testar uma recusa de cartão na renovação, ou acompanhar a primeira renovação real.

## 2. Kiwify e Hotmart

- [ ] Vender de verdade ou usar o teste de cada plataforma, e conferir valor, comprador e produto em Minhas vendas. A Kiwify não publica o corpo completo do aviso.
- [ ] Conferir os caminhos de menu descritos em Integrações.

## 3. E-mail e domínio

- [ ] Registrar o domínio e apontar para o App Hosting. Atualizar `NEXT_PUBLIC_URL_SITE` e a URL de retorno OAuth no Mercado Pago.
- [ ] Verificar o domínio no Resend e definir `EMAIL_REMETENTE`. Sem isso, o e-mail só chega ao dono da conta do Resend.

## 4. Contas e custos

- [x] Conta da dona criada (09/11/2026) e única em `ADMIN_UIDS`.
- [ ] Ativar recarga automática na Anthropic e na OpenAI.
- [ ] Comparar o custo do painel com as faturas e calibrar os créditos em Administração > Custos.
- [ ] Rever os créditos do Vitalício antes da primeira venda: é difícil mudar depois.
- [x] Conferência diária de assinaturas: Cloud Scheduler `criae-conferencia-assinaturas` chama `/api/cron/assinaturas` com token OIDC da conta `criae-agendador`.

## 5. Jurídico

- [ ] Trocar `EMAIL_CONTATO` em `src/config/legal.ts`.
- [ ] Advogado: termos, privacidade (LGPD), significado de "vitalício", reembolso e responsabilidade pelo conteúdo gerado por IA.
- [x] Exclusão de conta testada em 09/11/2026 com conta descartável: nenhum documento nem arquivo restante. Isolamento entre contas conferido pela dona.

## 6. Limpeza

- [ ] Apagar a conta de teste e os dados dela (produtos Unhas, Prato Possível e Barba, pedidos e assinaturas de teste).
- [ ] Rever as dependências (`npm audit`). Em 05/11/2026 não havia correção compatível: as sugeridas rebaixam o Firebase ou trocam o Next de versão principal.
