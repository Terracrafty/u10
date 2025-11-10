import { useState } from "react";
import { useLogin } from "~/context/LoginContext";
import { addTags, createPost, editPost, type Post } from "~/services/PostService";
import { CustomButton } from "./buttons";

export function PostEditor({ replyTo, post }: { replyTo?: string, post?: Post }) {
  const {id, token} = useLogin();
  const [error, setError] = useState("")
  const [title, setTitle] = useState(post?.title ?? "");
  const [text, setText] = useState(post?.text ?? "");
  const [newTags, setNewTags] = useState("");

  async function handlePostSubmit() {
    try {
      if (post) {
        await editPost(id, token, post.id, title, text);
        await addTags(id, token, post.id, newTags);
      } else {
        await createPost(id, token, title, text, replyTo, newTags);
      }
      window.location.replace("/feed");
    } catch (e) {
      const error = e as Error 
      setError(error.message);
    }
  }
  
  return (
    <form action={handlePostSubmit}>
      <p>Title:</p>
      <input type="text" value={post?.title ?? ""} onChange={e => setTitle(e.target.value)} />
      <p>Body:</p>
      <textarea onChange={e => setText(e.target.value)}>
        {post?.text ?? ""}
      </textarea>
      <p>Add Tags:</p>
      <input type="text" onChange={e => setNewTags(e.target.value)} />
      <CustomButton type="submit" text="Submit" />
      <p>{error}</p>
    </form>
  );
}