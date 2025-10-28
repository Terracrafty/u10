import { json, Router, Request, Response } from "express";
import { handleHttpError, HttpError } from "../httpError";
import { prisma } from "../prisma";
import { auth, getTokenFromHeader } from "./User";
import { contains } from "validator";

const postRouter = Router();

const defaultPostSelects = {
    id: true,
    createdAt: true,
    title: true,
    text: true,
    author: { select: {
        id: true,
        name: true
    }},
    replyTo: {select: {
        id: true
    }},
    replies: {select: {
        id: true,
        createdAt: true,
        title: true,
        author: {select: {
            id: true,
            name: true
        }}
    }},
    tags: {select: {
        name: true
    }}
}

export async function findOrCreateTagsFromString(tagString:string) {
    const splitTagStrings = [...new Set(tagString.toLowerCase().split(" "))];
    const tags = splitTagStrings.map((tag) => {
        return prisma.tag.findFirst({
            where: {
                OR: [
                    { name: { equals: tag }},
                    { aliases: { has: tag }}
                ]
            },
            select: { 
                name: true,
            }
        });
    });
    const resolvedUniqueTags = [...new Set(await Promise.all(tags))].filter(i => i !== null);
    const uniqueTagNames = resolvedUniqueTags.map(i => i?.name);
    const uncreatedTagNames = splitTagStrings.filter(i => !uniqueTagNames.includes(i));
    const newTags = uncreatedTagNames.map((tag) => {
        return prisma.tag.create({
            data: { name: tag },
            select: {
                name: true,
            }
        });
    });
    return resolvedUniqueTags.concat(await Promise.all(newTags));
}

export async function createPost(userId:string, token: string, title?:string, text?:string, replyTo?:string, tagString?: string) {
    auth(userId, token);
    if (!title && !replyTo) {
        throw new HttpError(400, "Post that isn't a reply must contain content");
    }
    let tags = undefined;
    if (tagString) {
        tags = await findOrCreateTagsFromString(tagString);
    }
    const post = await prisma.post.create({
        data: {
            authorId: userId,
            title: title,
            text: text,
            replyToId: replyTo,
            tags: {
                connect: tags
            }
        }
    });
    return post.id;
}

postRouter.post("/", json(), async (req:Request, res:Response) => {
    try {
        const {userId, title, text, replyTo} = req.body
        const token = getTokenFromHeader(req);
        const postId = await createPost(userId, token, title, text, replyTo);
        res.status(201).json({ postId: postId }).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function getPost(id:string) {
    const post = await prisma.post.findUniqueOrThrow({
        where: { id: id },
        select: defaultPostSelects
    });
    return post;
}

postRouter.get("/:id", async (req:Request, res:Response) => {
    try {
        const post = getPost(req.params.id);
        res.status(200).json(post).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function addTags(userId:string, token:string, postId:string, tagString:string) {
    auth(userId, token);
    const tags = await findOrCreateTagsFromString(tagString);
    await prisma.post.update({
        where: { id: postId },
        data: {
            tags: {
                connect: tags
            }
        }
    })
}