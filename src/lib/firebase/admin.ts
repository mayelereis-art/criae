import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Em produção (App Hosting) as credenciais vêm do ambiente. Localmente não há conta de serviço:
// só verificar ID token funciona (usa as chaves públicas do Google); Firestore/Storage do servidor, não.
const app =
  getApps()[0] ??
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

export const authAdmin = getAuth(app);
export const dbAdmin = () => getFirestore(app);
export const bucketAdmin = () => getStorage(app).bucket();
