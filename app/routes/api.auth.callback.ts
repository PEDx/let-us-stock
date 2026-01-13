/**
 * GitHub OAuth 回调处理
 * 交换 code 获取 access_token
 */

import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // 从 cookie 中获取 state 验证
  const cookies = request.headers.get("Cookie") || "";
  const storedState = cookies
    .split(";")
    .find((c) => c.trim().startsWith("oauth_state="))
    ?.split("=")[1];

  // 验证 state
  if (!state || state !== storedState) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?error=invalid_state",
      },
    });
  }

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?error=no_code",
      },
    });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?error=not_configured",
      },
    });
  }

  try {
    // 交换 code 获取 access_token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/?error=${tokenData.error}`,
        },
      });
    }

    const accessToken = tokenData.access_token;

    // 获取用户信息
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const userData = await userResponse.json();

    // 构建用户数据 JSON
    const authData = JSON.stringify({
      accessToken,
      user: {
        id: userData.id,
        login: userData.login,
        avatar_url: userData.avatar_url,
        name: userData.name,
      },
    });

    // 设置 auth cookie 并重定向
    // 使用 base64 编码存储在 cookie 中
    const encodedAuth = Buffer.from(authData).toString("base64");

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?login=success",
        "Set-Cookie": [
          `github_auth=${encodedAuth}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          `oauth_state=; Path=/; HttpOnly; Max-Age=0`,
        ].join(", "),
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?error=token_exchange_failed",
      },
    });
  }
}
