/**
 * Firebase 配置
 *
 * 请在 .env 文件中设置以下环境变量：
 * VITE_FIREBASE_API_KEY
 * VITE_FIREBASE_AUTH_DOMAIN
 * VITE_FIREBASE_PROJECT_ID
 * VITE_FIREBASE_STORAGE_BUCKET
 * VITE_FIREBASE_MESSAGING_SENDER_ID
 * VITE_FIREBASE_APP_ID
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GithubAuthProvider,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 初始化 Firebase（防止重复初始化）
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);

// GitHub 登录 provider
const githubProvider = new GithubAuthProvider();
githubProvider.addScope("gist");
githubProvider.addScope("read:user");

// Google 登录 provider
const googleProvider = new GoogleAuthProvider();

// ============================================================================
// 认证方法
// ============================================================================

/**
 * 使用 GitHub 登录
 */
export async function signInWithGithub(): Promise<User> {
  const result = await signInWithPopup(auth, githubProvider);
  const credential = GithubAuthProvider.credentialFromResult(result);

  if (!credential) {
    throw new Error("Failed to get GitHub credential");
  }

  // 获取 ID Token
  const token = await result.user.getIdToken();

  // 将 token 发送到后端
  await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  return result.user;
}

/**
 * 使用 Google 登录
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential) {
    throw new Error("Failed to get Google credential");
  }

  // 获取 ID Token
  const token = await result.user.getIdToken();

  // 将 token 发送到后端
  await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  return result.user;
}

/**
 * 退出登录
 */
export async function signOut(): Promise<void> {
  // 通知后端清除 token
  await fetch("/api/auth/firebase", { method: "DELETE" });

  await firebaseSignOut(auth);
}

/**
 * 监听认证状态变化
 */
export function onAuthChange(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * 获取 ID Token（用于后端验证）
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
