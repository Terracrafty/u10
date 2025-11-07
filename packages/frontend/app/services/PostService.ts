import axios from "axios";
import { API_URL } from "~/constants";

const axiosInstance = axios.create({ baseURL: `${API_URL}/posts` });

export type Post = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string | null;
  text: string | null;
  author: {
    id: string;
    name: string;
  };
  replyTo: {
    id: string;
  } | null;
  replies: {
    id: string;
    createdAt: Date;
    title: string | null;
    author: {
      id: string;
      name: string;
    };
  }[];
  tags: {
    name: string;
  }[];
};

export async function createPost(
  userId: string,
  token: string,
  title?: string,
  text?: string,
  replyTo?: string,
  tagString?: string
) {
  const response = await axiosInstance.post(
    "/",
    {
      userId: userId,
      title: title,
      text: text,
      replyTo: replyTo,
      tagString: tagString,
    },
    {
      headers: { Authorization: token },
    }
  );
  return response.data;
}

export async function getPost(id: string) {
  const response = await axiosInstance.get(`/${id}`);
  return response.data;
}

export async function searchPosts(
  authorName?: string,
  titleContains?: string,
  bodyContains?: string,
  includeTags?: string[],
  excludeTags?: string[],
  olderThan?: string,
  newerThan?: string
): Promise<Post[]> {
  const response = await axiosInstance.get("/search", {
    params: {
      authorName: authorName,
      titleContains: titleContains,
			bodyContains: bodyContains,
			includeTags: includeTags,
			excludeTags: excludeTags,
			olderThan: olderThan,
			newerThan: newerThan
    },
  });
	return response.data
}

export async function addTags(
  userId: string,
  token: string,
  postId: string,
  tagString: string
) {
	const response = await axiosInstance.post(`/${postId}`, {
		userId: userId,
		tagString: tagString,
	}, {
		headers: { Authorization: token }
	});
	return response.status;
}

export async function editPost(
  userId: string,
  token: string,
  postId: string,
  title?: string,
  text?: string
) {
	const response = await axiosInstance.patch(`${postId}`, {
		userId: userId,
		title: title,
		text: text,
	}, {
		headers: { Authorization: token}
	});
	return response.status;
}

export async function deletePost(
  userId: string,
  token: string,
  postId: string
) {
	const response = await axiosInstance.delete(`${postId}`, {
		data: { userId: userId },
		headers: { Authorization: token }
	});
	return response.status;
}

export async function mergeTags(
  userId: string,
  token: string,
  mergeFromName: string,
  mergeToName: string
) {
	const response = await axiosInstance.post("/mergetags", {
		userId: userId,
		mergeFromName: mergeFromName,
		mergeToName: mergeToName
	}, {
		headers: { Authorization: token}
	});
	return response.status;
}