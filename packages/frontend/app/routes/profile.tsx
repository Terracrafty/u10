import { useEffect, useState } from "react";
import type { Route } from "../+types/root";
import { type userPublic, type userPrivate, getUserProfilePrivate, getUserProfilePublic, updateUserProfile, follow, unfollow } from "~/services/UserService";
import { useLogin } from "~/context/LoginContext";
import { useParams } from "react-router";
import { PostTree } from "~/components/PostTree";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Profile' },
    { name: 'description', content: 'where is this even displayed lol' },
	];
}

export default function Profile() {
  
  const {profileId} = useParams();
  const {userId, token} = useLogin();
  const [error, setError] = useState<string|undefined>(undefined);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [userPrivate, setUserPrivate] = useState<userPrivate|undefined>(undefined);
  const [userPublic, setUserPublic] = useState<userPublic|undefined>(undefined);

  useEffect(() => {
    const effectFunc = async () => {
      try {
        setUserPrivate(await getUserProfilePrivate(userId, token));
        if (profileId != userId) {
          setUserPublic(await getUserProfilePublic(profileId as string));
          setIsOwnProfile(false);
        }
      } catch {
        setError("something broke");
      }
    }
    effectFunc();
  });

  const PrivateProfileInner = ({user} : {user : userPrivate}) => {
    
    const [editingProfile, setEditingProfile] = useState(false);

    const ProfileEditor = () => {
      const [editedText, setEditedText] = useState("");
      return (
        <div>
          <textarea onChange={(e) => setEditedText(e.target.value)}>{user.profile}</textarea>
          <button onClick={() => {updateUserProfile(userId, token, undefined, undefined, undefined, editedText); setEditingProfile(false)}}>Submit</button>
        </div>
      )
    };

    const Profile = () => {
      return (
        <div>
          <p>{user.profile}</p>
          <button onClick={() => {setEditingProfile(true)}}>Edit Profile</button>
        </div>
      ) 
    };

    return (
      <div>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
        <p>Joined on {user.createdAt.toISOString()}</p>
        {editingProfile ? <ProfileEditor /> : <Profile />}
        {user.posts.map(post => <PostTree id={post.id} />)}
      </div>
    )
  }

  const PublicProfileInner = ({user} : {user : userPublic}) => {
    return (
      <div>
        <h1>{user.name}</h1>
        { userPrivate?.following.find(i => i.id == user.id) ? <button onClick={() => {unfollow(userId, token, user.id)}}>Unfollow</button> : <button onClick={() => {follow(userId, token, user.id)}}>Follow</button>}
        <p>Joined on {user.createdAt.toISOString()}</p>
        <p>{user.profile}</p>
        {user.posts.map(post => <PostTree id={post.id} />)}
      </div>
    )
  }

  if (error) {
    return <p>{error}</p>
  } else {
    return (
      <div>
        { isOwnProfile ? <PrivateProfileInner user={userPrivate as userPrivate}/> : <PublicProfileInner user={userPublic as userPublic} />}
      </div>
    )
  }
}