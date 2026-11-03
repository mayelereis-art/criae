# Criaê

Plataforma SaaS para criar e vender produtos digitais com IA: nicho → e-book → PDF → preço → página de vendas → divulgação → checkout → entrega.

- Arquitetura, coleções e plano de etapas: [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
- Stack: Next.js 15, React 19, TypeScript, Tailwind 4, Firebase (projeto `criae-app`)

## Rodar localmente

1. Copie `.env.example` para `.env.local` e preencha.
2. `npm install`
3. `npm run dev` → http://localhost:3000

Regras do Firestore: `firebase deploy --only firestore`
