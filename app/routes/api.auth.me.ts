/**
 * 获取当前登录用户信息
 */

import type { LoaderFunctionArgs } from "react-router";

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
  const auth = getAuthFromCookie(request);

  if (!auth) {
    return Response.json({ user: null });
  }

  // 返回用户信息（不返回 token）
  return Response.json({ user: auth.user });
}
