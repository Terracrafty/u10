import e, { json, Router, Request, Response } from "express";
import { handleHttpError, HttpError } from "../httpError";
import { prisma } from "../prisma";
import { auth, checkIfUserBanned, getTokenFromHeader } from "./User";
import moment, { Moment } from "moment";
import { contains } from "validator";

const postRouter = Router();

export const defaultPostSelects = {
    id: true,
    createdAt: true,
    updatedAt: true,
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

export async function checkPostOwnership(userId:string, postId:string, allowAdminOverride:boolean = false) {
    const post = await prisma.post.findUniqueOrThrow({
        where: {id: postId}
    });
    if (post.authorId != userId) {
        if (allowAdminOverride) {
            const user = await prisma.user.findUniqueOrThrow({
                where: {id: userId}
            });
            if (!user.isAdmin) {
                throw new HttpError(403, "Not authorized");
            }
        }
        else {
            throw new HttpError(403, "Not authorized");
        }
    }
}

export async function pushPostToFeeds(postId:string) {
    const post = await prisma.post.findUniqueOrThrow({ 
        where: { id:postId },
        select: {
            author: { select: { followedBy: { select: { id: true }}}},
            tags: { select: { followedBy: { select: {id: true}}}},
        }
    });
    const userIds = post.author.followedBy;
    post.tags.forEach(tag => {
        userIds.push(...tag.followedBy);
    });
    const uniqueUserIds = [...new Set(userIds)];
    prisma.post.update({
        where: {id: postId},
        data: {
            feeds: {
                connect: uniqueUserIds
            }
        }
    });
}

export async function createPost(userId:string, token: string, title?:string, text?:string, replyTo?:string, tagString?: string) {
    auth(userId, token);
    if (await checkIfUserBanned(userId)) {
        throw new HttpError(403, "Banned users may not create posts");
    }
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
    pushPostToFeeds(post.id);
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

postRouter.get("/:postid", async (req:Request, res:Response) => {
    try {
        const post = getPost(req.params.postid);
        res.status(200).json(post).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function searchPosts(authorName?: string, titleContains:string = "", bodyContains:string = "", includeTags: string[] = [], excludeTags: string[] = [], olderThan: string = "now", newerThan: string = "1970-01-01") {
    const result = await prisma.post.findMany({
        where: {
            AND: [
                {author: {is: {name: authorName}}},
                {title: {contains: titleContains}},
                {text: {contains: bodyContains}},
                {tags: {every: {name: {in: includeTags}}}},
                {tags: {none: {name: {in: excludeTags}}}},
                {createdAt: {lt: olderThan}},
                {createdAt: {gt: newerThan}}
            ]
        },
        select: defaultPostSelects
    });
    return result;
}

postRouter.get("/search", json(), async (req:Request, res:Response) => {
    try {
        const {authorName, titleContains, bodyContains, includeTags, excludeTags, olderThan, newerThan} = req.body;
        const result = await searchPosts(authorName, titleContains, bodyContains, includeTags, excludeTags, olderThan, newerThan);
        res.status(200).json(result).end()
    } catch {
        handleHttpError(e, res);
    }
})

export async function addTags(userId:string, token:string, postId:string, tagString:string) {
    auth(userId, token);
    if (await checkIfUserBanned(userId)) {
        throw new HttpError(403, "Banned users may not add tags");
    }
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

postRouter.post("/:postid/tags", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const {userId, tagString} = req.body;
        await addTags(userId, token, req.params.postid, tagString);
        res.status(200).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function editPost(userId:string, token:string, postId:string, title?:string, text?:string) {
    auth(userId, token);
    if (await checkIfUserBanned(userId)) {
        throw new HttpError(403, "Banned users may not edit posts");
    }
    checkPostOwnership(userId, postId);
    await prisma.post.update({
        where: { id: postId },
        data: {
            title: title,
            text: text
        }
    });
}

postRouter.patch("/:postid", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const {userId, title, text} = req.body;
        await editPost(userId, token, req.params.postid, title, text);
        res.status(200).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function deletePost(userId:string, token:string, postId:string) {
    auth(userId, token);
    checkPostOwnership(userId, postId, true);
    await prisma.post.delete({
        where: {id: postId}
    });
}

postRouter.delete("/:postid", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        await deletePost(req.body.userId, token, req.params.postid)
        res.status(204).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export async function mergeTags(userId:string, token:string, mergeFromName:string, mergeToName:string) {
    auth(userId, token, true);
    const mergeTo = await prisma.tag.findUniqueOrThrow({where: {name: mergeToName}});
    const mergeFrom = await prisma.tag.findUniqueOrThrow({where: {name: mergeFromName}});
    const aliases = mergeTo.aliases;
    aliases.push(mergeFrom.name);
    aliases.push(...mergeFrom.aliases);
    await prisma.$transaction([
        prisma.tag.update({
            where: {name: mergeToName},
            data: {aliases: aliases}
        }),
        prisma.tag.delete({where: {name: mergeFromName}})
    ]);
}

postRouter.post("/mergetags", json(), async (req:Request, res:Response) => {
    try {
        const token = getTokenFromHeader(req);
        const {userId, mergeFromName, mergeToName} = req.body;
        await mergeTags(userId, token, mergeFromName, mergeToName);
        res.status(200).end();
    } catch (e) {
        handleHttpError(e, res);
    }
});

export {postRouter};