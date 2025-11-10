import { PostEditor } from "~/components/postEditor";
import type { Route } from "../+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New Post' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}

export default function NewPost() {
  <PostEditor />
}