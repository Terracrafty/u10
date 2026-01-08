import { useLogin } from '~/context/LoginContext';
import type { Route } from './+types/home';
import { useEffect, useState } from 'react';
import type { userPrivate } from '~/services/UserService';
import { getUserProfilePrivate } from '~/services/UserService';
import { PostTree } from '~/components/PostTree';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Your Feed' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}

export default function Feed() {
  const {userId, token} = useLogin();
  const [userData, setUserData] = useState<userPrivate|undefined>(undefined);
  useEffect(() => {
    const effectFunc = async () => {
      setUserData(await getUserProfilePrivate(userId, token));
    }
    effectFunc();
  }, []);

  const FeedInner = ({userData} : {userData: userPrivate}) => {
    return (
      <div>
        {userData.feed.map(post => <PostTree id={post.id} />)}
      </div>
    )
  }

  return (
    <div>
      { userData ? <FeedInner userData={userData} /> : <p>Loading...</p>}
    </div>
  )
}