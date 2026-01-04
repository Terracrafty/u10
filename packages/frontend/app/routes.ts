import { type RouteConfig, index, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("feed", "routes/feed.tsx"),
  ...prefix("post", [
    route("new", "routes/post/new.tsx"),
    route(":postId", "", [
      route("edit", "routes/post/edit.tsx"),
      route("reply", "routes/post/reply.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
