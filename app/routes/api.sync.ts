/**
 * 数据同步 API
 * 处理前端的同步请求
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getAuthFromCookie } from "./api.auth.me";

const GIST_FILENAME = "let-us-stock-data.json";
const GIST_DESCRIPTION = "Let Us Stock - Data Storage (Do not delete)";

interface StoredData {
  version: number;
  updatedAt: string;
  data: unknown;
}

// GET: 从 Gist 获取数据
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = getAuthFromCookie(request);

  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // 查找 Gist
    const gistsResponse = await fetch(
      "https://api.github.com/gists?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    const gists = await gistsResponse.json();
    const existingGist = gists.find(
      (g: { description: string; files: Record<string, unknown> }) =>
        g.description === GIST_DESCRIPTION && g.files[GIST_FILENAME],
    );

    if (!existingGist) {
      return Response.json({ data: null, gistId: null });
    }

    // 获取 Gist 内容
    const gistResponse = await fetch(
      `https://api.github.com/gists/${existingGist.id}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    const gist = await gistResponse.json();
    const file = gist.files[GIST_FILENAME];

    if (!file) {
      return Response.json({ data: null, gistId: existingGist.id });
    }

    const storedData: StoredData = JSON.parse(file.content);
    return Response.json({
      data: storedData.data,
      updatedAt: storedData.updatedAt,
      gistId: existingGist.id,
    });
  } catch (error) {
    console.error("Sync fetch error:", error);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST: 保存数据到 Gist
export async function action({ request }: ActionFunctionArgs) {
  const auth = getAuthFromCookie(request);

  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { data, gistId } = body;

    const storedData: StoredData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      data,
    };

    const content = JSON.stringify(storedData, null, 2);

    if (gistId) {
      // 更新已存在的 Gist
      await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: { content },
          },
        }),
      });

      return Response.json({
        success: true,
        gistId,
        updatedAt: storedData.updatedAt,
      });
    } else {
      // 创建新 Gist
      const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          public: false,
          files: {
            [GIST_FILENAME]: { content },
          },
        }),
      });

      const newGist = await response.json();
      return Response.json({
        success: true,
        gistId: newGist.id,
        updatedAt: storedData.updatedAt,
      });
    }
  } catch (error) {
    console.error("Sync save error:", error);
    return Response.json({ error: "Failed to save data" }, { status: 500 });
  }
}
