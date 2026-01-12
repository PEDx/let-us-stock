import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/search", "routes/api.search.ts"),
  route("api/quote", "routes/api.quote.ts"),
] satisfies RouteConfig;
