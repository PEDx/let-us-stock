import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Pages
  index("routes/home.tsx"),
  route("assets", "routes/assets.tsx"),
  route("records", "routes/records.tsx"),
  // API routes
  route("api/search", "routes/api.search.ts"),
  route("api/quote", "routes/api.quote.ts"),
  route("api/stock-detail", "routes/api.stock-detail.ts"),
  route("api/chart", "routes/api.chart.ts"),
  // Auth routes
  route("api/auth/github", "routes/api.auth.github.ts"),
  route("api/auth/callback", "routes/api.auth.callback.ts"),
  route("api/auth/logout", "routes/api.auth.logout.ts"),
  route("api/auth/me", "routes/api.auth.me.ts"),
  // Sync routes
  route("api/sync", "routes/api.sync.ts"),
] satisfies RouteConfig;
