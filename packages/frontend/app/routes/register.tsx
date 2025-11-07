import { register } from "~/services/UserService";
import type { Route } from "../+types/root";
import { useState } from "react";
import { CustomButton } from "~/components/buttons";
import { useLogin } from "~/context/LoginContext";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Register' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}

export default function Register() {
  const {setId, setToken} = useLogin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleRegisterForm() {
    try {
      const response = await register(name, email, password);
      setId(response.id);
      setToken(response.token);
      window.location.replace("/feed")
    }
    catch (e) {
      const error = e as Error
      setError(error.message);
    }
  }

  return (
    <div className="p-20 max-w-1/2 min-w-fit mx-auto text-center">
      <form className="w-100 mx-auto" action={handleRegisterForm}>
        <p>Username:</p>
        <input className="bg-white text-black w-full my-2 rounded-md" type="text" onChange={(e) => setName(e.target.value)}/>
        <p>Email:</p>
        <input className="bg-white text-black w-full my-2 rounded-md" type="email" onChange={(e) => setEmail(e.target.value)}/>
        <p>Password:</p>
        <input className="bg-white text-black w-full my-2 rounded-md" type="password" onChange={(e) => setPassword(e.target.value)}/>
        <CustomButton type="submit" text="Submit"/>
        <p>{error}</p>
      </form>
    </div>
  );
}