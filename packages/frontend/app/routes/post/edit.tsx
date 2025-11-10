import { PostEditor } from "~/components/postEditor";
import type { Route } from "../+types/home";
import { useParams } from "react-router";
import { useLogin } from "~/context/LoginContext";
import type { Post } from "~/services/PostService";
import { getPost } from "~/services/PostService";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Edit Post' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}

export default function EditPost() {
  const {postId} = useParams();
  const {id} = useLogin();
  const [error, setError] = useState("")
  const [post, setPost] = useState<Post|undefined>(undefined);
  useEffect(() => {
    try {
      getPost(postId ?? "")
      .then((post) => {
        setPost(post);
      })
    } catch (e) {
      const error = e as Error;
      setError(error.message);
    }
  }, []);
  if (post) {
    if (id == post.author.id) {
      return (
        <PostEditor post={post} />
      );
    } else {
      setError("You do not own this post!");
    }
  } else {
    setError("Post not found");
  }
  window.alert(error);
  window.location.replace("/feed");
}