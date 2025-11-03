import { login } from "~/services/User";
import type { Route } from "../+types/root";
import { useState } from "react";
import { CustomButton } from "~/components/buttons";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Login' },
    { name: 'description', content: 'where is this even displayed lol' },
	];
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  async function handleLoginForm() {
    try {
      const response = await login(email, password);
      setResult(response.id);
    }
    catch (e) {
      const error = e as Error
      setResult(error.message);
    }
  }

  return (
    <div className="p-20 max-w-1/2 min-w-fit mx-auto text-center">
      <form className="w-100 mx-auto" action={handleLoginForm}>
        <p>Email:</p>
        <input className="bg-white w-full my-2 rounded-md" type="email" onChange={(e) => setEmail(e.target.value)}/>
        <p>Password:</p>
        <input className="bg-white w-full my-2 rounded-md" type="password" onChange={(e) => setPassword(e.target.value)}/>
        <CustomButton type="submit" text="Submit"/>
      </form>
    </div>
  );
}