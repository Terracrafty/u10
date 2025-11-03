import axios from "axios"
import type {LoginResponse} from "../../../../types";
import { API_URL } from "../constants";

const axiosInstance = axios.create({baseURL: `${API_URL}/users`});

export async function register(name:string, email:string, password:string):Promise<LoginResponse> {
  const response = await axiosInstance.post("/", {
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
  const response = await axiosInstance.post("/login", {
    email: email,
    password: password,
  });
  if (response.status != 200) {
    throw new Error(response.data.error);
  }
  return response.data;
}