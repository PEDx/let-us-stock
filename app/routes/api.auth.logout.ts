/**
 * 登出 - 清除 auth cookie
 */

export async function loader() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": "github_auth=; Path=/; HttpOnly; Max-Age=0",
    },
  });
}
