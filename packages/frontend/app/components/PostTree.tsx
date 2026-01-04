import { useEffect, useState } from "react";
import { Link } from "react-router"; 
import { useLogin } from "~/context/LoginContext";
import { badIsPost, getPost, getPostRoot, type Post} from "~/services/PostService";

export function PostTree({ id }: { id:string }) {

  enum subMenuEnum {
    none,
    replies,
    tags
  } 

  const {userId} = useLogin()
  const [postTree, setPostTree] = useState<Post|undefined>(undefined);
  const [activeChain, setActiveChain] = useState<Post[]>([]);
  const [submenu, setSubmenu] = useState<subMenuEnum>(subMenuEnum.none);

  useEffect(() => {
    const recursionator = (post: Post) => {
      setActiveChain([...activeChain, post])
      const next = post.replies.find((i) => badIsPost(i));
      if (next) {
        recursionator(next);
      }
    }
    const effectFunc = async () => {
      setPostTree(await getPostRoot(id));
      if (postTree) {
        recursionator(postTree);
      }
    }
    effectFunc();
  }, [id])

  function RepliesButton({ id }: { id:string }) {
    if ((submenu == subMenuEnum.replies) && (id == activeChain[activeChain.length - 1].id)) {
      return <button onClick={() => setSubmenu(subMenuEnum.none)}>Hide Replies</button>
    } else {
      return <button onClick={() => {setSubmenu(subMenuEnum.replies); TruncateActiveChain}}>Show Replies</button>
    }
  }

  function TagsButton({ id }: { id:string }) {
    if ((submenu == subMenuEnum.tags) && (id == activeChain[activeChain.length - 1].id)) {
      return <button onClick={() => setSubmenu(subMenuEnum.none)}>Hide Tags</button>
    } else {
      return <button onClick={() => {setSubmenu(subMenuEnum.tags); TruncateActiveChain}}>Show Tags</button>
    }
  }

  function TruncateActiveChain(id: string) {
    for (let i = activeChain.length - 1; i >= 0; i--) {
      if (id == activeChain[i].id) {
        break;
      }
      setActiveChain(activeChain.slice(0, i - 1));
    }
  }

  function TagsList() {
    return (
      <div>
        {activeChain[activeChain.length - 1].tags.map(tag => 
          <p>{tag.name}, </p>
        )}
      </div>
    )
  }

  

  return (
    <div>
      {activeChain.map(post => 
        <div>
          <div>
            <a href={`posts/${post.author.id}`}>
              {post.author.name}
            </a>
            <p>{post.createdAt.toString()}</p>
          </div>
          <h1>{post.title}</h1>
          <p>{post.text}</p>
          <RepliesButton id={id} />
          <TagsButton id={id} />
          <Link to={`post/${post.id}/reply`}>Reply</Link>
          { userId == post.author.id ? <Link to={`post/${post.id}/edit`}>Edit Post</Link> : null }
        </div>
      )}
    { submenu == subMenuEnum.tags ? <TagsList /> : null }
    </div>
  );
}