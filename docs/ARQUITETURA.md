# Criaê — Arquitetura (Etapa 1: Auditoria e planejamento)

> Plataforma SaaS que leva a pessoa da ideia ao produto digital vendido:
> IDEIA → NICHO → PLANEJAMENTO → CRIAÇÃO → DIAGRAMAÇÃO → PREÇO → PÁGINA → CRIATIVOS → DIVULGAÇÃO → CHECKOUT → ENTREGA → ANÁLISE.

## 1. Auditoria do ponto de partida

| Item | Situação em 03/11/2026 |
|---|---|
| Código existente | Nenhum. Projeto criado do zero em `C:\Users\mayel\CRIAE` |
| Ambiente | Node 24.15, npm 11.12, Firebase CLI 15.15, Git 2.53 |
| Stack escolhida | Next.js 15.5 (App Router) · React 19.1 · TypeScript · Tailwind CSS 4 |
| Backend | Firebase Auth · Cloud Firestore · Firebase Storage · App Hosting · Cloud Functions 2ª geração |
| IA de texto | Claude (API Anthropic), só no servidor |
| IA de imagem | OpenAI gpt-image, só no servidor |
| Pagamentos | Mercado Pago (Pix + cartão + webhook assinado) |
| Referência visual | Telas da VendeIA: só a direção visual (dark navy + azul elétrico). Nome, logo e textos são próprios |

## 2. Decisões de arquitetura

### 2.1 Camadas (pastas em `src/`)

```
src/
  app/                 Rotas (UI). (painel)/ = área logada, (publico)/ = páginas de venda e download
  components/          Componentes de interface reutilizáveis (sem regra de negócio)
  config/              Navegação, nichos, planos padrão, custos de crédito
  lib/
    firebase/          Clientes Firebase (client.ts no navegador, admin.ts só servidor)
    ia/                Camada de IA: prompts, chamadas Claude/OpenAI, revisão, custo em créditos
    documentos/        Motor de diagramação e PDF
    pagamentos/        Interface Gateway + adaptador Mercado Pago (outros gateways depois)
    dominio/           Regras de negócio puras (preço, créditos, status de produto, cupons)
    validacao/         Schemas zod compartilhados entre formulário e API
functions/             Cloud Functions: jobs longos (e-book, imagens, PDF) e webhooks
firestore.rules        Isolamento por dono
storage.rules          Arquivos privados; download só por link assinado
```

Regra: componentes nunca chamam IA ou gateway direto. Tudo passa por rota de API / Server Action, que valida (zod), confere sessão, debita créditos e registra log.

### 2.2 Segurança e credenciais

- Chaves `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` ficam no **Secret Manager** (App Hosting / Functions). Nada com prefixo `NEXT_PUBLIC_` além da config pública do Firebase.
- Sessão: Firebase Auth no cliente → cookie de sessão (`session cookie` do Admin SDK) validado no `middleware.ts` para proteger `/(painel)`.
- Todo documento tem `donoId`. Regras do Firestore negam leitura/escrita quando `donoId != request.auth.uid`. Campos sensíveis (créditos, status de assinatura, pedidos pagos) **só o servidor escreve**.
- Papel `admin` via custom claim (não via campo editável pelo usuário).

### 2.3 Jobs assíncronos (e-book, imagens, PDF)

> **Hoje (Etapa 4, parte 1):** a redação é orquestrada pelo navegador, um capítulo por chamada a `/api/ia/capitulo`. Cada capítulo é salvo no Firestore assim que fica pronto, então dá para pausar, fechar e continuar de onde parou. A versão abaixo, em segundo plano com Cloud Functions, depende do plano Blaze.

Gerar um e-book inteiro passa de vários minutos, então não roda dentro de uma requisição HTTP.

