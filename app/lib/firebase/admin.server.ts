/**
 * Firebase Admin SDK 配置
 *
 * 用于服务端验证 Firebase ID Token 和管理用户
 *
 * 安装依赖:
 * pnpm add firebase-admin
 *
 * 配置环境变量:
 * FIREBASE_PROJECT_ID
 * FIREBASE_PRIVATE_KEY (从 Firebase Console -> Project Settings -> Service Accounts 获取)
 * FIREBASE_CLIENT_EMAIL
 */

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

/**
 * 初始化 Firebase Admin
 */
export function getFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // 检查必要的环境变量
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const privateKey = import.meta.env.VITE_FIREBASE_PRIVATE_KEY;
  const clientEmail = import.meta.env.VITE_FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      "Firebase Admin environment variables not configured. " +
        "Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL",
    );
  }

  try {
    // 将私钥中的 \n 转换为实际换行符
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

    adminApp = initializeApp({
      credential: cert({
        projectId,
        privateKey: formattedPrivateKey,
        clientEmail,
      }),
    });

    return adminApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}

/**
 * 获取 Firebase Auth 实例
 */
export function getFirebaseAuth(): Auth {
  if (adminAuth) {
    return adminAuth;
  }

  const app = getFirebaseAdmin();
  adminAuth = getAuth(app);
  return adminAuth;
}

/**
 * 验证 Firebase ID Token
 */
export async function verifyIdToken(token: string): Promise<{
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
}> {
  const auth = getFirebaseAuth();
  const decodedToken = await auth.verifyIdToken(token);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    emailVerified: decodedToken.email_verified ?? false,
    displayName: decodedToken.name ?? null,
    photoURL: decodedToken.picture ?? null,
  };
}
