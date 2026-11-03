import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Só o projectId: verificar ID token usa as chaves públicas do Google, sem conta de serviço.
// Em produção (App Hosting) as credenciais vêm do ambiente para Firestore/Storage do servidor.
const app = getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

export const authAdmin = getAuth(app);