1. A API cria `jobs/{id}` com `{tipo, produtoId, etapa, progresso, status: "aguardando"}`.
2. Uma Cloud Function (gatilho `onDocumentCreated`, timeout até 60 min) processa **capítulo a capítulo**, salvando cada capítulo assim que fica pronto.
3. A tela escuta o job em tempo real (status: aguardando → gerando conteúdo → gerando imagens → diagramando → revisando → concluído | erro).
4. Se cair no meio, o job retoma do último capítulo salvo (`retomarDe`). Botão "Tentar novamente" reabre só o que falhou.

### 2.4 IA de texto (Claude)

- Modelo: `claude-opus-5-5` em todas as operações (constante `MODELO` em `src/lib/ia/claude.ts`), com esforço ajustado por tarefa: `low` para preencher campos, `medium` para pesquisa de nicho e revisão, `high` para planejamento e redação.
- Fallback automático no servidor (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`): se o classificador de segurança recusar por engano, a própria API refaz o pedido em outro modelo.
- Saídas estruturadas (JSON validado por zod) para nichos, oportunidades, planejamento, preço, página e criativos.
- **Revisão em duas passadas**: após redigir, um segundo prompt confere contradições, repetições, gramática, trechos incompletos e continuidade entre capítulos, e devolve correções aplicadas + relatório.
- Temas sensíveis (saúde, finanças, jurídico): prompt de redação inclui limites explícitos, aviso no PDF e proibição de inventar estatística, pesquisa ou referência. Quando não houver fonte verificável, o texto diz isso em vez de inventar.
- Inteligência de mercado: sem ferramenta de pesquisa externa ligada, a tela informa que as oportunidades são **hipóteses da IA**, sem números de demanda. Pesquisa web real fica como integração opcional.

### 2.5 IA de imagem (OpenAI gpt-image)

- Capa, abertura de capítulo, ilustrações e criativos (1080×1080, 1080×1350, 1080×1920).
- O prompt de cada imagem nasce do conteúdo do capítulo + identidade visual do produto (paleta, estilo).
- Texto nas capas e criativos é **sobreposto pelo nosso motor** (HTML/SVG → PNG), não desenhado pela IA. Isso garante zero erro de ortografia e fonte da marca. A IA gera só a arte de fundo/ilustração.
- Cada imagem é um documento em `imagens/` e pode ser regenerada sozinha.

### 2.6 Motor de PDF

- `@react-pdf/renderer` no servidor (rota `/api/pdf`), sem navegador headless: texto selecionável, fontes embutidas (pacotes `@fontsource`, licença OFL), sumário com links internos, cabeçalho, rodapé e numeração.
- Duas passadas: a 1ª descobre a página real de cada seção; a 2ª escreve o sumário com esses números.
- Títulos com `minPresenceAhead` (nunca ficam sozinhos no pé da página); quadros e listas não se partem.
- Estrutura: capa → apresentação → direitos e avisos (inclui aviso de tema sensível e de uso de IA) → sumário → introdução → capítulos (com imagem de abertura) → conclusão → página final.
- Verificação antes de liberar (`src/lib/documentos/verificacao.ts`): capítulos sem texto ou com marcador a preencher bloqueiam (o PDF sai como RASCUNHO); capítulo curto, citação de estudo/porcentagem, final cortado, falta de imagens e bônus não criados geram aviso. Depois de diagramar, confere se toda seção do sumário caiu numa página.
- Armadilhas do react-pdf já resolvidas no código: altura de linha herdada explode em elementos `fixed` (fica só nos estilos do corpo); texto dinâmico não reserva espaço; imagens só JPEG/PNG (as geradas são JPEG).
- Introdução e conclusão hoje são montadas a partir do planejamento aprovado; bônus ainda não são gerados e não entram no PDF.

### 2.7 Pagamentos (Mercado Pago) e entrega

**Quem recebe o dinheiro das vendas:** cada criador conecta a própria conta Mercado Pago (OAuth do MP). O dinheiro cai direto na conta dele; a Criaê não custodia valores de terceiros (evita virar subadquirente). A assinatura da plataforma é cobrada na conta Mercado Pago da Criaê.

Fluxo de venda:
1. Comprador clica em "Comprar" → API cria `pedidos/{id}` (status `pendente`) e uma preferência/pagamento Pix no MP com `external_reference = pedidoId`.
2. MP chama `/api/webhooks/mercadopago`. Validamos a assinatura `x-signature` (HMAC com o segredo) e **consultamos o pagamento na API do MP** antes de acreditar no status.
3. Aprovado → pedido `pago`, registra `pagamentos/`, gera link de download, envia e-mail.
4. Página de "obrigado" só mostra o que o pedido já tem no banco. Voltar para ela **não** aprova nada.

Proteção do arquivo:
- PDF em Storage privado. Download por URL assinada de curta duração gerada a cada clique.
- Limite de downloads por pedido e marca d'água com e-mail do comprador no rodapé.
- Reembolso / chargeback via webhook → revoga o acesso.

`lib/pagamentos/gateway.ts` define a interface (`criarCobranca`, `consultarPagamento`, `validarWebhook`, `reembolsar`); `mercadopago.ts` implementa. Outro gateway = outro adaptador.

### 2.8 Assinatura e créditos

- Planos em `planos/` (editáveis pelo admin): Mensal R$ 49,90 · Pro R$ 89,90 · Premium R$ 149,90, cada um com créditos/mês e limites.
- Toda operação de IA chama `debitarCreditos(usuario, operacao)` numa **transação** do Firestore antes de executar; falhou a IA → estorna.
- Custos iniciais (configuráveis em `configuracoes/creditos`): texto curto 1 · planejamento 5 · capítulo 8 · regenerar capítulo 8 · imagem 4 · e-book completo = soma dos capítulos · pacote de criativos 15.
- Inadimplência: webhook de assinatura → `assinaturas.status = "inadimplente"` → painel bloqueia criação, mantém leitura e vendas já publicadas.

## 3. Coleções do Firestore

| Coleção | Chave / dono | Conteúdo principal |
|---|---|---|
| `usuarios` | uid | nome, email, papel, aceite de termos/LGPD (data, versão) |
| `assinaturas` | uid | planoId, status, renovaEm, gatewayAssinaturaId |
| `planos` | — (admin) | nome, preço, créditos/mês, limites, ativo |
| `creditos` | uid | saldo, renovadoEm |
| `consumo_ia` | donoId | operação, créditos, modelo, tokens, produtoId, data |
| `nichos` | — | lista padrão + `personalizados` por dono |
| `oportunidades` | donoId | nome, público, problema, transformação, formato, justificativa, preço sugerido |
| `produtos` | donoId | título, configuração, status (rascunho/em_edicao/publicado), identidade visual, preço, versão |
| `capitulos` | produtoId + donoId | ordem, título, objetivo, conteúdo, revisão |
| `imagens` | produtoId + donoId | tipo (capa/capítulo/criativo), prompt, url, formato |
| `arquivos` | produtoId + donoId | PDF, versão, tamanho, páginas, verificação |
| `paginas_vendas` | produtoId + donoId | slug único, modelo, seções, cores, SEO, publicada |
| `criativos` | produtoId + donoId | plataforma, formato, imagem, texto, legenda, CTA |
| `campanhas` | donoId | calendário de publicações |
| `pedidos` | vendedorId | produtoId, comprador, valor, cupom, status, canal (utm) |
| `pagamentos` | pedidoId | id no gateway, método, status, payload validado |
| `cupons` | donoId | código, tipo, valor, validade, usos |
| `jobs` | donoId | tipo, etapa, progresso, status, erro, retomarDe |
| `configuracoes` | — (admin) | custos de crédito, textos legais, flags |
| `logs` | — (servidor) | operação, uid, resultado, data |
| `metricas` | produtoId | visualizações, cliques no checkout, por dia e canal |

## 4. Plano de execução

| Etapa | Entrega | Status |
|---|---|---|
| 1 | Auditoria e arquitetura (este documento) | ✅ |
| 2 | Identidade visual, layout, navegação, telas e componentes | ✅ |
| 3 | Projeto Firebase `criae-app` (Firestore em southamerica-east1), login/cadastro, sessão, regras, termos e privacidade, produtos no Firestore | ✅ (falta ativar o Authentication no console) |
| 4 | IA parte 1: pesquisa de nicho, oportunidades salvas, IA preenche configuração, planejamento editável, redação capítulo a capítulo com revisão, leitura e edição | ✅ (falta a chave `ANTHROPIC_API_KEY`) |
| 4 | IA parte 2: identidade visual (10 estilos), imagens com prompt do Claude + gpt-image, PDF com verificação, pré-visualização e versões | ✅ (faltam `OPENAI_API_KEY` e o Firebase Storage/Blaze) |
| 5 | Parte 1: precificação com IA, cupons, order bump e upsell (configuração), páginas de venda com 3 modelos, SEO e URL própria | ✅ |
| 5 | Parte 2: publicar o site, checkout Mercado Pago, webhook, entrega, vendas | ⏳ |
| 6 | Criativos, legendas, roteiros, calendário, ZIP | ⏳ |
| 7 | Planos, créditos, consumo, painel admin | ⏳ |
| 8 | Testes funcionais, segurança, responsivo, documentação final | ⏳ |

## 5. O que depende de você (credenciais externas)

| Integração | O que falta | Quando |
|---|---|---|
| Firebase | Criar projeto `criae` e ativar plano **Blaze** (App Hosting e Functions exigem) | Etapa 3 |
| Anthropic | Chave da API em console.anthropic.com | Etapa 4 |
| OpenAI | Chave da API com acesso a gpt-image | Etapa 4 |
| Mercado Pago | Conta da Criaê + aplicação no painel de desenvolvedores (credenciais de teste e produção, segredo do webhook, OAuth para criadores) | Etapa 5 |
| E-mail transacional | Provedor (ex.: Resend) + domínio verificado | Etapa 5 |
| Domínio | Domínio próprio para as URLs `/p/nome-do-produto` | Etapa 5 |
| Jurídico | Revisão dos Termos de Uso e Política de Privacidade (a plataforma traz um modelo, não substitui advogado) | Etapa 8 |

## 6. Sessão (como o login funciona)

- O navegador faz login no Firebase Auth. A cada emissão/renovação do ID token (≈ 1 h), `ProvedorAuth` envia o token para `POST /api/sessao`, que o **verifica** e grava no cookie httpOnly `__session`.
- `middleware.ts` barra rotas do painel sem cookie. `(painel)/layout.tsx` verifica o token no servidor (`firebase-admin`, só com projectId: não precisa de chave de conta de serviço).
- Cookie expirado → login → o Firebase restaura a sessão sozinho e o usuário volta para a página em que estava (`?volta=`, só caminhos internos).
- Dados do usuário são lidos/escritos pelo SDK do cliente, protegidos por `firestore.rules`. Deploy das regras: `firebase deploy --only firestore,storage`.

## 7. Página de vendas

- O id do documento em `paginas_vendas` é o próprio endereço (`/p/{slug}`), o que garante URL única.
- A página pública é renderizada no servidor e lê o Firestore pela API REST (`src/lib/paginas-publicas.ts`), sem login: as regras só liberam páginas publicadas. Erro real não vira 404.
- `checkoutAtivo` só o servidor grava. Sem ele, a página mostra "Vendas ainda não abertas" no lugar do botão.
- Copy com regras proibindo depoimentos e números inventados, falsa urgência e promessa de resultado. Bônus só entram quando existirem.
- Order bump, upsell e cupons estão configuráveis, mas só têm efeito quando o checkout existir (parte 2). Visualizações e cliques também dependem dela.
