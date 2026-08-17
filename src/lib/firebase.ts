import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA2eE9vAKTeqDmXvMqv13K5sTjq77uj1h8",
  authDomain: "lovenest-d7f81.firebaseapp.com",
  projectId: "lovenest-d7f81",
  storageBucket: "lovenest-d7f81.firebasestorage.app",
  messagingSenderId: "724651748498",
  appId: "1:724651748498:web:c3872157317c3461274a4b",
};

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  if (!("serviceWorker" in navigator)) return null;
  if (!("PushManager" in window)) return null;
  if (!("indexedDB" in window)) return null;
  try {
    return getMessaging(firebaseApp);
  } catch {
    return null;
  }
}

export { getToken, onMessage, deleteToken };
