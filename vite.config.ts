import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  optimizeDeps: { include: ["@base-ui/react"] },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  build: {
    // 将静态资源目录改为 '_static' 或其他名字
    // 这样就不会和你的 /assets 路由冲突了
    assetsDir: 'static',
  },
});
