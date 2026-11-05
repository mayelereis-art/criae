# Criaê

Plataforma SaaS para criar e vender produtos digitais com IA: nicho → e-book → PDF → preço → página de vendas → divulgação → checkout → entrega.

- Arquitetura, coleções e plano de etapas: [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
- Stack: Next.js 15, React 19, TypeScript, Tailwind 4, Firebase (projeto `criae-app`)

## Rodar localmente

1. Copie `.env.example` para `.env.local` e preencha.
2. `npm install`
3. `npm run dev` → http://localhost:3000

Regras do Firestore: `firebase deploy --only firestore`

## Testes

`npm test` roda as regras de negócio (preço, créditos, bloqueio, avisos de pagamento). Localmente, o que usa o banco pelo servidor, como a IA e o checkout, não funciona sem credencial do Google: esses fluxos são testados no site publicado.

## Publicar

Um push na branch main publica o site. Regras do banco: `firebase deploy --only firestore,storage --project criae-app`.

## Antes de vender

Siga [docs/LANCAMENTO.md](docs/LANCAMENTO.md).
