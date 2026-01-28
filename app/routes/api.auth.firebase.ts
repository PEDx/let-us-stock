/**
 * Firebase 认证 API
 *
 * 处理 Firebase ID Token 的验证和存储
 */

/**
 * POST - 保存 Firebase Token
 * DELETE - 清除 Firebase Token
 */
export async function action({
  request,
}: {
  request: Request;
}): Promise<Response> {
  if (request.method === "DELETE") {
    const response = Response.json({ success: true });
    response.headers.set(
      "Set-Cookie",
      "firebase_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
    return response;
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400 });
    }

    // TODO: 在这里验证 token 并获取用户信息
    // 需要使用 firebase-admin SDK:
    // import { initializeApp, getApps, cert } from 'firebase-admin/app';
    // import { getAuth } from 'firebase-admin/auth';
    // const auth = getAuth();
    // const decodedToken = await auth.verifyIdToken(token);

    // 暂时将 token 存储在 cookie 中（用于服务端验证）
    const response = Response.json({ success: true });

    // 设置 cookie（实际项目中应该使用 httpOnly cookie）
    response.headers.set(
      "Set-Cookie",
      `firebase_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
    );

    return response;
  } catch (error) {
    console.error("Failed to save Firebase token:", error);
    return Response.json({ error: "Failed to save token" }, { status: 500 });
  }
}
