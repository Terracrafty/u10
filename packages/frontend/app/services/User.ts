import axios from "axios"
import type {LoginResponse} from "../../../../types";

const axiosInstance = axios.create({baseURL: `${process.env.API_URL}/users`});

export async function register(name:string, email:string, password:string):Promise<LoginResponse> {
  const response = await axios.post("/", {
    name: name,
    email: email,
    password: password
  });
  if (response.status != 201) {
    throw new Error(response.data.error);
  }
  return await login(name, email);
}

export async function login(email:string, password:string):Promise<LoginResponse> {
  const response = await axios.post("/login", {
    email: email,
    password: password,
  });
  if (response.status != 200) {
    throw new Error(response.data.error);
  }
  return response.data;
}