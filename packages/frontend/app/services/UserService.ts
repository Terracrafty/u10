import axios from "axios"
import type {LoginResponse} from "../../../../types";
import { API_URL } from "../constants";
import type { Post } from "./PostService";

const axiosInstance = axios.create({baseURL: `${API_URL}/users`});

export async function register(name:string, email:string, password:string):Promise<LoginResponse> {
  await axiosInstance.post("/", {
    name: name,
    email: email,
    password: password
  });
  return await login(email, password);
}

export async function login(email:string, password:string):Promise<LoginResponse> {
  const response = await axiosInstance.post("/login", {
    email: email,
    password: password,
  });
  return response.data;
}

export type userPublic = {
  createdAt: Date;
  name: string;
  isBanned: boolean;
  profile: string | null;
  followedBy: {
      id: string;
      name: string;
  }[];
  posts: Post[];
}

export type userPrivate = {
  createdAt: Date,
  name: string,
  email: string,
  isAdmin: boolean,
  isBanned: boolean,
  profile?: string,
  blockedUsers: {
      id: true,
      name: true,
  }[],
  followedBy: {
      id: true,
      name: true,
  }[],
  following: {
      id: true,
      name: true,
  }[],
  followedTags: string[],
  blockedTags: string[],
  feed: Post[],
  posts: Post[],
}

export async function getUserProfilePublic(userId:string): Promise<userPublic> {
  const response = await axiosInstance.get(`/${userId}`);
  return response.data;
}

export async function getUserProfilePrivate(userId:string, token:string): Promise<userPrivate> {
  const response = await axiosInstance.post(`/${userId}`, null, {
    headers: {Authorization: token}
  });
  return response.data;
}

export async function searchUser(nameContains:string): Promise<userPublic[]> {
  const response = await axiosInstance.get("/search", {params: {nameContains:nameContains}});
  return response.data;
}

export async function updateUserProfile(userId:string, token:string, name?:string, email?:string, password?:string, profile?:string) {
  const response = await axiosInstance.patch(`${userId}`, {
    name:name,
    email:email,
    password:password,
    profile:profile
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function follow(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/follow`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function unfollow(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/unfollow`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function block(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/block`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function unblock(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/unblock`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function nuclearBlock(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/nukeblock`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function deleteUser(userId:string, token:string) {
  const response = await axiosInstance.delete(`${userId}`, {
    headers: {Authorization: token}
  });
  return response;
}

export async function banUser(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/ban`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}

export async function unbanUser(userId:string, token:string, targetId:string) {
  const response = await axiosInstance.post(`${userId}/unban`, {
    targetId:targetId
  }, {
    headers: {Authorization: token}
  });
  return response.status;
}