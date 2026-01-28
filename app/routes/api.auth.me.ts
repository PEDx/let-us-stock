/**
 * 获取当前登录用户信息
 * 支持 GitHub OAuth 和 Firebase 两种认证方式
 */

import type { LoaderFunctionArgs } from "react-router";
import { verifyIdToken } from "~/lib/firebase/admin.server";

export interface AuthUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface AuthData {
  accessToken: string;
  user: AuthUser;
}

export function getAuthFromCookie(request: Request): AuthData | null {
  const cookies = request.headers.get("Cookie") || "";
  const authCookie = cookies
    .split(";")
    .find((c) => c.trim().startsWith("github_auth="))
    ?.split("=")[1];

  if (!authCookie) return null;

  try {
    const decoded = Buffer.from(authCookie, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  // 检查 Firebase token
  const cookies = request.headers.get("Cookie") || "";
  const firebaseToken = cookies
    .split(";")
    .find((c) => c.trim().startsWith("firebase_token="))
    ?.split("=")[1];

  if (firebaseToken) {
    try {
      // 验证 Firebase token 并获取用户信息
      const decodedToken = await verifyIdToken(firebaseToken);

      return Response.json({
        user: {
          id: decodedToken.uid,
          login: decodedToken.email || "Firebase User",
          avatar_url: decodedToken.photoURL || "",
          name: decodedToken.displayName,
        },
      });
    } catch (error) {
      console.error("Failed to verify Firebase token:", error);
      // Token 无效，清除 cookie
      const response = Response.json({ user: null });
      response.headers.set(
        "Set-Cookie",
        "firebase_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      );
      return response;
    }
  }

  // 回退到 GitHub OAuth
  const auth = getAuthFromCookie(request);

  if (!auth) {
    return Response.json({ user: null });
  }

  // 返回用户信息（不返回 token）
  return Response.json({ user: auth.user });
}
