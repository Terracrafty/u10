import { register } from "~/services/User";
import type { Route } from "../+types/root";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Register' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}



export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  async function handleRegisterForm(formData:FormData) {
    try {
      const response = await register(name, email, password);
      setResult(response.id);
    }
    catch (e) {
      const error = e as Error
      setResult(error.message);
    }
  }

  <div className="p-20 max-w-1/2 mx-auto text-center">
    <form action={handleRegisterForm}>
      <input type="text" onChange={(e) => setName(e.target.value)}/>
      <input type="email" onChange={(e) => setEmail(e.target.value)}/>
      <input type="password" onChange={(e) => setPassword(e.target.value)}/>
      <button type="submit">Submit</button>
    </form>
  </div>
}