/**
 * Firebase 认证 API
 *
 * 处理 Firebase ID Token 的验证和存储
 */

import { verifyIdToken } from "~/lib/firebase/admin.server";

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

    // 验证 Firebase ID Token
    try {
      const decodedToken = await verifyIdToken(token);

      const response = Response.json({ success: true, uid: decodedToken.uid });

      // 设置 httpOnly cookie
      response.headers.set(
        "Set-Cookie",
        `firebase_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      );

      return response;
    } catch (verifyError) {
      console.error("Firebase token verification failed:", verifyError);
      return Response.json(
        { error: "Invalid token", details: "Failed to verify Firebase token" },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error("Failed to save Firebase token:", error);
    return Response.json({ error: "Failed to save token" }, { status: 500 });
  }
}
