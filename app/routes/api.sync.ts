/**
 * 数据同步 API
 * 处理前端的同步请求
 *
 * 支持两种数据类型，分别存储到不同的 Gist：
 * - groups: 股票分组数据 -> let-us-stock-groups.json
 * - book: 账簿数据 -> let-us-stock-book.json
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getAuthFromCookie } from "./api.auth.me";

// Gist 配置
const GIST_CONFIG = {
  groups: {
    filename: "let-us-stock-groups.json",
    description: "Let Us Stock - Groups Data (Do not delete)",
  },
  book: {
    filename: "let-us-stock-book.json",
    description: "Let Us Stock - Book Data (Do not delete)",
  },
} as const;

type DataType = "groups" | "book";

interface StoredData {
  version: number;
  updatedAt: string;
  data: unknown;
}

interface GistFile {
  content: string;
}

interface GistInfo {
  id: string;
  description: string;
  files: Record<string, GistFile | undefined>;
}

/**
 * 查找指定类型的 Gist
 */
async function findGist(
  accessToken: string,
  type: DataType,
): Promise<GistInfo | null> {
  const config = GIST_CONFIG[type];

  const response = await fetch("https://api.github.com/gists?per_page=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gists: ${response.status}`);
  }

  const gists: GistInfo[] = await response.json();

  return (
    gists.find(
      (g) => g.description === config.description && g.files[config.filename],
    ) || null
  );
}

/**
 * 获取 Gist 详细内容
 */
async function getGistContent(
  accessToken: string,
  gistId: string,
): Promise<GistInfo> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gist: ${response.status}`);
  }

  return response.json();
}

// GET: 从 Gist 获取数据
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = getAuthFromCookie(request);

  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 获取数据类型
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as DataType;

  if (!type || !["groups", "book"].includes(type)) {
    return Response.json({ error: "Invalid type parameter" }, { status: 400 });
  }

  const config = GIST_CONFIG[type];

  try {
    const gistInfo = await findGist(auth.accessToken, type);

    if (!gistInfo) {
      return Response.json({ data: null, gistId: null });
    }

    // 获取完整 Gist 内容
    const gist = await getGistContent(auth.accessToken, gistInfo.id);
    const file = gist.files[config.filename];

    if (!file) {
      return Response.json({ data: null, gistId: gistInfo.id });
    }

    const storedData: StoredData = JSON.parse(file.content);
    return Response.json({
      data: storedData.data,
      updatedAt: storedData.updatedAt,
      gistId: gistInfo.id,
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
    const { type, data, gistId } = body as {
      type: DataType;
      data: unknown;
      gistId?: string;
    };

    if (!type || !["groups", "book"].includes(type)) {
      return Response.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    const config = GIST_CONFIG[type];

    const storedData: StoredData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      data,
    };

    const content = JSON.stringify(storedData, null, 2);

    if (gistId) {
      // 更新已存在的 Gist
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: {
            [config.filename]: { content },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update gist: ${response.status}`);
      }

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
          description: config.description,
          public: false,
          files: {
            [config.filename]: { content },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create gist: ${response.status}`);
      }

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
