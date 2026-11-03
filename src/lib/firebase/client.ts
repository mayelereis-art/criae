import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
auth.languageCode = "pt";
// ignoreUndefinedProperties: campos opcionais em branco não quebram a gravação.
let banco: Firestore;
try {
  banco = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  banco = getFirestore(app); // já inicializado (recarga em desenvolvimento)
}
export const db = banco;
