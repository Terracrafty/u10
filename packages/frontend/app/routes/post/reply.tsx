import { PostEditor } from "~/components/PostEditor";
import type { Route } from "../+types/home";
import { useParams } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Reply to post' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}

export default function NewPost() {
  const {postId} = useParams();
  return <PostEditor replyTo={postId} />
}