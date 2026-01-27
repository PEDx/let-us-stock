/**
 * 退出登录 API
 */

import type { Route } from "./+types/api.auth.logout";

export async function action({ request }: Route.ActionArgs) {
  const response = Response.json({ success: true });

  // 清除 Firebase token
  response.headers.set(
    "Set-Cookie",
    "firebase_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );

  // 清除 GitHub auth cookie（如果存在）
  response.headers.set(
    "Set-Cookie",
    "github_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );

  return response;
}
