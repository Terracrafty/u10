import { useEffect, useState } from "react";
import type { Route } from "../+types/root";
import { type userPublic, type userPrivate, getUserProfilePrivate, getUserProfilePublic, updateUserProfile } from "~/services/UserService";
import { useLogin } from "~/context/LoginContext";
import { useParams } from "react-router";

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
  const [userPrivate, setUserPrivate] = useState<userPrivate|undefined>(undefined);
  const [userPublic, setUserPublic] = useState<userPublic|undefined>(undefined);

  useEffect(() => {
    const effectFunc = async () => {
      try {
        if (profileId == userId) {
        setUserPrivate(await getUserProfilePrivate(userId, token));
        } else {
          setUserPublic(await getUserProfilePublic(profileId as string));
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
        <p>Joined on {user.createdAt.toISOString()}</p>
        {editingProfile ? <ProfileEditor /> : <Profile />}
        
      </div>
    )
  }
}