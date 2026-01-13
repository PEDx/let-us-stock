/**
 * GitHub OAuth 登录入口
 * 重定向到 GitHub 授权页面
 */

import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: "GitHub OAuth not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 生成随机 state 防止 CSRF
  const state = crypto.randomUUID();

  // 从请求中获取 origin 用于回调
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  // 构建 GitHub OAuth URL
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "gist");
  authUrl.searchParams.set("state", state);

  // 设置 state cookie 用于验证
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Set-Cookie": `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    },
  });
}
